"use strict";
/********************************************************************************
 * Copyright (c) 2020 Contributors to the Eclipse Foundation
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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const { parseArgs } = require("node:util");
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer');
require("dotenv").config();
const WotCore = require("@node-wot/core");
const HttpServer = require("@node-wot/binding-http").HttpServer;
const hostname = (_a = process.env.HOSTNAME) !== null && _a !== void 0 ? _a : "localhost";
let portNumber = (_b = process.env.PORT) !== null && _b !== void 0 ? _b : 3000;
const thingName = "http-advanced-coffee-machine";
let allAvailableResources;
let possibleDrinks;
let maintenanceNeeded;
let schedules;
let servedCounter;
function readFromSensor(sensorType) {
    // Actual implementation of reading data from a sensor can go here
    // For the sake of example, let's just return a value
    return 100;
}
function notify(subscribers, msg) {
    // Actual implementation of notifying subscribers with a message can go here
    console.log(msg);
}
const { values: { port }, } = parseArgs({
    options: {
        port: {
            type: "string",
            short: "p",
        },
    },
});
if (port && !isNaN(parseInt(port))) {
    portNumber = parseInt(port);
}
const tmPath = process.env.TM_PATH;
if (process.platform === "win32") {
    tmPath === null || tmPath === void 0 ? void 0 : tmPath.split(path.sep).join(path.win32.sep);
}
const thingModel = JSON.parse(fs.readFileSync(path.join(__dirname, tmPath)));
const placeholderReplacer = new JsonPlaceholderReplacer();
placeholderReplacer.addVariableMap({
    PROTOCOL: "http",
    THING_NAME: thingName,
    HOSTNAME: hostname,
    PORT_NUMBER: portNumber
});
const thingDescription = placeholderReplacer.replace(thingModel);
thingDescription["@type"] = "Thing";
let servient = new WotCore.Servient();
servient.addServer(new HttpServer({
    baseUri: `http://${hostname}:${portNumber}`,
    port: portNumber
}));
servient.start()
    .then((WoT) => {
    WoT.produce(thingDescription)
        .then((thing) => {
        // Initialize the property values
        allAvailableResources = {
            water: readFromSensor("water"),
            milk: readFromSensor("milk"),
            chocolate: readFromSensor("chocolate"),
            coffeeBeans: readFromSensor("coffeeBeans"),
        };
        possibleDrinks = ["espresso", "americano", "cappuccino", "latte", "hotChocolate", "hotWater"];
        maintenanceNeeded = false;
        schedules = [];
        thing.setPropertyReadHandler("allAvailableResources", async () => allAvailableResources);
        thing.setPropertyReadHandler("possibleDrinks", async () => possibleDrinks);
        thing.setPropertyReadHandler("maintenanceNeeded", async () => maintenanceNeeded);
        thing.setPropertyReadHandler("schedules", async () => schedules);
        // Override a write handler for servedCounter property,
        // raising maintenanceNeeded flag when the value exceeds 1000 drinks
        thing.setPropertyWriteHandler("servedCounter", async (val) => {
            servedCounter = (await val.value());
            if (servedCounter > 1000) {
                maintenanceNeeded = true;
                thing.emitPropertyChange("maintenanceNeeded");
                // Notify a "maintainer" when the value has changed
                // (the notify function here simply logs a message to the console)
                notify("admin@coffeeMachine.com", `maintenanceNeeded property has changed, new value is: ${maintenanceNeeded}`);
            }
        });
        // Now initialize the servedCounter property
        servedCounter = readFromSensor("servedCounter");
        // Override a write handler for availableResourceLevel property,
        // utilizing the uriVariables properly
        thing.setPropertyWriteHandler("availableResourceLevel", async (val, options) => {
            // Check if uriVariables are provided
            if (options && typeof options === "object" && "uriVariables" in options) {
                const uriVariables = options.uriVariables;
                if ("id" in uriVariables) {
                    const id = uriVariables.id;
                    allAvailableResources[id] = (await val.value());
                    return;
                }
            }
            throw Error("Please specify id variable as uriVariables.");
        });
        // Override a read handler for availableResourceLevel property,
        // utilizing the uriVariables properly
        thing.setPropertyReadHandler("availableResourceLevel", async (options) => {
            // Check if uriVariables are provided
            if (options && typeof options === "object" && "uriVariables" in options) {
                const uriVariables = options.uriVariables;
                if ("id" in uriVariables) {
                    const id = uriVariables.id;
                    return allAvailableResources[id];
                }
            }
            throw Error("Please specify id variable as uriVariables.");
        });
        // Set up a handler for makeDrink action
        thing.setActionHandler("makeDrink", async (_params, options) => {
            // Default values
            let drinkId = "americano";
            let size = "m";
            let quantity = 1;
            // Size quantifiers
            const sizeQuantifiers = { s: 0.1, m: 0.2, l: 0.3 };
            // Drink recipes showing the amount of a resource consumed for a particular drink
            const drinkRecipes = {
                espresso: {
                    water: 1,
                    milk: 0,
                    chocolate: 0,
                    coffeeBeans: 2,
                },
                americano: {
                    water: 2,
                    milk: 0,
                    chocolate: 0,
                    coffeeBeans: 2,
                },
                cappuccino: {
                    water: 1,
                    milk: 1,
                    chocolate: 0,
                    coffeeBeans: 2,
                },
                latte: {
                    water: 1,
                    milk: 2,
                    chocolate: 0,
                    coffeeBeans: 2,
                },
                hotChocolate: {
                    water: 0,
                    milk: 0,
                    chocolate: 1,
                    coffeeBeans: 0,
                },
                hotWater: {
                    water: 1,
                    milk: 0,
                    chocolate: 0,
                    coffeeBeans: 0,
                },
            };
            // Check if uriVariables are provided
            if (options && typeof options === "object" && "uriVariables" in options) {
                const uriVariables = options.uriVariables;
                drinkId = "drinkId" in uriVariables ? uriVariables.drinkId : drinkId;
                size = "size" in uriVariables ? uriVariables.size : size;
                quantity = "quantity" in uriVariables ? uriVariables.quantity : quantity;
            }
            // Calculate the new level of resources
            const newResources = Object.assign({}, allAvailableResources);
            newResources.water -= Math.ceil(quantity * sizeQuantifiers[size] * drinkRecipes[drinkId].water);
            newResources.milk -= Math.ceil(quantity * sizeQuantifiers[size] * drinkRecipes[drinkId].milk);
            newResources.chocolate -= Math.ceil(quantity * sizeQuantifiers[size] * drinkRecipes[drinkId].chocolate);
            newResources.coffeeBeans -= Math.ceil(quantity * sizeQuantifiers[size] * drinkRecipes[drinkId].coffeeBeans);
            // Check if the amount of available resources is sufficient to make a drink
            for (const resource in newResources) {
                if (newResources[resource] <= 0) {
                    console.log('emitting an event');
                    thing.emitEvent("outOfResource", `Low level of ${resource}: ${newResources[resource]}%`);
                    return { result: false, message: `${resource} level is not sufficient` };
                }
            }
            // Now store the new level of allAvailableResources
            allAvailableResources = newResources;
            servedCounter = servedCounter + quantity;
            // Finally deliver the drink
            return { result: true, message: `Your ${drinkId} is in progress!` };
        });
        // Set up a handler for setSchedule action
        thing.setActionHandler("setSchedule", async (params, options) => {
            const paramsp = (await params.value()); //  : any = await Helpers.parseInteractionOutput(params);
            // Check if uriVariables are provided
            if (paramsp != null && typeof paramsp === "object" && "time" in paramsp && "mode" in paramsp) {
                // Use default values if not provided
                paramsp.drinkId = "drinkId" in paramsp ? paramsp.drinkId : "americano";
                paramsp.size = "size" in paramsp ? paramsp.size : "m";
                paramsp.quantity = "quantity" in paramsp ? paramsp.quantity : 1;
                // Now add a new schedule
                schedules.push(paramsp);
                return { result: true, message: `Your schedule has been set!` };
            }
            return { result: false, message: `Please provide all the required parameters: time and mode.` };
        });
        // Finally expose the thing
        thing.expose().then(() => {
            console.info(`${thing.getThingDescription().title} ready`);
            console.info('ThingIsReady');
        });
        console.log(`Produced ${thing.getThingDescription().title}`);
    });
})
    .catch((e) => {
    console.log(e);
});
