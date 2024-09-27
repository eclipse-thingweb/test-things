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

const { getInitiateMain } = require("../../../../../util/dist/util");
const path = require("node:path");

let simpleThingProcess;
let contentNegotiationThingProcess;
let response;
const simplePort = 3000;
const contentNegotiationPort = 3001;

const mochaGlobalSetup = async function () {
    try {
        response = await getInitiateMain("node", [
            path.join(__dirname, "..", "http-simple-calculator.js"),
            "-p",
            `${simplePort}`,
        ]);
        simpleThingProcess = response.process;
    } catch (error) {
        console.error(error);
        simpleThingProcess = error.process;
    }

    try {
        response = await getInitiateMain("node", [
            path.join(
                __dirname,
                "..",
                "http-content-negotiation-calculator.js",
            ),
            "-p",
            `${contentNegotiationPort}`,
        ]);
        contentNegotiationThingProcess = response.process;
    } catch (error) {
        console.error(error);
        contentNegotiationThingProcess = error.process;
    }
};

const mochaGlobalTeardown = function () {
    if (simpleThingProcess) {
        simpleThingProcess.kill();
    }

    if (contentNegotiationThingProcess) {
        contentNegotiationThingProcess.kill();
    }
};

module.exports = {
    simplePort,
    contentNegotiationPort,
    mochaGlobalSetup,
    mochaGlobalTeardown,
};
