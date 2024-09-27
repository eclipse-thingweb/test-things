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

import chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { Servient } from "@node-wot/core";
import { HttpClientFactory } from "@node-wot/binding-http";
import { port } from "./fixtures";

chai.use(chaiAsPromised);
const expect = chai.expect;

const servient = new Servient();
servient.addClientFactory(new HttpClientFactory());

let thing: WoT.ConsumedThing;

const readProperty = async (
    thing: WoT.ConsumedThing,
    name: string
): Promise<WoT.DataSchemaValue> => {
    try {
        const res = await thing.readProperty(name);
        const value = await res.value();
        return value;
    } catch (error) {
        console.error(`Error: ${error}`);
        return null;
    }
};

describe("Client Tests", () => {
    before(async () => {
        try {
            const WoT = await servient.start();
            const td: WoT.ThingDescription = await WoT.requestThingDescription(
                `http://localhost:${port}/http-data-schema-thing`
            );
            thing = await WoT.consume(td);
        } catch (error) {
            console.error(error);
        }
    });

    after(async () => {
        await servient.shutdown();
    });

    describe("bool property", () => {
        it("should read property bool", async () => {
            const value = await readProperty(thing, "bool");
            expect(value).to.be.false;
        });

        it("should write value true", async () => {
            await thing.writeProperty("bool", true);
            const value = await readProperty(thing, "bool");
            expect(value).to.be.true;
        });

        it("should write value false", async () => {
            await thing.writeProperty("bool", false);
            const value = await readProperty(thing, "bool");
            expect(value).to.be.false;
        });

        it("should fail to write string value 'true'", async () => {
            await expect(thing.writeProperty("bool", "true")).to.be.rejected;
        });
    });

    describe("int property", () => {
        it("should read property int", async () => {
            const value = await readProperty(thing, "int");
            expect(value).to.be.equal(42);
        });

        it("should write value 4711", async () => {
            const intValue = 4711;
            await thing.writeProperty("int", intValue);
            const value = await readProperty(thing, "int");
            expect(value).to.be.equal(intValue);
        });

        it("should fail to write value 3.1415", async () => {
            const intValue = 3.1415;
            await expect(thing.writeProperty("int", intValue)).to.be.rejected;
        });

        it("should fail to write string value 'Pi'", async () => {
            const intValue = "Pi";
            await expect(thing.writeProperty("int", intValue)).to.be.rejected;
        });
    });

    describe("num property", () => {
        it("should read property num", async () => {
            const value = await readProperty(thing, "num");
            expect(value).to.be.equal(3.14);
        });

        it("should write value 4711", async () => {
            const numValue = 4711;
            await thing.writeProperty("num", numValue);
            const value = await readProperty(thing, "num");
            expect(value).to.be.equal(numValue);
        });

        it("should write value  3.1415", async () => {
            const numValue = 3.1415;
            await thing.writeProperty("num", numValue);
            const value = await readProperty(thing, "num");
            expect(value).to.be.equal(numValue);
        });

        it("should fail to write string value 'Pi'", async () => {
            const numValue = "Pi";
            expect(thing.writeProperty("num", numValue)).to.be.rejected;
        });
    });

    describe("string property", () => {
        it("should read property string", async () => {
            const value = await readProperty(thing, "string");
            expect(value).to.be.equal("unset");
        });

        it("should write value 'testclient'", async () => {
            const stringValue = "testclient";
            await thing.writeProperty("string", stringValue);
            const value = await readProperty(thing, "string");
            expect(value).to.be.equal(stringValue);
        });

        it("should fail to write value 13", async () => {
            const stringValue = 13;
            await expect(thing.writeProperty("string", stringValue)).to.be
                .rejected;
        });

        it("should fail to write value null", async () => {
            const stringValue = null;
            await expect(thing.writeProperty("string", stringValue)).to.be
                .rejected;
        });
    });

    describe("array property", () => {
        it("should read property array", async () => {
            const value = await readProperty(thing, "array");
            expect(value).to.be.eql([2, "unset"]);
        });

        it("should write value [23, 'illuminated']", async () => {
            const arrayValue = [23, "illuminated"];
            await thing.writeProperty("array", arrayValue);
            const value = await readProperty(thing, "array");
            expect(value).to.be.eql(arrayValue);
        });

        it("should fail to write object value", async () => {
            const arrayValue = { id: 24, name: "dark" };
            expect(thing.writeProperty("array", arrayValue)).to.be.rejected;
        });

        it("should fail to write value null", async () => {
            const arrayValue = null;
            await expect(thing.writeProperty("array", arrayValue)).to.be
                .rejected;
        });
    });

    describe("object property", () => {
        it("should read property object", async () => {
            const value = await readProperty(thing, "object");
            expect(value).to.be.eql({ id: 123, name: "abc" });
        });

        it("should write value { id: 23, name: 'illuminated' }", async () => {
            const objectValue = { id: 23, name: "illuminated" };
            await thing.writeProperty("object", objectValue);
            const value = await readProperty(thing, "object");
            expect(value).to.be.eql(objectValue);
        });

        it("should fail to write value null", async () => {
            const objectValue = null;
            await expect(thing.writeProperty("object", objectValue)).to.be
                .rejected;
        });

        it("should fail to write array value", async () => {
            const objectValue = [24, "dark"];
            await expect(thing.writeProperty("object", objectValue)).to.be
                .rejected;
        });
    });
});
