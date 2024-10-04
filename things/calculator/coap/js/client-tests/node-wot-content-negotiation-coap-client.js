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

const { Servient } = require("@node-wot/core");
const { CoapClientFactory } = require("@node-wot/binding-coap");

// create Servient and add CoAP binding
const servient = new Servient();
servient.addClientFactory(new CoapClientFactory());

servient
    .start()
    .then(async (WoT) => {
        try {
            const td = await WoT.requestThingDescription(
                "coap://localhost:5684/coap-calculator-content-negotiation"
            );

            const thing = await WoT.consume(td);
            console.log(td);

            // read property result
            const result = await thing.readProperty("result", { formIndex: 2 });
            console.log("result: ", await result.value());

            // read property lastChange
            const lastChange = await thing.readProperty("lastChange", {
                formIndex: 2,
            });
            console.log("lastChange: ", await lastChange.value());

            console.log("\n ---------- \n");

            // Observe properties
            thing.observeProperty("result", async (data) => {
                console.log("Result observe:", await data.value());
            });
            thing.observeProperty("lastChange", async (data) => {
                console.log("lastChange observe:", await data.value());
            });

            // Subscribe to event update
            thing.subscribeEvent("update", async (data) => {
                console.log("Update event:", await data.value());
            });

            // Invoke addition action
            const add = await thing.invokeAction("add", 3, { formIndex: 1 });
            console.log("Addition value:", await add.value());
            // Invoke subtraction action
            const subtract = await thing.invokeAction("subtract", 1, {
                formIndex: 3,
            });
            console.log("Subtraction value:", await subtract.value());

            console.log("\n ---------- \n");
        } catch (err) {
            console.error("Script error:", err);
        }
    })
    .catch((err) => {
        console.error("Start error:", err);
    });
