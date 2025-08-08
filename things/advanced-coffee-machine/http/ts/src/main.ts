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
    traceBusinessLogic,
    traceValidation,
    traceDatabaseOperation,
    createChildSpan,
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
                tracedPropertyReadHandler("allAvailableResources", async () => {
                    return await traceBusinessLogic("getAllResources", async () => {
                        // Validate resource data integrity
                        await traceValidation("resourceData", allAvailableResources, async () => {
                            const requiredResources = ["water", "milk", "chocolate", "coffeeBeans"];
                            for (const resource of requiredResources) {
                                if (!(resource in allAvailableResources)) {
                                    throw new Error(`Missing required resource: ${resource}`);
                                }
                                if (typeof allAvailableResources[resource] !== "number") {
                                    throw new Error(`Invalid resource level for ${resource}`);
                                }
                            }
                        });

                        // Read sensor data for real-time validation
                        const sensorData = await createChildSpan("sensors.readAll", async () => {
                            const readings: Record<string, number> = {};
                            for (const resource in allAvailableResources) {
                                readings[resource] = readFromSensor(resource);
                            }
                            return readings;
                        }, {
                            "sensor.count": Object.keys(allAvailableResources).length,
                            "sensor.type": "resource_level"
                        });

                        // Compare and sync with database
                        return await traceDatabaseOperation("select", "resource_levels", async () => {
                            // In a real system, you might sync with actual sensor readings
                            // For demo, we'll just return the current state
                            return { ...allAvailableResources };
                        });
                    });
                })
            );
            thing.setPropertyReadHandler(
                "possibleDrinks",
                tracedPropertyReadHandler("possibleDrinks", async () => {
                    return await traceBusinessLogic("getPossibleDrinks", async () => {
                        // Validate drink catalog integrity
                        await traceValidation("drinkCatalog", possibleDrinks, async () => {
                            if (!Array.isArray(possibleDrinks)) {
                                throw new Error("Drink catalog is corrupted");
                            }
                            if (possibleDrinks.length === 0) {
                                throw new Error("No drinks available in catalog");
                            }
                        });

                        // Load drink availability from database
                        const availabilityMap = await traceDatabaseOperation("select", "drink_availability", async () => {
                            // Simulate checking drink availability based on current resources
                            const availability: Record<string, boolean> = {};
                            for (const drink of possibleDrinks) {
                                availability[drink] = true; // For demo, all drinks are available
                            }
                            return availability;
                        });

                        // Filter available drinks based on current resources
                        return await createChildSpan("processing.filterAvailableDrinks", async () => {
                            return possibleDrinks.filter(drink => availabilityMap[drink] !== false);
                        }, {
                            "drinks.total": possibleDrinks.length,
                            "filtering.criteria": "resource_availability"
                        });
                    });
                })
            );
            thing.setPropertyReadHandler(
                "maintenanceNeeded",
                tracedPropertyReadHandler("maintenanceNeeded", async () => maintenanceNeeded)
            );
            thing.setPropertyReadHandler(
                "schedules",
                tracedPropertyReadHandler("schedules", async () => {
                    return await traceBusinessLogic("getSchedules", async () => {
                        // Validate system state
                        await traceValidation("systemState", { schedulesLength: schedules.length }, async () => {
                            if (!Array.isArray(schedules)) {
                                throw new Error("Schedules data structure is corrupted");
                            }
                        });

                        // Load schedules from database
                        const result = await traceDatabaseOperation("select", "schedules", async () => {
                            return schedules;
                        });

                        // Process and filter active schedules
                        return await createChildSpan("processing.filterActiveSchedules", async () => {
                            const currentTime = new Date();
                            return result.filter((schedule: any) => {
                                // For demo purposes, all schedules are considered active
                                return true;
                            });
                        }, {
                            "schedules.count": schedules.length,
                            "query.time": new Date().toISOString()
                        });
                    });
                })
            );

            // Override a write handler for servedCounter property,
            // raising maintenanceNeeded flag when the value exceeds 1000 drinks
            thing.setPropertyWriteHandler(
                "servedCounter",
                tracedPropertyWriteHandler("servedCounter", async (val) => {
                    return await traceBusinessLogic("updateServedCounter", async () => {
                        // Validate input
                        await traceValidation("counterInput", val, async () => {
                            if (!val) {
                                throw new Error("No value provided for servedCounter");
                            }
                        });

                        // Parse and validate the new counter value
                        const newCounterValue = await createChildSpan("parsing.extractCounterValue", async () => {
                            const value = (await (val as any).value()) as number;
                            if (typeof value !== "number" || value < 0) {
                                throw new Error(`Invalid served counter value: ${value}`);
                            }
                            return value;
                        }, {
                            "input.type": typeof val,
                            "parsing.operation": "counter_extraction"
                        });

                        // Update counter in database
                        await traceDatabaseOperation("update", "counters", async () => {
                            servedCounter = newCounterValue;
                        });

                        // Check maintenance threshold and trigger events if needed
                        await createChildSpan("business.checkMaintenanceThreshold", async () => {
                            if (servedCounter > 1000) {
                                // Update maintenance status
                                await traceDatabaseOperation("update", "maintenance_status", async () => {
                                    maintenanceNeeded = true;
                                });

                                // Emit maintenance event
                                await createChildSpan("event.maintenanceNeeded", async () => {
                                    tracedEventHandler("maintenanceNeeded", (data) =>
                                        thing.emitPropertyChange("maintenanceNeeded")
                                    )(maintenanceNeeded);
                                });

                                // Send notification to administrators
                                await createChildSpan("notification.sendAlert", async () => {
                                    notify(
                                        "admin@coffeeMachine.com",
                                        `maintenanceNeeded property has changed, new value is: ${maintenanceNeeded}`
                                    );
                                }, {
                                    "notification.type": "maintenance_alert",
                                    "notification.recipient": "admin@coffeeMachine.com",
                                    "counter.value": servedCounter,
                                    "maintenance.threshold": 1000
                                });
                            }
                        }, {
                            "counter.current": servedCounter,
                            "counter.previous": servedCounter - newCounterValue,
                            "maintenance.threshold": 1000,
                            "maintenance.needed": maintenanceNeeded
                        });
                    });
                })
            );

            // Now initialize the servedCounter property
            servedCounter = readFromSensor("servedCounter");

            // Override a write handler for availableResourceLevel property,
            // utilizing the uriVariables properly
            thing.setPropertyWriteHandler(
                "availableResourceLevel",
                tracedPropertyWriteHandler("availableResourceLevel", async (val, options) => {
                    return await traceBusinessLogic("updateResourceLevel", async () => {
                        // Validate URI variables and extract resource ID
                        const resourceId = await traceValidation("uriVariables", options, async () => {
                            if (!Boolean(options) || typeof options !== "object" || !("uriVariables" in options)) {
                                throw new Error("URI variables are required");
                            }
                            const uriVariables = options.uriVariables as Record<string, string>;
                            if (!("id" in uriVariables)) {
                                throw new Error("Please specify id variable as uriVariables.");
                            }
                            const id = uriVariables.id;
                            
                            // Validate resource ID
                            const validResources = ["water", "milk", "chocolate", "coffeeBeans"];
                            if (!validResources.includes(id)) {
                                throw new Error(`Invalid resource ID: ${id}. Valid options: ${validResources.join(", ")}`);
                            }
                            return id;
                        });

                        // Validate and parse the new resource level
                        const newLevel = await createChildSpan("parsing.extractResourceLevel", async () => {
                            if (!val) {
                                throw new Error("No value provided for availableResourceLevel");
                            }
                            const level = (await (val as any).value()) as number;
                            
                            // Validate resource level range
                            if (typeof level !== "number" || level < 0 || level > 100) {
                                throw new Error(`Invalid resource level: ${level}. Must be between 0 and 100.`);
                            }
                            return level;
                        }, {
                            "resource.id": resourceId,
                            "input.type": typeof val
                        });

                        // Check current level and calculate change
                        const levelChange = await createChildSpan("calculate.levelChange", async () => {
                            const currentLevel = allAvailableResources[resourceId];
                            const change = newLevel - currentLevel;
                            return {
                                previous: currentLevel,
                                new: newLevel,
                                change: change,
                                changeType: change > 0 ? "refill" : change < 0 ? "consumption" : "no_change"
                            };
                        }, {
                            "resource.id": resourceId,
                            "calculation.type": "level_change"
                        });

                        // Update resource level in database
                        await traceDatabaseOperation("update", "resource_levels", async () => {
                            allAvailableResources[resourceId] = newLevel;
                        });

                        // Check for low resource alerts
                        await createChildSpan("business.checkResourceThresholds", async () => {
                            if (newLevel <= 10) {
                                // Emit low resource event
                                await createChildSpan("event.lowResource", async () => {
                                    const eventData = `Low level of ${resourceId}: ${newLevel}%`;
                                    tracedEventHandler("outOfResource", (data) => thing.emitEvent("outOfResource", data))(eventData);
                                });
                            }
                            
                            if (newLevel === 0) {
                                // Update maintenance needed flag
                                await traceDatabaseOperation("update", "maintenance_status", async () => {
                                    maintenanceNeeded = true;
                                });
                            }
                        }, {
                            "resource.id": resourceId,
                            "resource.level": newLevel,
                            "threshold.low": 10,
                            "threshold.empty": 0,
                            "maintenance.needed": maintenanceNeeded
                        });

                        // Log resource level change
                        await createChildSpan("logging.resourceUpdate", async () => {
                            console.log(`Resource ${resourceId} updated: ${levelChange.previous}% → ${newLevel}% (${levelChange.changeType})`);
                        }, {
                            "resource.id": resourceId,
                            "level.previous": levelChange.previous,
                            "level.new": newLevel,
                            "change.type": levelChange.changeType,
                            "change.amount": levelChange.change
                        });
                    });
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
                    // Parse input parameters first to use in metadata
                    let drinkId = "americano";
                    let size = "m";
                    let quantity = 1;

                    if (Boolean(options) && typeof options === "object" && "uriVariables" in options) {
                        const uriVariables = options.uriVariables as Record<string, string | number>;
                        drinkId = "drinkId" in uriVariables ? (uriVariables.drinkId as string) : drinkId;
                        size = "size" in uriVariables ? (uriVariables.size as string) : size;
                        quantity = "quantity" in uriVariables ? (uriVariables.quantity as number) : quantity;
                    }

                    return await traceBusinessLogic("makeDrink", async () => {
                        // Validate input parameters
                        await traceValidation("input", options, async () => {
                            if (!drinkId || !size || !quantity) {
                                throw new Error("Invalid input parameters");
                            }
                        });

                        // Load drink recipes and configuration
                        const { drinkRecipes, sizeQuantifiers } = await traceDatabaseOperation("select", "recipes", async () => {
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

                            return { drinkRecipes, sizeQuantifiers };
                        });

                        // Validate drink availability
                        await traceValidation("drinkAvailability", drinkId, async () => {
                            if (!drinkRecipes[drinkId]) {
                                throw new Error(`Drink ${drinkId} is not available`);
                            }
                            if (!sizeQuantifiers[size]) {
                                throw new Error(`Size ${size} is not valid`);
                            }
                            if (quantity < 1 || quantity > 5) {
                                throw new Error(`Quantity ${quantity} is not valid (must be 1-5)`);
                            }
                        });

                        // Get current resources from sensors
                        const currentResources = await traceDatabaseOperation("select", "resources", async () => {
                            return { ...allAvailableResources };
                        });

                        // Calculate resource consumption
                        const newResources = await createChildSpan("calculate.resourceConsumption", async () => {
                            const newResources = Object.assign({}, currentResources);
                            const recipe = drinkRecipes[drinkId];
                            const sizeMultiplier = sizeQuantifiers[size];
                            
                            newResources.water -= Math.ceil(quantity * sizeMultiplier * recipe.water);
                            newResources.milk -= Math.ceil(quantity * sizeMultiplier * recipe.milk);
                            newResources.chocolate -= Math.ceil(quantity * sizeMultiplier * recipe.chocolate);
                            newResources.coffeeBeans -= Math.ceil(quantity * sizeMultiplier * recipe.coffeeBeans);
                            
                            return newResources;
                        }, {
                            "drink.id": drinkId,
                            "drink.size": size,
                            "drink.quantity": quantity,
                            "calculation.type": "resource_consumption"
                        });

                        // Validate resource availability
                        await traceValidation("resourceAvailability", newResources, async () => {
                            for (const resource in newResources) {
                                if (newResources[resource] <= 0) {
                                    const eventData = `Low level of ${resource}: ${newResources[resource]}%`;
                                    await createChildSpan("event.outOfResource", async () => {
                                        tracedEventHandler("outOfResource", (data) => thing.emitEvent("outOfResource", data))(eventData);
                                    });
                                    throw new Error(`${resource} level is not sufficient`);
                                }
                            }
                        });

                        // Update resources in database
                        await traceDatabaseOperation("update", "resources", async () => {
                            allAvailableResources = newResources;
                        });

                        // Update served counter
                        await traceDatabaseOperation("update", "counters", async () => {
                            servedCounter = servedCounter + quantity;
                        });

                        // Simulate drink preparation
                        await createChildSpan("hardware.prepareDrink", async () => {
                            // Simulate time for drink preparation
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }, {
                            "hardware.operation": "drink_preparation",
                            "drink.id": drinkId,
                            "drink.size": size,
                            "drink.quantity": quantity
                        });

                        // Return success response
                        return {
                            result: true,
                            message: `Your ${drinkId} is in progress!`,
                        };
                    }, {
                        "drink.id": drinkId,
                        "drink.size": size,
                        "drink.quantity": quantity
                    });
                })
            );

            // Set up a handler for setSchedule action using traced wrapper
            thing.setActionHandler(
                "setSchedule",
                tracedActionHandler("setSchedule", async (params, options) => {
                    // Parse input parameters first for metadata
                    const paramsp = params ? ((await (params as any).value()) as Record<string, unknown>) : null;
                    
                    return await traceBusinessLogic("setSchedule", async () => {
                        // Always create initial validation span to show the process started
                        const validatedParams = await createChildSpan("initialization.parseInput", async () => {
                            // Validate input parameters
                            await traceValidation("input", params, async () => {
                                if (!paramsp) {
                                    throw new Error("No parameters provided");
                                }
                            });

                            // Validate required parameters
                            const scheduleData = await traceValidation("scheduleParameters", paramsp, async () => {
                                if (paramsp == null || typeof paramsp !== "object" || !("time" in paramsp) || !("mode" in paramsp)) {
                                    throw new Error("Please provide all the required parameters: time and mode.");
                                }

                                // Use default values if not provided
                                const data = {
                                    time: paramsp.time,
                                    mode: paramsp.mode,
                                    drinkId: "drinkId" in paramsp ? paramsp.drinkId : "americano",
                                    size: "size" in paramsp ? paramsp.size : "m",
                                    quantity: "quantity" in paramsp ? paramsp.quantity : 1,
                                };

                                return data;
                            });

                            // Validate time format
                            await traceValidation("timeFormat", scheduleData.time, async () => {
                                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                                if (!timeRegex.test(String(scheduleData.time))) {
                                    throw new Error("Invalid time format. Please use HH:MM format.");
                                }
                            });

                            return scheduleData;
                        }, {
                            "input.present": !!paramsp,
                            "input.type": typeof paramsp,
                            "schedule.time": paramsp && typeof paramsp === "object" && "time" in paramsp ? String(paramsp.time) : "unknown",
                            "schedule.mode": paramsp && typeof paramsp === "object" && "mode" in paramsp ? String(paramsp.mode) : "unknown"
                        });

                        // Continue with business logic (this will only execute if validation passes)
                        await createChildSpan("business.scheduleProcessing", async () => {
                            // Check schedule conflicts
                            await createChildSpan("check.scheduleConflicts", async () => {
                                const existingSchedule = schedules.find(s => 
                                    typeof s === "object" && s !== null && "time" in s && s.time === validatedParams.time
                                );
                                if (existingSchedule) {
                                    throw new Error(`Schedule already exists for time ${validatedParams.time}`);
                                }
                            }, {
                                "schedule.time": String(validatedParams.time),
                                "schedule.mode": String(validatedParams.mode)
                            });

                            // Save schedule to database
                            await traceDatabaseOperation("insert", "schedules", async () => {
                                schedules.push(validatedParams);
                            });

                            // Log schedule creation
                            await createChildSpan("logging.scheduleCreated", async () => {
                                console.log(`Schedule created: ${JSON.stringify(validatedParams)}`);
                            });
                        }, {
                            "business.operation": "schedule_processing",
                            "schedule.time": String(validatedParams.time),
                            "schedule.mode": String(validatedParams.mode)
                        });

                        return {
                            result: true,
                            message: `Your schedule has been set!`,
                        };
                    }, {
                        "schedule.time": paramsp && typeof paramsp === "object" && "time" in paramsp ? String(paramsp.time) : "unknown",
                        "schedule.mode": paramsp && typeof paramsp === "object" && "mode" in paramsp ? String(paramsp.mode) : "unknown"
                    });
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
