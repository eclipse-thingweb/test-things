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

import { ChildProcess } from "child_process";
// eslint-disable-next-line workspaces/no-relative-imports, workspaces/require-dependency
import { getInitiateMain, ThingStartResponse } from "../../../../../util/util";
import path from "path";

let thingProcess: ChildProcess | undefined;
let response: ThingStartResponse;
export const port = 3000;

export async function mochaGlobalSetup() {
    try {
        response = await getInitiateMain("node", [path.join(__dirname, "..", "dist", "main.js"), "-p", `${port}`]);
    } catch (error) {
        console.log(error);
    } finally {
        thingProcess = response.process;
    }
}

export function mochaGlobalTeardown() {
    if (thingProcess) {
        thingProcess.kill();
    }
}
