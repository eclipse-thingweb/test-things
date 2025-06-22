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

import { Servient } from "@node-wot/core";
import { HttpServer } from "@node-wot/binding-http";
import { createLogger, transports, format } from "winston";
import LokiTransport from "winston-loki";
import dotenv from "dotenv";
import { parseArgs } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";

dotenv.config();

const hostname = process.env.HOSTNAME ?? "localhost";
let portNumber = process.env.PORT != null && process.env.PORT !== "" ? parseInt(process.env.PORT) : 3000;
const thingName = "counter";

const logger = createLogger({
    transports: [
        new LokiTransport({
            host: `http://${process.env.LOKI_HOSTNAME ?? "localhost"}:${process.env.LOKI_PORT ?? "3100"}`,
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

const thingDescription = JSON.parse(fs.readFileSync(path.join(__dirname, "../../counter-thing.tm.json"), "utf8"));

const servient = new Servient();
servient.addServer(
    new HttpServer({
        baseUri: `http://${hostname}:${portNumber}`,
        port: portNumber,
    })
);

servient.start().then((WoT) => {
    WoT.produce(thingDescription as any)
        .then((thing: any) => {
            console.log("Produced " + thing.getThingDescription().title);

            // Set property handlers
            thing.setPropertyReadHandler("count", async () => count);
            thing.setPropertyReadHandler("lastChange", async () => lastChange);
            thing.setPropertyReadHandler("countAsImage", async (options: any) => {
                let fill = "black";
                if (options && typeof options === "object" && "uriVariables" in options) {
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
            thing.setActionHandler("increment", async (params: any, options: any) => {
                let step = 1;
                if (options && typeof options === "object" && "uriVariables" in options) {
                    if (options.uriVariables && "step" in options.uriVariables) {
                        const uriVariables = options.uriVariables;
                        step = uriVariables.step as number;
                    }
                }
                const newValue = count + step;
                logger.info(`Incrementing count from ${count} to ${newValue} (with step ${step})`);
                setCount(newValue);
                thing.emitEvent("change", count);
                thing.emitPropertyChange("count");
                return undefined;
            });

            thing.setActionHandler("decrement", async (params: any, options: any) => {
                let step = 1;
                if (options && typeof options === "object" && "uriVariables" in options) {
                    if (options.uriVariables && "step" in options.uriVariables) {
                        const uriVariables = options.uriVariables;
                        step = uriVariables.step as number;
                    }
                }
                const newValue = count - step;
                logger.info(`Decrementing count from ${count} to ${newValue} (with step ${step})`);
                setCount(newValue);
                thing.emitEvent("change", count);
                thing.emitPropertyChange("count");
                return undefined;
            });

            thing.setActionHandler("reset", async () => {
                logger.info("Resetting count");
                setCount(0);
                thing.emitEvent("change", count);
                thing.emitPropertyChange("count");
                return undefined;
            });

            // Expose the thing
            thing.expose().then(() => {
                logger.info(`${thing.getThingDescription().title} ready`);
            });
        })
        .catch((e) => {
            logger.error(e);
        });
});
