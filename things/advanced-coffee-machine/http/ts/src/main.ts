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
// eslint-disable-next-line workspaces/no-relative-imports, workspaces/require-dependency
import { initTracing, tracedEventHandler } from "../../../../../util/dist/tracing";
// eslint-disable-next-line workspaces/no-relative-imports, workspaces/require-dependency
import { createAutoTracedThing, TracedBusinessLogic } from "../../../../../util/dist/auto-tracing";

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
    // Simulate realistic sensor readings with some variation
    const baseLevels: Record<string, number> = {
        water: 80,
        milk: 60,
        chocolate: 40,
        coffeeBeans: 90,
    };

    const baseLevel = baseLevels[sensorType] || 50;
    // Add some realistic variation (±10%) to simulate real sensor readings
    const variation = (Math.random() - 0.5) * 20;
    return Math.max(0, Math.min(100, Math.round(baseLevel + variation)));
}

// Type guard for WoT InteractionInput with value method
function hasValueMethod(input: unknown): input is { value: () => Promise<unknown> } {
    return (
        typeof input === "object" &&
        input !== null &&
        "value" in input &&
        typeof (input as Record<string, unknown>).value === "function"
    );
}

// Helper to safely extract value from WoT InteractionInput
async function extractWoTValue(input: WoT.InteractionInput): Promise<unknown> {
    if (hasValueMethod(input)) {
        return await input.value();
    }
    return input;
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

            // Create auto-traced thing wrapper
            const tracedThing = createAutoTracedThing(thing);

            // Property: allAvailableResources
            tracedThing.setPropertyReadHandler(
                "allAvailableResources",
                "getAllResources",
                async (logic: TracedBusinessLogic, options?: WoT.InteractionOptions) => {
                    // Validate resource data integrity
                    await logic.withValidation("resourceData", allAvailableResources, async () => {
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
                    await logic.withProcessing(
                        "sensors.readAll",
                        async () => {
                            const readings: Record<string, number> = {};
                            for (const resource of Object.keys(allAvailableResources)) {
                                readings[resource] = readFromSensor(resource);
                            }
                            return readings;
                        },
                        {
                            "sensor.count": Object.keys(allAvailableResources).length,
                            "sensor.type": "resource_level",
                        }
                    );

                    // Compare and sync with database
                    return await logic.withDatabase("select", "resource_levels", async () => {
                        return { ...allAvailableResources };
                    });
                }
            );

            // Property: possibleDrinks
            tracedThing.setPropertyReadHandler(
                "possibleDrinks",
                "getPossibleDrinks",
                async (logic: TracedBusinessLogic, options?: WoT.InteractionOptions) => {
                    // Validate drink catalog integrity
                    await logic.withValidation("drinkCatalog", possibleDrinks, async () => {
                        if (!Array.isArray(possibleDrinks)) {
                            throw new Error("Drink catalog is corrupted");
                        }
                        if (possibleDrinks.length === 0) {
                            throw new Error("No drinks available in catalog");
                        }
                    });

                    // Load drink availability from database
                    const availabilityMap = await logic.withDatabase("select", "drink_availability", async () => {
                        const availability: Record<string, boolean> = {};
                        for (const drink of possibleDrinks) {
                            availability[drink] = true;
                        }
                        return availability;
                    });

                    // Filter available drinks based on current resources
                    return await logic.withProcessing(
                        "processing.filterAvailableDrinks",
                        async () => {
                            return possibleDrinks.filter((drink) => availabilityMap[drink] !== false);
                        },
                        {
                            "drinks.total": possibleDrinks.length,
                            "filtering.criteria": "resource_availability",
                        }
                    );
                }
            );

            // Property: maintenanceNeeded (simple read)
            tracedThing.setPropertyReadHandler(
                "maintenanceNeeded",
                "getMaintenanceStatus",
                async (options?: WoT.InteractionOptions) => maintenanceNeeded
            );

            // Property Read: availableResourceLevel (with URI variables)
            tracedThing.setPropertyReadHandler(
                "availableResourceLevel",
                "getResourceLevel",
                async (logic: TracedBusinessLogic, options?: WoT.InteractionOptions) => {
                    // Parse resource ID from URI variables
                    const resourceId = await logic.withProcessing(
                        "parsing.extractResourceId",
                        async () => {
                            const resourceId = (options?.uriVariables as Record<string, string>)?.id;
                            if (!resourceId || !(resourceId in allAvailableResources)) {
                                throw new Error(`Invalid resource ID: ${resourceId}`);
                            }
                            return resourceId;
                        },
                        {
                            "resource.id": (options?.uriVariables as Record<string, string>)?.id ?? "unknown",
                            "parsing.operation": "resource_id_extraction",
                        }
                    );

                    // Get resource level from database
                    return await logic.withDatabase("select", "resource_levels", async () => {
                        return allAvailableResources[resourceId];
                    });
                }
            );

            // Property: schedules
            tracedThing.setPropertyReadHandler(
                "schedules",
                "getSchedules",
                async (logic: TracedBusinessLogic, options?: WoT.InteractionOptions) => {
                    // Validate system state
                    await logic.withValidation("systemState", { schedulesLength: schedules.length }, async () => {
                        if (!Array.isArray(schedules)) {
                            throw new Error("Schedules data structure is corrupted");
                        }
                    });

                    // Load schedules from database
                    const result = await logic.withDatabase("select", "schedules", async () => {
                        return schedules;
                    });

                    // Process and filter active schedules
                    return await logic.withProcessing(
                        "processing.filterActiveSchedules",
                        async () => {
                            return result.filter((schedule: unknown) => true); // For demo, all schedules are active
                        },
                        {
                            "schedules.count": schedules.length,
                            "query.time": new Date().toISOString(),
                        }
                    );
                }
            );

            // Property Write: servedCounter
            tracedThing.setPropertyWriteHandler(
                "servedCounter",
                "updateServedCounter",
                async (logic: TracedBusinessLogic, val: WoT.InteractionInput) => {
                    // Validate input
                    await logic.withValidation("counterInput", val, async () => {
                        if (val === null || val === undefined) {
                            throw new Error("No value provided for servedCounter");
                        }
                    });

                    // Parse and validate the new counter value
                    const newCounterValue = await logic.withProcessing(
                        "parsing.extractCounterValue",
                        async () => {
                            if (val === null || val === undefined) {
                                throw new Error("No value provided for servedCounter");
                            }
                            // Type guard and extraction for WoT InteractionInput
                            const value = await extractWoTValue(val);

                            if (typeof value !== "number" || value < 0) {
                                throw new Error(`Invalid served counter value: ${value}`);
                            }
                            return value;
                        },
                        {
                            "input.type": typeof val,
                            "parsing.operation": "counter_extraction",
                        }
                    );

                    // Update counter in database
                    await logic.withDatabase("update", "counters", async () => {
                        servedCounter = newCounterValue;
                    });

                    // Check maintenance threshold and trigger events if needed
                    await logic.withProcessing("business.checkMaintenanceThreshold", async () => {
                        if (servedCounter > 1000) {
                            // Update maintenance status
                            await logic.withDatabase("update", "maintenance_status", async () => {
                                maintenanceNeeded = true;
                            });

                            // Emit maintenance event
                            await logic.withProcessing("event.maintenanceNeeded", async () => {
                                tracedEventHandler("maintenanceNeeded", (data: WoT.InteractionInput) =>
                                    thing.emitPropertyChange("maintenanceNeeded")
                                )(maintenanceNeeded);
                            });
                        }
                    });
                }
            );

            // Property Write: availableResourceLevel
            tracedThing.setPropertyWriteHandler(
                "availableResourceLevel",
                "updateResourceLevel",
                async (logic: TracedBusinessLogic, val: WoT.InteractionInput, options?: WoT.InteractionOptions) => {
                    // Parse and validate resource ID and new level
                    const { resourceId, newLevel } = await logic.withProcessing(
                        "parsing.extractResourceParameters",
                        async () => {
                            const resourceId = (options?.uriVariables as Record<string, string>)?.id;
                            if (!resourceId || !(resourceId in allAvailableResources)) {
                                throw Error("Please specify id variable as uriVariables.");
                            }

                            if (val === null || val === undefined) {
                                throw new Error("No value provided for availableResourceLevel");
                            }

                            // Type guard and extraction for WoT InteractionInput
                            const newLevel = await extractWoTValue(val);

                            if (typeof newLevel !== "number" || newLevel < 0 || newLevel > 100) {
                                throw new Error(`Invalid level for ${resourceId}: ${newLevel}`);
                            }

                            return { resourceId, newLevel };
                        },
                        {
                            "resource.id": "dynamic",
                            "parsing.operation": "resource_extraction",
                        }
                    );

                    // Calculate level change
                    await logic.withProcessing(
                        "calculate.levelChange",
                        async () => {
                            const currentLevel = allAvailableResources[resourceId];
                            const levelChange = newLevel - currentLevel;
                            return {
                                previous: currentLevel,
                                new: newLevel,
                                change: levelChange,
                                changeType:
                                    levelChange > 0 ? "refill" : levelChange < 0 ? "consumption" : "no_change",
                            };
                        },
                        {
                            "resource.id": resourceId,
                            "calculation.type": "level_change",
                        }
                    );

                    // Update resource level in database
                    await logic.withDatabase("update", "resource_levels", async () => {
                        allAvailableResources[resourceId] = newLevel;
                    });

                    // Check for low resource alerts
                    await logic.withProcessing("business.checkResourceThresholds", async () => {
                        if (newLevel <= 10) {
                            // Emit low resource event
                            await logic.withProcessing("event.lowResource", async () => {
                                const eventData = `Low level of ${resourceId}: ${newLevel}%`;
                                tracedEventHandler("outOfResource", (data: WoT.InteractionInput) =>
                                    thing.emitEvent("outOfResource", data)
                                )(eventData);
                            });
                        }
                    });
                }
            );

            // Action: makeDrink
            tracedThing.setActionHandler(
                "makeDrink",
                "makeDrink",
                async (logic: TracedBusinessLogic, params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => {
                    // Parse parameters with defaults
                        const { drinkId, size, quantity } = await logic.withProcessing(
                            "parsing.extractDrinkParameters",
                            async () => {
                                const uriVars = options?.uriVariables as Record<string, unknown> | undefined;
                                const drinkId = (uriVars?.drinkId as string) ?? "americano";
                                const size = (uriVars?.size as string) ?? "m";
                                const quantity = (uriVars?.quantity as number) ?? 1;
                                return { drinkId, size, quantity };
                            },
                            {
                                "parsing.operation": "drink_parameters",
                                "defaults.applied": true,
                            }
                        );

                        // Load drink recipes and configuration
                        const { drinkRecipes, sizeQuantifiers } = await logic.withDatabase(
                            "select",
                            "recipes",
                            async () => {
                                // Define recipes and quantifiers (would come from database in real system)
                                const sizeQuantifiers: Record<string, number> = { s: 0.1, m: 0.2, l: 0.3 };
                                const drinkRecipes: Record<string, Record<string, number>> = {
                                    espresso: { water: 1, milk: 0, chocolate: 0, coffeeBeans: 2 },
                                    americano: { water: 2, milk: 0, chocolate: 0, coffeeBeans: 2 },
                                    cappuccino: { water: 1, milk: 1, chocolate: 0, coffeeBeans: 2 },
                                    latte: { water: 1, milk: 2, chocolate: 0, coffeeBeans: 2 },
                                    hotChocolate: { water: 0, milk: 0, chocolate: 1, coffeeBeans: 0 },
                                    hotWater: { water: 1, milk: 0, chocolate: 0, coffeeBeans: 0 },
                                };
                                return { drinkRecipes, sizeQuantifiers };
                            }
                        );

                        // Validate drink availability
                        await logic.withValidation("drinkAvailability", drinkId, async () => {
                            if (drinkRecipes[drinkId] === undefined) {
                                throw new Error(`Drink ${drinkId} is not available`);
                            }
                            if (sizeQuantifiers[size] === undefined) {
                                throw new Error(`Size ${size} is not valid`);
                            }
                            if (quantity < 1 || quantity > 5) {
                                throw new Error(`Quantity ${quantity} is not valid (must be 1-5)`);
                            }
                        });

                        // Get current resources
                        const currentResources = await logic.withDatabase("select", "resources", async () => {
                            return { ...allAvailableResources };
                        });

                        // Calculate resource consumption
                        const newResources = await logic.withProcessing(
                            "calculate.resourceConsumption",
                            async () => {
                                const newResources = Object.assign({}, currentResources);
                                const recipe = drinkRecipes[drinkId];
                                const sizeMultiplier = sizeQuantifiers[size];

                                newResources.water -= Math.ceil(quantity * sizeMultiplier * recipe.water);
                                newResources.milk -= Math.ceil(quantity * sizeMultiplier * recipe.milk);
                                newResources.chocolate -= Math.ceil(quantity * sizeMultiplier * recipe.chocolate);
                                newResources.coffeeBeans -= Math.ceil(quantity * sizeMultiplier * recipe.coffeeBeans);

                                return newResources;
                            },
                            {
                                "drink.id": drinkId,
                                "drink.size": size,
                                "drink.quantity": quantity,
                                "calculation.type": "resource_consumption",
                            }
                        );

                        // Validate resource availability and emit events if needed
                        await logic.withValidation("resourceAvailability", newResources, async () => {
                            const insufficientResources: string[] = [];
                            for (const [resource, level] of Object.entries(newResources)) {
                                if (typeof level === "number" && level < 0) {
                                    insufficientResources.push(resource);
                                }
                            }

                            if (insufficientResources.length > 0) {
                                // Emit outOfResource event before throwing error
                                await logic.withProcessing("event.outOfResource", async () => {
                                    const eventData = `Insufficient resources: ${insufficientResources.join(", ")} for making ${quantity} ${size} ${drinkId}(s)`;
                                    tracedEventHandler("outOfResource", (data: WoT.InteractionInput) =>
                                        thing.emitEvent("outOfResource", data)
                                    )(eventData);
                                });

                                throw new Error(
                                    `Insufficient ${insufficientResources[0]} for making ${quantity} ${size} ${drinkId}(s)`
                                );
                            }
                        });

                        // Update resources and increment counter
                        await logic.withDatabase("update", "all_resources", async () => {
                            Object.assign(allAvailableResources, newResources);
                            servedCounter += quantity;
                        });

                        // Simulate brewing process
                        await logic.withProcessing(
                            "brewing.process",
                            async () => {
                                // Simulate brewing time
                                await new Promise((resolve) => setTimeout(resolve, 1000));
                                return `Successfully brewed ${quantity} ${size} ${drinkId}(s)`;
                            },
                            {
                                "brewing.drink": drinkId,
                                "brewing.quantity": quantity,
                                "brewing.size": size,
                                "brewing.duration_ms": 1000,
                            }
                        );

                    return {
                        result: true,
                        message: `Enjoy your ${quantity} ${size} ${drinkId}(s)!`,
                    };
                }
            );

            // Action: setSchedule
            tracedThing.setActionHandler("setSchedule", "setSchedule", async (logic: TracedBusinessLogic, params?: WoT.InteractionInput) => {
                // Parse and validate schedule data
                    const scheduleData = await logic.withProcessing(
                        "parsing.extractScheduleData",
                        async () => {
                            if (params === null || params === undefined) {
                                throw new Error("No parameters provided for schedule");
                            }

                            // Type guard and extraction for WoT InteractionInput
                            const rawData = await extractWoTValue(params);

                            const data = rawData as Record<string, unknown>;
                            return {
                                drinkId: (data?.drinkId as string) ?? "americano",
                                size: (data?.size as string) ?? "m",
                                quantity: (data?.quantity as number) ?? 1,
                                time: data?.time as string,
                                mode: data?.mode as string,
                            };
                        },
                        {
                            "parsing.operation": "schedule_extraction",
                        }
                    );

                    // Validate required fields and format
                    await logic.withValidation("scheduleData", scheduleData, async () => {
                        if (
                            typeof scheduleData.time !== "string" ||
                            scheduleData.time.length === 0 ||
                            typeof scheduleData.mode !== "string" ||
                            scheduleData.mode.length === 0
                        ) {
                            throw new Error("Time and mode are required for scheduling");
                        }

                        // Validate time format (HH:MM in 24-hour format)
                        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                        if (!timeRegex.test(scheduleData.time)) {
                            throw new Error(
                                `Invalid time format: ${scheduleData.time}. Expected HH:MM (24-hour format)`
                            );
                        }

                        // Validate mode
                        const validModes = [
                            "once",
                            "everyday",
                            "everyMo",
                            "everyTu",
                            "everyWe",
                            "everyTh",
                            "everyFr",
                            "everySat",
                            "everySun",
                        ];
                        if (!validModes.includes(scheduleData.mode)) {
                            throw new Error(
                                `Invalid mode: ${scheduleData.mode}. Must be one of: ${validModes.join(", ")}`
                            );
                        }
                    });

                    // Add schedule to database
                    await logic.withDatabase("insert", "schedules", async () => {
                        schedules.push(scheduleData);
                    });

                return {
                    result: true,
                    message: `Schedule set for ${scheduleData.time} (${scheduleData.mode})`,
                };
            });

            thing.expose().then(() => {
                console.info(`${(thingDescription as { title: string }).title} ready`);
                console.log("ThingIsReady");
            });
        });
    })
    .catch((e) => {
        console.log(e);
    });
