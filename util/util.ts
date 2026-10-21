/********************************************************************************
 * Copyright (c) 2024 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/

import Ajv, { ValidateFunction } from "ajv";
import { ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type ThingStartResponse = {
    process?: ChildProcess;
    message: string;
};

export type ValidateResponse = {
    validate?: ValidateFunction;
    message: string;
};

function getPortFromArgs(cmdArgs: string[]): string | undefined {
    for (let i = 0; i < cmdArgs.length; i++) {
        const arg = cmdArgs[i];
        if ((arg === "-p" || arg === "--port") && i + 1 < cmdArgs.length) {
            return cmdArgs[i + 1];
        }
        if (arg.startsWith("--port=")) {
            return arg.slice("--port=".length);
        }
    }
    return undefined;
}

export const getInitiateMain = (mainCmd: string, cmdArgs: string[]): Promise<ThingStartResponse> => {
    return new Promise((resolve, reject) => {
        const thingProcess = spawn(mainCmd, cmdArgs);
        let settled = false;
        let stderr = "";
        const timerRef: { timeout?: NodeJS.Timeout } = {};

        const settleReject = (err: Error) => {
            if (settled) return;
            settled = true;
            if (timerRef.timeout) clearTimeout(timerRef.timeout);
            reject(err);
        };
        thingProcess.stderr?.on("data", (data) => {
            stderr += data.toString();
        });
        // Give things enough time to initialize transports and announce readiness.
        const startTimeout = Number(process.env.THING_START_TIMEOUT ?? 60000);

        timerRef.timeout = setTimeout(() => {
            thingProcess.kill();
            settleReject(new Error(`Thing did not start as expected.${stderr ? `\n${stderr}` : ""}`));
        }, startTimeout);

        const settleResolve = (result: ThingStartResponse) => {
            if (settled) {
                return;
            }
            settled = true;
            if (timerRef.timeout) clearTimeout(timerRef.timeout);
            resolve(result);
        };

        thingProcess.stdout!.on("data", (data: Buffer) => {
            if (data.toString().includes("ThingIsReady")) {
                settleResolve({
                    process: thingProcess,
                    message: "Success",
                });
            }
        });
        thingProcess.on("error", (error: Error) => {
            settleReject(new Error(`Process error: ${error.message}`));
        });
        thingProcess.on("close", () => {
            settleReject(new Error(`Failed to initiate the main script.${stderr ? `\n${stderr}` : ""}`));
        });
    });
};

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });

export const getTDValidate = async (): Promise<ValidateResponse> => {
    // Load TD schema JSON from the package files
    const packageJsonPath = require.resolve("wot-thing-description-types/package.json");
    const schemaPath = path.join(path.dirname(packageJsonPath), "schema", "td-json-schema-validation.json");
    const tdSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8")) as Record<string, unknown>;

    return Promise.resolve({
        validate: ajv.compile(tdSchema),
        message: "Success",
    });
};
