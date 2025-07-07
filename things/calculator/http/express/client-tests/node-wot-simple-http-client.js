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
const { HttpClientFactory } = require("@node-wot/binding-http");

const servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));

servient
    .start()
    .then(async (WoT) => {
        const td = await WoT.requestThingDescription("http://localhost:3000/http-express-calculator-simple");

        const thing = await WoT.consume(td);
        console.log(td);

        // Property endpoints
        const result = await (await thing.readProperty("result")).value();
        console.log("Read result:", result);

        const lastChange = await (await thing.readProperty("lastChange")).value();
        console.log("Read lastChange:", lastChange);

        // Update event observation
        thing.subscribeEvent("update", async (data) => {
            console.log("Update event:", (await data.value()).data);
        });

        // Action endpoints
        const additionResult = await thing.invokeAction("add", 3);
        console.log("Addition result: ", await additionResult.value());

        const subtractionResult = await thing.invokeAction("subtract", 3);
        console.log("Subtraction result: ", await subtractionResult.value());

        // TODO: Property Observation failing do to returning wrong type (SSE returns object rather than a number)
        // thing.observeProperty("result", async (data) => { console.log("Result observe:", await data.value()); });
        // thing.observeProperty("lastChange", async (data) => { console.log("lastChange observe:", await data.value()); });
    })
    .catch((err) => {
        console.error(err);
    });
