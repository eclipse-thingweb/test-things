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

import WoT from "wot-typescript-definitions";
import fs from "fs";
import path from "path";
import { parseArgs } from "node:util";
import { JsonPlaceholderReplacer } from "json-placeholder-replacer";
import { Servient } from "@node-wot/core";
import { HttpServer } from "@node-wot/binding-http";
import { createLogger, transports, format } from "winston";
import LokiTransport from "winston-loki";
import dotenv from "dotenv";
dotenv.config();

const hostname = process.env.HOSTNAME ?? "localhost";
let portNumber =
    process.env.PORT != null && process.env.PORT !== ""
        ? parseInt(process.env.PORT)
        : 3000;
const thingName = "http-data-schema-thing";

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

function checkPropertyWrite(expected: string, actual: unknown) {
    const output = "Property " + expected + " written with " + actual;
    if (expected === actual) {
        console.info("PASS: " + output);
    } else {
        throw new Error("FAIL: " + output);
    }
}

function checkActionInvocation(
    name: string,
    expected: string,
    actual: unknown,
) {
    const output = "Action " + name + " invoked with " + actual;
    if (expected === actual) {
        console.info("PASS: " + output);
    } else {
        throw new Error("FAIL: " + output);
    }
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
    thingModel = JSON.parse(
        fs.readFileSync(path.join(__dirname, tmPath)).toString(),
    );
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

// init property values
let bool: boolean;

const setBool = (value: boolean) => {
    bool = value;
    logger.info({
        message: `${bool}`,
        labels: {
            affordance: "property",
            affordanceName: "bool",
            messageType: "updateProperty",
        },
    });
};

setBool(false);

let int: number;

const setInt = (value: number) => {
    int = value;
    logger.info({
        message: `${int}`,
        labels: {
            affordance: "property",
            affordanceName: "int",
            messageType: "updateProperty",
        },
    });
};

setInt(42);

let num: number;

const setNum = (value: number) => {
    num = value;
    logger.info({
        message: `${num}`,
        labels: {
            affordance: "property",
            affordanceName: "num",
            messageType: "updateProperty",
        },
    });
};

setNum(3.14);

let string: string;

const setString = (value: string) => {
    string = value;
    logger.info({
        message: `${string}`,
        labels: {
            affordance: "property",
            affordanceName: "string",
            messageType: "updateProperty",
        },
    });
};

setString("unset");

let array: unknown[];

const setArray = (value: unknown[]) => {
    array = value;
    logger.info({
        message: `${array}`,
        labels: {
            affordance: "property",
            affordanceName: "array",
            messageType: "updateProperty",
        },
    });
};

setArray([2, "unset"]);

let object: Record<string, unknown>;

const setObject = (value: Record<string, unknown>) => {
    object = value;
    logger.info({
        message: `${JSON.stringify(object)}`,
        labels: {
            affordance: "property",
            affordanceName: "object",
            messageType: "updateProperty",
        },
    });
};

setObject({ id: 123, name: "abc" });

const servient = new Servient();
servient.addServer(
    new HttpServer({
        baseUri: `http://${hostname}:${portNumber}`,
        port: portNumber,
    }),
);

servient.start().then((WoT) => {
    WoT.produce(thingDescription)
        .then((thing: WoT.ExposedThing) => {
            console.log("Produced " + thing.getThingDescription().title);

            // set property read/write handlers
            thing
                .setPropertyWriteHandler("bool", async (value) => {
                    const localBool = await value.value();
                    checkPropertyWrite("boolean", typeof localBool);
                    setBool(localBool as boolean);
                    thing.emitEvent("on-bool", bool);
                })
                .setPropertyReadHandler("bool", async () => bool)
                .setPropertyWriteHandler("int", async (value) => {
                    const localInt = await value.value();
                    if (localInt === Math.floor(localInt as number)) {
                        checkPropertyWrite("integer", "integer");
                    } else {
                        checkPropertyWrite("integer", typeof value);
                    }
                    setInt(localInt as number);
                    thing.emitEvent("on-int", int);
                })
                .setPropertyReadHandler("int", async () => int)
                .setPropertyWriteHandler("num", async (value) => {
                    const localNum = await value.value();
                    checkPropertyWrite("number", typeof localNum);
                    setNum(localNum as number);
                    thing.emitEvent("on-num", num);
                })
                .setPropertyReadHandler("num", async () => num)
                .setPropertyWriteHandler("string", async (value) => {
                    const localString = await value.value();
                    checkPropertyWrite("string", typeof localString);
                    setString(localString as string);
                    thing.emitEvent("on-string", string);
                })
                .setPropertyReadHandler("string", async () => string)
                .setPropertyWriteHandler("array", async (value) => {
                    const localArray = await value.value();
                    if (Array.isArray(localArray)) {
                        checkPropertyWrite("array", "array");
                    } else {
                        checkPropertyWrite("array", typeof localArray);
                    }
                    setArray(localArray as unknown[]);
                    thing.emitEvent("on-array", array);
                })
                .setPropertyReadHandler("array", async () => array)
                .setPropertyWriteHandler("object", async (value) => {
                    const localObject = await value.value();
                    if (Array.isArray(localObject)) {
                        checkPropertyWrite("object", "array");
                    } else {
                        checkPropertyWrite("object", typeof localObject);
                    }
                    setObject(localObject as Record<string, unknown>);
                    thing.emitEvent("on-object", object);
                })
                .setPropertyReadHandler("object", async () => object);

            // set action handlers
            thing
                .setActionHandler("void-void", async (parameters) => {
                    logger.info({
                        message: "Action invoked.",
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "void-void",
                        },
                    });
                    checkActionInvocation(
                        "void-void",
                        "undefined",
                        typeof (await parameters.value()),
                    );
                    return undefined;
                })
                .setActionHandler("void-int", async (parameters) => {
                    const value = 0;
                    logger.info({
                        message: "Action invoked.",
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "void-int",
                        },
                    });
                    checkActionInvocation(
                        "void-int",
                        "undefined",
                        typeof (await parameters.value()),
                    );
                    logger.info({
                        message: `${value}`,
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "void-int",
                            messageType: "actionOutput",
                        },
                    });
                    return value;
                })
                .setActionHandler("int-void", async (parameters) => {
                    const localParameters = await parameters.value();
                    logger.info({
                        message: "Action invoked.",
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "int-void",
                        },
                    });
                    logger.info({
                        message: `${localParameters}`,
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "int-void",
                            messageType: "actionInput",
                        },
                    });
                    if (
                        localParameters ===
                        Math.floor(localParameters as number)
                    ) {
                        checkActionInvocation("int-void", "integer", "integer");
                    } else {
                        checkActionInvocation(
                            "int-void",
                            "integer",
                            typeof parameters,
                        );
                    }
                    return undefined;
                })
                .setActionHandler("int-int", async (parameters) => {
                    const localParameters = await parameters.value();
                    logger.info({
                        message: "Action invoked.",
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "int-int",
                        },
                    });
                    logger.info({
                        message: `${localParameters}`,
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "int-int",
                            messageType: "actionInput",
                        },
                    });
                    if (
                        localParameters ===
                        Math.floor(localParameters as number)
                    ) {
                        checkActionInvocation("int-int", "integer", "integer");
                    } else {
                        checkActionInvocation(
                            "int-int",
                            "integer",
                            typeof localParameters,
                        );
                    }
                    const value = (localParameters as number) + 1;
                    logger.info({
                        message: `${value}`,
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "int-int",
                            messageType: "actionOutput",
                        },
                    });
                    return value;
                })
                .setActionHandler("int-string", async (parameters) => {
                    const localParameters = await parameters.value();
                    const inputtype = typeof localParameters;
                    logger.info({
                        message: "Action invoked.",
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "int-string",
                        },
                    });
                    logger.info({
                        message: `${localParameters}`,
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "int-string",
                            messageType: "actionInput",
                        },
                    });
                    if (
                        localParameters ===
                        Math.floor(localParameters as number)
                    ) {
                        checkActionInvocation(
                            "int-string",
                            "integer",
                            "integer",
                        );
                    } else {
                        checkActionInvocation(
                            "int-string",
                            "integer",
                            typeof localParameters,
                        );
                    }

                    let value: string;
                    if (inputtype === "number") {
                        // eslint-disable-next-line no-new-wrappers
                        value = new String(localParameters)
                            .replace(/0/g, "zero-")
                            .replace(/1/g, "one-")
                            .replace(/2/g, "two-")
                            .replace(/3/g, "three-")
                            .replace(/4/g, "four-")
                            .replace(/5/g, "five-")
                            .replace(/6/g, "six-")
                            .replace(/7/g, "seven-")
                            .replace(/8/g, "eight-")
                            .replace(/9/g, "nine-");
                    } else {
                        throw new Error("ERROR");
                    }
                    logger.info({
                        message: `${value}`,
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "int-string",
                            messageType: "actionOutput",
                        },
                    });
                    return value;
                })
                .setActionHandler("void-obj", async (parameters) => {
                    logger.info({
                        message: "Action invoked.",
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "void-obj",
                        },
                    });
                    checkActionInvocation(
                        "void-complex",
                        "undefined",
                        typeof (await parameters.value()),
                    );
                    const value = { prop1: 123, prop2: "abc" };
                    logger.info({
                        message: `${JSON.stringify(value)}`,
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "void-obj",
                            messageType: "actionOutput",
                        },
                    });
                    return value;
                })
                .setActionHandler("obj-void", async (parameters) => {
                    const localParameters = await parameters.value();
                    logger.info({
                        message: "Action invoked.",
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "obj-void",
                        },
                    });
                    logger.info({
                        message: `${JSON.stringify(localParameters)}`,
                        labels: {
                            affordance: "action",
                            op: "invokeaction",
                            affordanceName: "obj-void",
                            messageType: "actionInput",
                        },
                    });
                    checkActionInvocation(
                        "complex-void",
                        "object",
                        typeof (await parameters.value()),
                    );
                    return undefined;
                });

            // expose the thing
            thing.expose().then(async () => {
                console.info(thing.getThingDescription().title + " ready");
                console.log("ThingIsReady");
            });
        })
        .catch((e: Error) => {
            console.log(e);
        });
});
