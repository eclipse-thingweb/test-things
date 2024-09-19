
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

import WoT = require("wot-typescript-definitions")

const fs = require("fs")
const path = require("path")
const { parseArgs } = require("node:util")
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
require("dotenv").config()

const WotCore = require("@node-wot/core");
const HttpServer = require("@node-wot/binding-http").HttpServer

const hostname = process.env.HOSTNAME ?? "localhost";
let portNumber = process.env.PORT ?? 3000;
const thingName = "http-data-schema-thing";


function checkPropertyWrite(expected: string, actual: unknown) {
    const output = "Property " + expected + " written with " + actual;
    if (expected === actual) {  
        console.info("PASS: " + output);
    } else {
        throw new Error("FAIL: " + output);
    }
}

function checkActionInvocation(name: string, expected: string, actual: unknown) {
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
  
  if (port && !isNaN(parseInt(port))) {
    portNumber = parseInt(port);
  }
  
  const tmPath = process.env.TM_PATH;
  
  if (process.platform === "win32") {
    tmPath?.split(path.sep).join(path.win32.sep);
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


// init property values
let bool = false;
let int = 42;
let num = 3.14;
let string = "unset";
let array: unknown[] = [2, "unset"];
let object: Record<string, unknown> = { id: 123, name: "abc" };

let servient = new WotCore.Servient();
servient.addServer(new HttpServer({ 
    baseUri: `http://${hostname}:${portNumber}`,
    port: portNumber, 
}));

servient.start()
    .then((WoT: any) => {
        WoT.produce(thingDescription)
            .then((thing: WoT.ExposedThing) => {
                console.log("Produced " + thing.getThingDescription().title);

                // set property read/write handlers
                thing
                    .setPropertyWriteHandler("bool", async (value) => {
                        const localBool = await value.value();
                        checkPropertyWrite("boolean", typeof localBool);
                        bool = localBool as boolean;
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
                        int = localInt as number;
                        thing.emitEvent("on-int", int);
                    })
                    .setPropertyReadHandler("int", async () => int)
                    .setPropertyWriteHandler("num", async (value) => {
                        const localNum = await value.value();
                        checkPropertyWrite("number", typeof localNum);
                        num = localNum as number;
                        thing.emitEvent("on-num", num);
                    })
                    .setPropertyReadHandler("num", async () => num)
                    .setPropertyWriteHandler("string", async (value) => {
                        const localString = await value.value();
                        checkPropertyWrite("string", typeof localString);
                        string = localString as string;
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
                        array = localArray as unknown[];
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
                        object = localObject as Record<string, unknown>;
                        thing.emitEvent("on-object", object);
                    })
                    .setPropertyReadHandler("object", async () => object);

                // set action handlers
                thing
                    .setActionHandler("void-void", async (parameters) => {
                        checkActionInvocation("void-void", "undefined", typeof (await parameters.value()));
                        return undefined;
                    })
                    .setActionHandler("void-int", async (parameters) => {
                        checkActionInvocation("void-int", "undefined", typeof (await parameters.value()));
                        return 0;
                    })
                    .setActionHandler("int-void", async (parameters) => {
                        const localParameters = await parameters.value();
                        if (localParameters === Math.floor(localParameters as number)) {
                            checkActionInvocation("int-void", "integer", "integer");
                        } else {
                            checkActionInvocation("int-void", "integer", typeof parameters);
                        }
                        return undefined;
                    })
                    .setActionHandler("int-int", async (parameters) => {
                        const localParameters = await parameters.value();
                        if (localParameters === Math.floor(localParameters as number)) {
                            checkActionInvocation("int-int", "integer", "integer");
                        } else {
                            checkActionInvocation("int-int", "integer", typeof localParameters);
                        }
                        return (localParameters as number) + 1;
                    })
                    .setActionHandler("int-string", async (parameters) => {
                        const localParameters = await parameters.value();
                        const inputtype = typeof localParameters;
                        if (localParameters === Math.floor(localParameters as number)) {
                            checkActionInvocation("int-string", "integer", "integer");
                        } else {
                            checkActionInvocation("int-string", "integer", typeof localParameters);
                        }

                        if (inputtype === "number") {
                            // eslint-disable-next-line no-new-wrappers
                            return new String(localParameters)
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
                    })
                    .setActionHandler("void-obj", async (parameters) => {
                        checkActionInvocation("void-complex", "undefined", typeof (await parameters.value()));
                        return { prop1: 123, prop2: "abc" };
                    })
                    .setActionHandler("obj-void", async (parameters) => {
                        checkActionInvocation("complex-void", "object", typeof (await parameters.value()));
                        return undefined;
                    });

                // expose the thing
                thing.expose().then(async () => {
                    console.info(thing.getThingDescription().title + " ready");
                    console.log("ThingIsReady");
                });
            })
            .catch((e: Error) => {
                console.log(e)
            })
    })
 