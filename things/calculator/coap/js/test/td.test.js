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

const Ajv = require("ajv");
const chai = require("chai");
const https = require("https");
const coap = require("coap");
const path = require("path");

const spawn = require("child_process").spawn;

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });

const expect = chai.expect;
const port = 5683;
let thingProcess;

describe("Calculator CoAP JS", () => {
    let validate;

    before(async () => {
        const initiateMain = new Promise((resolve, reject) => {
            thingProcess = spawn(
                "node",
                ["coap-simple-calculator.js", "-p", `${port}`],
                { cwd: path.join(__dirname, "..") },
            );
            thingProcess.stdout.on("data", (data) => {
                if (data.toString().trim() === "ThingIsReady") {
                    resolve("Success");
                }
            });
            thingProcess.stderr.on("data", (data) => {
                reject(new Error(`Error: ${data}`));
            });
            thingProcess.on("error", (error) => {
                reject(new Error(`Error: ${error}`));
            });
            thingProcess.on("close", () => {
                reject(new Error("Failed to initiate the main script."));
            });
        });

        const getJSONSchema = new Promise((resolve, reject) => {
            https.get(
                "https://raw.githubusercontent.com/w3c/wot-thing-description/main/validation/td-json-schema-validation.json",
                function (response) {
                    const body = [];
                    response.on("data", (chunk) => {
                        body.push(chunk);
                    });

                    response.on("end", () => {
                        const tdSchema = JSON.parse(
                            Buffer.concat(body).toString(),
                        );
                        validate = ajv.compile(tdSchema);
                        resolve("Success");
                    });
                },
            );
        });

        await Promise.all([initiateMain, getJSONSchema]).then((data) => {
            if (data[0] !== "Success" || data[1] !== "Success") {
                console.log(`initiateMain: ${data[0]}`);
                console.log(`getJSONSchema: ${data[1]}`);
            }
        });
    });

    after(() => {
        thingProcess.kill();
    });

    it("should have a valid TD", (done) => {
        const req = coap.request(
            `coap://localhost:${port}/coap-calculator-simple`,
        );

        req.on("response", (res) => {
            const valid = validate(JSON.parse(res.payload.toString()));
            expect(valid).to.be.true;
            done();
        });

        req.end();
    });
});
