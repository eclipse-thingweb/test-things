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
        const td = await WoT.requestThingDescription(
            "http://localhost:3001/http-express-calculator-content-negotiation"
        );

        const thing = await WoT.consume(td);
        console.log(td);

        const result = await thing.readProperty("result", { formIndex: 0 });
        console.log("Result property: ", await result.value());

        const lastChange = await thing.readProperty("lastChange", {
            formIndex: 0,
        });
        console.log("lastChange property: ", await lastChange.value());

        // Actions endpoints
        // TODO: Add this when it gets fixed in node-wot
        // let addition = await thing.invokeAction("add", 3, {formIndex: 0})
        // console.log(await addition.value());

        // let subtraction = await thing.invokeAction("subtract", 5, {formIndex: 0})
        // console.log(await subtraction.value());

        // let addition2 = await thing.invokeAction("add", 3, {formIndex: 1})
        // console.log(await addition2.value());

        // let subtraction2 = await thing.invokeAction("subtract", 5, {formIndex: 3})
        // console.log(await subtraction2.value());

        // Update event property
        // thing.subscribeEvent("update", async (data) => {
        //     console.log("Update event:", await data.value());
        // })

        // //Properties observation
        // thing.observeProperty("result", async (data) => { console.log("Result observe:", await data.value()); });
        // thing.observeProperty("lastChange", async (data) => { console.log("lastChange observe:", await data.value()); });
    })
    .catch((err) => {
        console.error(err);
    });
