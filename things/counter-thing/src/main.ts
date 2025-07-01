/********************************************************************************
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
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
import { HttpServer } from "@node-wot/binding-http";
import { createLogger, transports, format } from "winston";
import LokiTransport from "winston-loki";
import dotenv from "dotenv";
import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

dotenv.config();

const hostname = process.env.HOSTNAME ?? "localhost";
let portNumber =
    process.env.PORT != null && process.env.PORT !== ""
        ? parseInt(process.env.PORT)
        : 3000;
const thingName = "counter";

const logger = createLogger({
    transports: [
        new LokiTransport({
            host: `${process.env.LOKI_HOSTNAME}:${process.env.LOKI_PORT}`,
            labels: { thing: thingName },
            json: true,
            format: format.json(),
            replaceTimestamp: true,
            onConnectionError: (err: unknown) => console.error(err),
        }),
        new transports.Console({
            format: format.combine(format.simple(), format.colorize()),
        }),
    ],
});

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

// Initialize state
let count = 0;
let lastChange = new Date().toISOString();

const setCount = (value: number) => {
    count = value;
    lastChange = new Date().toISOString();
    logger.info({
        message: `${count}`,
        labels: {
            affordance: "property",
            affordanceName: "count",
            messageType: "updateProperty",
        },
    });
};

const setLastChange = (value: string) => {
    lastChange = value;
    logger.info({
        message: `${lastChange}`,
        labels: {
            affordance: "property",
            affordanceName: "lastChange",
            messageType: "updateProperty",
        },
    });
};

const thingDescription = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../counter-thing.td.json"), "utf8")
);

// Create Servient and add HTTP binding with port configuration
const servient = new Servient();
servient.addServer(
    new HttpServer({
        baseUri: `http://${hostname}:${portNumber}`,
        port: portNumber,
    })
);

const wotHelper = new Helpers(servient);

(async () => {
    try {
        const WoT = await servient.start();

        const thing = await WoT.produce(thingDescription as any);
        console.log("Produced " + thing.getThingDescription().title);

        // Set property handlers
        thing.setPropertyReadHandler("count", async () => count);
        thing.setPropertyReadHandler("lastChange", async () => lastChange);
        thing.setPropertyReadHandler("countAsImage", async (options: any) => {
            let fill = "black";
            if (
                options &&
                typeof options === "object" &&
                "uriVariables" in options
            ) {
                if (options.uriVariables && "fill" in options.uriVariables) {
                    const uriVariables = options.uriVariables;
                    fill = uriVariables.fill as string;
                }
            }
            return (
                "<svg xmlns='http://www.w3.org/2000/svg' height='30' width='200'>" +
                "<text x='0' y='15' fill='" +
                fill +
                "'>" +
                count +
                "</text>" +
                "</svg>"
            );
        });
        thing.setPropertyReadHandler(
            "redDotImage",
            async () =>
                "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
        );

        // Set action handlers
        thing.setActionHandler(
            "increment",
            async (params: any, options: any) => {
                logger.info({
                    message: "Action invoked.",
                    labels: {
                        affordance: "action",
                        op: "invokeaction",
                        affordanceName: "increment",
                    },
                });

                let step = 1;
                if (
                    options &&
                    typeof options === "object" &&
                    "uriVariables" in options
                ) {
                    if (
                        options.uriVariables &&
                        "step" in options.uriVariables
                    ) {
                        const uriVariables = options.uriVariables;
                        step = uriVariables.step as number;
                        logger.info({
                            message: `${step}`,
                            labels: {
                                affordance: "action",
                                op: "invokeaction",
                                affordanceName: "increment",
                                messageType: "actionInput",
                            },
                        });
                    }
                }

                const newValue = count + step;
                setCount(newValue);
                setLastChange(new Date().toISOString());
                thing.emitEvent("change", count);
                thing.emitPropertyChange("count");

                logger.info({
                    message: `Action completed. Count incremented from ${
                        count - step
                    } to ${newValue} (step: ${step})`,
                    labels: {
                        affordance: "action",
                        op: "invokeaction",
                        affordanceName: "increment",
                        messageType: "actionOutput",
                    },
                });

                return undefined;
            }
        );

        thing.setActionHandler(
            "decrement",
            async (params: any, options: any) => {
                logger.info({
                    message: "Action invoked.",
                    labels: {
                        affordance: "action",
                        op: "invokeaction",
                        affordanceName: "decrement",
                    },
                });

                let step = 1;
                if (
                    options &&
                    typeof options === "object" &&
                    "uriVariables" in options
                ) {
                    if (
                        options.uriVariables &&
                        "step" in options.uriVariables
                    ) {
                        const uriVariables = options.uriVariables;
                        step = uriVariables.step as number;
                        logger.info({
                            message: `${step}`,
                            labels: {
                                affordance: "action",
                                op: "invokeaction",
                                affordanceName: "decrement",
                                messageType: "actionInput",
                            },
                        });
                    }
                }

                const newValue = count - step;
                setCount(newValue);
                setLastChange(new Date().toISOString());
                thing.emitEvent("change", count);
                thing.emitPropertyChange("count");

                logger.info({
                    message: `Action completed. Count decremented from ${
                        count + step
                    } to ${newValue} (step: ${step})`,
                    labels: {
                        affordance: "action",
                        op: "invokeaction",
                        affordanceName: "decrement",
                        messageType: "actionOutput",
                    },
                });

                return undefined;
            }
        );

        thing.setActionHandler("reset", async () => {
            logger.info({
                message: "Action invoked.",
                labels: {
                    affordance: "action",
                    op: "invokeaction",
                    affordanceName: "reset",
                },
            });

            const previousValue = count;
            setCount(0);
            setLastChange(new Date().toISOString());
            thing.emitEvent("change", count);
            thing.emitPropertyChange("count");

            logger.info({
                message: `Action completed. Count reset from ${previousValue} to 0`,
                labels: {
                    affordance: "action",
                    op: "invokeaction",
                    affordanceName: "reset",
                    messageType: "actionOutput",
                },
            });

            return undefined;
        });

        // Expose the thing
        await thing.expose();
        logger.info(`${thing.getThingDescription().title} ready`);
    } catch (e) {
        logger.error(e);
    }
})();
