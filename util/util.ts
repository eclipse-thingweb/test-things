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
import * as tdSchema from "wot-thing-description-types";

export type ThingStartResponse = {
    process?: ChildProcess;
    message: string;
};

export type ValidateResponse = {
    validate?: ValidateFunction;
    message: string;
};

export const getInitiateMain = (mainCmd: string, cmdArgs: string[]): Promise<ThingStartResponse> => {
    return new Promise((resolve, reject) => {
        const thingProcess = spawn(mainCmd, cmdArgs);

        // Avoids unsettled promise in case the promise is not settled in a second.
        const timeout = setTimeout(() => {
            reject(new Error("Thing did not start as expected."));
        }, 1000);

        thingProcess.stdout!.on("data", (data: Buffer) => {
            if (data.toString().includes("ThingIsReady")) {
                clearTimeout(timeout);
                resolve({
                    process: thingProcess,
                    message: "Success",
                });
            }
        });
        thingProcess.stderr!.on("data", (data: Buffer) => {
            reject(new Error(`Process stderr: ${data}`));
        });
        thingProcess.on("error", (error: Error) => {
            reject(new Error(`Process error: ${error.message}`));
        });
        thingProcess.on("close", () => {
            reject(new Error("Failed to initiate the main script."));
        });
    });
};

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });

export const getTDValidate = async (): Promise<ValidateResponse> => {
    // Use the wot-thing-description-types package instead of fetching from remote URL
    return Promise.resolve({
        validate: ajv.compile(tdSchema as Record<string, unknown>),
        message: "Success",
    });
};
