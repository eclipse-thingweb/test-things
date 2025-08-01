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

// This is an example Thing which is a smart clock that runs 60 times faster than real time, where 1 hour happens in 1 minute.

import { Servient } from "@node-wot/core";
import { CoapServer } from "@node-wot/binding-coap";
import * as fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const thingName = "smart-home-smart-clock";
// create Servient add CoAP binding with port configuration
const servient = new Servient();
const hostname = process.env.SMART_CLOCK_HOSTNAME ?? "localhost";
const port = process.env.SMART_CLOCK_PORT ?? "5686";
servient.addServer(
    new CoapServer({
        address: hostname,
        port: parseInt(port),
    })
);

let minuteCounter = 0;
let hourCounter = 5;

async function timeCount(thing: WoT.ExposedThing) {
    for (minuteCounter = 0; minuteCounter < 59; minuteCounter++) {
        // if we have <60, we can get a 15:60.
        await new Promise((resolve) => setTimeout(resolve, 1000)); // sleep
        thing.emitPropertyChange("time");
    }
    console.info({
        hour: hourCounter,
        minute: minuteCounter,
    });

    hourCounter++;
    if (hourCounter === 24) {
        hourCounter = 0;
    }
}

servient.start().then((WoT) => {
    WoT.produce({
        title: thingName,
        description: "a smart clock that runs 60 times faster than real time, where 1 hour happens in 1 minute.",
        support: "https://github.com/eclipse-thingweb/node-wot/",
        "@context": "https://www.w3.org/2022/wot/td/v1.1",
        properties: {
            time: {
                readOnly: true,
                observable: true,
                type: "object",
                properties: {
                    minute: {
                        type: "integer",
                        minimum: 0,
                        maximum: 59,
                    },
                    hour: {
                        type: "integer",
                        minimum: 0,
                        maximum: 23,
                    },
                },
            },
        },
    })
        .then(async (thing) => {
            console.log("Produced " + thing.getThingDescription().title);

            thing.setPropertyReadHandler("time", async () => {
                return {
                    hour: hourCounter,
                    minute: minuteCounter,
                };
            });

            timeCount(thing);
            setInterval(async () => {
                timeCount(thing);
                thing.emitPropertyChange("time");
            }, 61000); // if this is 60s, we never leave the for loop

            // expose the thing
            thing.expose().then(() => {
                console.info(thing.getThingDescription().title + " ready");
                fs.writeFile(
                    `${thingName}.td.json`,
                    JSON.stringify(thing.getThingDescription(), null, 4),
                    "utf-8",
                    function () {}
                );
            });
        })
        .catch((e) => {
            console.log(e);
        });
});
