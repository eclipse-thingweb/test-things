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

import { Servient, Helpers } from "@node-wot/core";
import { HttpClientFactory, HttpsClientFactory } from "@node-wot/binding-http";
import { CoapClientFactory } from "@node-wot/binding-coap";
import { MqttClientFactory } from "@node-wot/binding-mqtt";
import dotenv from "dotenv";
dotenv.config();

// create a Servient and add HTTP, CoAP and MQTT bindings
const servient = new Servient();
servient.addClientFactory(new HttpClientFactory());
servient.addClientFactory(new HttpsClientFactory());
servient.addClientFactory(new CoapClientFactory());
servient.addClientFactory(new MqttClientFactory());

const wotHelper = new Helpers(servient);

(async () => {
    const WoT = await servient.start();

    const coffeeMachineURL =
        process.env.SIMPLE_COFFEE_MACHINE_HOSTNAME === "smart-home-simple-coffee-machine"
            ? `http://${process.env.SIMPLE_COFFEE_MACHINE_HOSTNAME}/smart-home-simple-coffee-machine`
            : `http://${process.env.SIMPLE_COFFEE_MACHINE_HOSTNAME}:${process.env.SIMPLE_COFFEE_MACHINE_PORT}/smart-home-simple-coffee-machine`;

    // we will fetch the TDs of the devices
    const coffeeMachineTD = (await wotHelper.fetch(coffeeMachineURL)) as WoT.ThingDescription;
    // Alternatively, this Thing self-hosts its TD at http://plugfest.thingweb.io:8081/coffee-machine that you can fetch
    const presenceSensorTD = (await wotHelper.fetch(
        `mqtt://${process.env.PRESENCE_SENSOR_BROKER_URI}/smart-home-presence-sensor`
    )) as WoT.ThingDescription;
    const smartClockTD = (await wotHelper.fetch(
        `coap://${process.env.SMART_CLOCK_HOSTNAME}:${process.env.SMART_CLOCK_PORT}/smart-home-smart-clock`
    )) as WoT.ThingDescription;

    // consuming TDs allows creates a software object, which allows us to execute functions on them
    const coffeeMachineThing = await WoT.consume(coffeeMachineTD);
    const presenceSensorThing = await WoT.consume(presenceSensorTD);
    const smartClockThing = await WoT.consume(smartClockTD);

    let morningCoffeeFlag = false;

    // We subscribe to the presence detection events
    presenceSensorThing.subscribeEvent("presenceDetected", async (eventData) => {
        // We can log the distance of the detection but this is not necessary.
        // The emission of the event implies that a detection happened anyways
        console.log("Detected presence at,", await eventData.value(), "mm");

        type Time = {
            hour: number;
            minute: number;
        };

        // We read the time property from the smart clock
        const currentTimeData = await smartClockThing.readProperty("time");
        const currentTime: Time = (await currentTimeData.value()) as Time; // You need to always call the .value function

        // Optionally, we can log the current time
        console.log(
            "Current time is " +
                currentTime.hour.toString().padStart(2, "0") +
                ":" +
                currentTime.minute.toString().padStart(2, "0")
        );

        // To avoid accidental brews, a flag is used to check whether a coffee was brewed before
        if (!morningCoffeeFlag) {
            // As the task indicates, we brew only between 5:00 and 13:00
            if (currentTime.hour <= 13 && currentTime.hour >= 5) {
                // To brew a coffee, we invoke the brew action in the coffee machine
                await coffeeMachineThing.invokeAction("brew", "espresso");
                // We log to indicate to the user that brewing has finished
                console.log("brewed espresso");
                // for today we should not brew any more coffee
                morningCoffeeFlag = true;
            }
        }

        // we reset the morningCoffeeFlag every day at 1am
        setInterval(() => {
            if (currentTime.hour === 1) {
                morningCoffeeFlag = false;
            }
        }, 1000);
    });
})();
