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

// This is an example Thing script which is a simple presence detector
// It fires an event when it detects a person (mocked as every 5 second)

import { Servient } from "@node-wot/core";
import { MqttBrokerServer } from "@node-wot/binding-mqtt";
import * as fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const thingName = "smart-home-presence-sensor";
// create Servient add MQTT binding with port configuration
const servient = new Servient();
const brokerUri = process.env.PRESENCE_SENSOR_BROKER_URI ?? "mqtt://test.mosquitto.org";
servient.addServer(new MqttBrokerServer({ uri: brokerUri }));

servient.start().then((WoT) => {
    WoT.produce({
        title: thingName,
        description: "Thing that can detect presence of human nearby",
        support: "https://github.com/eclipse-thingweb/node-wot/",
        "@context": "https://www.w3.org/2022/wot/td/v1.1",
        events: {
            presenceDetected: {
                title: "Presence Detected",
                description:
                    "An event that is emitted when a person is detected in the room. It is mocked and emitted every 5 seconds",
                data: {
                    type: "number",
                    title: "Distance",
                    minimum: 55,
                    maximum: 1200,
                },
            },
        },
    })
        .then((thing) => {
            console.log("Produced " + thing.getThingDescription().title);

            // expose the thing
            thing.expose().then(() => {
                console.info(thing.getThingDescription().title + " ready");
                fs.writeFile(
                    `${thingName}.td.json`,
                    JSON.stringify(thing.getThingDescription(), null, 4),
                    "utf-8",
                    function () {}
                );
                // mocking the detection with an event sent every 5 seconds, with a random distance
                setInterval(() => {
                    const distance: number = Math.random() * (1200 - 55) + 55;
                    thing.emitEvent("presenceDetected", distance);
                    console.info("Emitted presence with distance ", distance);
                }, 5000);
            });
        })
        .catch((e) => {
            console.log(e);
        });
});
