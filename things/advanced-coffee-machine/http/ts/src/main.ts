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

// This is an example of Web of Things producer ("server" mode) Thing script.
// It considers a fictional smart coffee machine in order to demonstrate the capabilities of Web of Things.
// An accompanying tutorial is available at http://www.thingweb.io/smart-coffee-machine.html.

import WoT from "wot-typescript-definitions";
import fs from "fs";
import path from "path";
import { parseArgs } from "node:util";
import { JsonPlaceholderReplacer } from "json-placeholder-replacer";
import { Servient } from "@node-wot/core";
import { HttpServer } from "@node-wot/binding-http";
import dotenv from "dotenv";
import {
    initTracing,
    tracedActionHandler,
    tracedPropertyReadHandler,
    tracedPropertyWriteHandler,
    tracedEventHandler,
} from "./tracing";
dotenv.config();

// Initialize tracing
initTracing("advanced-coffee-machine");

const hostname = process.env.HOSTNAME ?? "localhost";
let portNumber = process.env.PORT != null && process.env.PORT !== "" ? parseInt(process.env.PORT) : 3000;
const thingName = "http-advanced-coffee-machine";

let allAvailableResources: Record<string, number>;
let possibleDrinks: string[];
let maintenanceNeeded: boolean;
let schedules: unknown[];
let servedCounter: number;

function readFromSensor(sensorType: string): number {
    // Actual implementation of reading data from a sensor can go here
    // For the sake of example, let's just return a value
    return 100;
}

function notify(subscribers: unknown, msg: string) {
    // Actual implementation of notifying subscribers with a message can go here
    console.log(msg);
}

const {
    values: { port },
} = parseArgs({
    options: {
        port: {
            type: "string",
            short: "p",
        },
    },
});

if (port != null && !isNaN(parseInt(port))) {
    portNumber = parseInt(port);
}

const tmPath = process.env.TM_PATH;

if (process.platform === "win32") {
    tmPath?.split(path.sep).join(path.win32.sep);
}

let thingModel;

if (tmPath != null && tmPath !== "") {
    thingModel = JSON.parse(fs.readFileSync(path.join(__dirname, tmPath)).toString());
}

const placeholderReplacer = new JsonPlaceholderReplacer();
placeholderReplacer.addVariableMap({
    PROTOCOL: "http",
    THING_NAME: thingName,
    HOSTNAME: hostname,
    PORT_NUMBER: portNumber,
});

let thingDescription = placeholderReplacer.replace(thingModel);
thingDescription = {
    ...thingDescription,
    "@type": "Thing",
};

const servient = new Servient();
servient.addServer(
    new HttpServer({
        baseUri: `http://${hostname}:${portNumber}`,
        port: portNumber,
    })
);

servient
    .start()
    .then((WoT) => {
        WoT.produce(thingDescription).then((thing: WoT.ExposedThing) => {
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

            thing.setPropertyReadHandler(
                "allAvailableResources",
                tracedPropertyReadHandler("allAvailableResources", async () => allAvailableResources)
            );
            thing.setPropertyReadHandler(
                "possibleDrinks",
                tracedPropertyReadHandler("possibleDrinks", async () => possibleDrinks)
            );
            thing.setPropertyReadHandler(
                "maintenanceNeeded",
                tracedPropertyReadHandler("maintenanceNeeded", async () => maintenanceNeeded)
            );
            thing.setPropertyReadHandler(
                "schedules",
                tracedPropertyReadHandler("schedules", async () => schedules)
            );

            // Override a write handler for servedCounter property,
            // raising maintenanceNeeded flag when the value exceeds 1000 drinks
            thing.setPropertyWriteHandler(
                "servedCounter",
                tracedPropertyWriteHandler("servedCounter", async (val) => {
                    if (!val) {
                        throw new Error("No value provided for servedCounter");
                    }
                    servedCounter = (await (val as any).value()) as number;
                    if (servedCounter > 1000) {
                        maintenanceNeeded = true;
                        tracedEventHandler("maintenanceNeeded", (data) =>
                            thing.emitPropertyChange("maintenanceNeeded")
                        )(maintenanceNeeded);

                        // Notify a "maintainer" when the value has changed
                        // (the notify function here simply logs a message to the console)
                        notify(
                            "admin@coffeeMachine.com",
                            `maintenanceNeeded property has changed, new value is: ${maintenanceNeeded}`
                        );
                    }
                })
            );

            // Now initialize the servedCounter property
            servedCounter = readFromSensor("servedCounter");

            // Override a write handler for availableResourceLevel property,
            // utilizing the uriVariables properly
            thing.setPropertyWriteHandler(
                "availableResourceLevel",
                tracedPropertyWriteHandler("availableResourceLevel", async (val, options) => {
                    // Check if uriVariables are provided
                    if (Boolean(options) && typeof options === "object" && "uriVariables" in options) {
                        const uriVariables = options.uriVariables as Record<string, string>;
                        if ("id" in uriVariables) {
                            const id = uriVariables.id;
                            if (!val) {
                                throw new Error("No value provided for availableResourceLevel");
                            }
                            allAvailableResources[id] = (await (val as any).value()) as number;
                            return;
                        }
                    }
                    throw Error("Please specify id variable as uriVariables.");
                })
            );

            // Override a read handler for availableResourceLevel property,
            // utilizing the uriVariables properly
            thing.setPropertyReadHandler(
                "availableResourceLevel",
                tracedPropertyReadHandler("availableResourceLevel", async (options) => {
                    // Check if uriVariables are provided
                    if (Boolean(options) && typeof options === "object" && "uriVariables" in options) {
                        const uriVariables = options.uriVariables as Record<string, string>;
                        if ("id" in uriVariables) {
                            const id = uriVariables.id;
                            return allAvailableResources[id];
                        }
                    }
                    throw Error("Please specify id variable as uriVariables.");
                })
            );

            // Set up a handler for makeDrink action using traced wrapper
            thing.setActionHandler(
                "makeDrink",
                tracedActionHandler("makeDrink", async (_params, options) => {
                    // Default values
                    let drinkId = "americano";
                    let size = "m";
                    let quantity = 1;

                    // Size quantifiers
                    const sizeQuantifiers: Record<string, number> = {
                        s: 0.1,
                        m: 0.2,
                        l: 0.3,
                    };

                    // Drink recipes showing the amount of a resource consumed for a particular drink
                    const drinkRecipes: Record<string, Record<string, number>> = {
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
                    if (Boolean(options) && typeof options === "object" && "uriVariables" in options) {
                        const uriVariables = options.uriVariables as Record<string, string | number>;
                        drinkId = "drinkId" in uriVariables ? (uriVariables.drinkId as string) : drinkId;
                        size = "size" in uriVariables ? (uriVariables.size as string) : size;
                        quantity = "quantity" in uriVariables ? (uriVariables.quantity as number) : quantity;
                    }

                    // Testing to see what happens when thing crashes
                    // if (drinkId === "americano") {
                    //     throw new Error("Americano is not available");
                    // }

                    // Calculate the new level of resources
                    const newResources = Object.assign({}, allAvailableResources);
                    newResources.water -= Math.ceil(quantity * sizeQuantifiers[size] * drinkRecipes[drinkId].water);
                    newResources.milk -= Math.ceil(quantity * sizeQuantifiers[size] * drinkRecipes[drinkId].milk);
                    newResources.chocolate -= Math.ceil(
                        quantity * sizeQuantifiers[size] * drinkRecipes[drinkId].chocolate
                    );
                    newResources.coffeeBeans -= Math.ceil(
                        quantity * sizeQuantifiers[size] * drinkRecipes[drinkId].coffeeBeans
                    );

                    // Check if the amount of available resources is sufficient to make a drink
                    for (const resource in newResources) {
                        if (newResources[resource] <= 0) {
                            const eventData = `Low level of ${resource}: ${newResources[resource]}%`;
                            tracedEventHandler("outOfResource", (data) => thing.emitEvent("outOfResource", data))(
                                eventData
                            );
                            return {
                                result: false,
                                message: `${resource} level is not sufficient`,
                            };
                        }
                    }

                    // Now store the new level of allAvailableResources
                    allAvailableResources = newResources;
                    servedCounter = servedCounter + quantity;

                    // Finally deliver the drink
                    return {
                        result: true,
                        message: `Your ${drinkId} is in progress!`,
                    };
                })
            );

            // Set up a handler for setSchedule action using traced wrapper
            thing.setActionHandler(
                "setSchedule",
                tracedActionHandler("setSchedule", async (params, options) => {
                    const paramsp = params ? ((await (params as any).value()) as Record<string, unknown>) : null;

                    // Check if required parameters are provided
                    if (paramsp != null && typeof paramsp === "object" && "time" in paramsp && "mode" in paramsp) {
                        // Use default values if not provided
                        paramsp.drinkId = "drinkId" in paramsp ? paramsp.drinkId : "americano";
                        paramsp.size = "size" in paramsp ? paramsp.size : "m";
                        paramsp.quantity = "quantity" in paramsp ? paramsp.quantity : 1;

                        // Now add a new schedule
                        schedules.push(paramsp);

                        return {
                            result: true,
                            message: `Your schedule has been set!`,
                        };
                    }

                    return {
                        result: false,
                        message: `Please provide all the required parameters: time and mode.`,
                    };
                })
            );

            // Finally expose the thing
            thing.expose().then(() => {
                console.info(`${thing.getThingDescription().title} ready`);
                console.info("ThingIsReady");
            });
            console.log(`Produced ${thing.getThingDescription().title}`);
        });
    })
    .catch((e: Error) => {
        console.log(e);
    });
