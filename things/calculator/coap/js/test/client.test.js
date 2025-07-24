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

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

const { Servient } = require("@node-wot/core");
const { CoapClientFactory } = require("@node-wot/binding-coap");
const { simplePort, contentNegotiationPort } = require("./fixtures");

chai.use(chaiAsPromised);
const expect = chai.expect;

const servient = new Servient();
servient.addClientFactory(new CoapClientFactory());
let WoT;

const readProperty = async (thing, propertyName) => {
    try {
        const response = await thing.readProperty(propertyName);
        return await response.value();
    } catch (error) {
        console.error(`Error: ${error}`);
    }
};

describe("Client Tests", () => {
    before(async () => {
        try {
            WoT = await servient.start();
        } catch (error) {
            console.error(error);
        }
    });
    after(async () => {
        await servient.shutdown();
    });

    describe("Simple Calculator", () => {
        let thing;

        before(async () => {
            try {
                const td = await WoT.requestThingDescription(`coap://localhost:${simplePort}/coap-calculator-simple`);
                thing = await WoT.consume(td);
            } catch (error) {
                console.error(error);
            }
        });

        describe("result property", () => {
            it("should return initial value", async () => {
                const value = await readProperty(thing, "result");
                expect(value).to.be.equal(0);
            });

            it("should return sum when adding value to the existing result", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToAdd = 12;
                await thing.invokeAction("add", valueToAdd);
                const newResultValue = await readProperty(thing, "result");
                expect(newResultValue).to.be.equal(resultValue + valueToAdd);
            });

            it("should return sum when subtracting value from the existing result", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToSubtract = 3;
                await thing.invokeAction("subtract", valueToSubtract);
                const newResultValue = await readProperty(thing, "result");
                expect(newResultValue).to.be.equal(resultValue - valueToSubtract);
            });
        });

        describe("lastChange property", () => {
            it("should observe a change when the result is changed", async () => {
                setTimeout(async () => {
                    await thing.invokeAction("add", 1);
                }, 200);

                let value;
                const subscription = thing.observeProperty("lastChange", async (response) => {
                    value = await response.value();
                });

                setTimeout(async () => {
                    expect(value).to.be.not.undefined;
                    await subscription.stop();
                });
            });
        });

        describe("add action", () => {
            it("should return sum when adding value to the existing result", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToAdd = 12;
                const response = await thing.invokeAction("add", valueToAdd);
                const actionResultValue = await response.value();
                expect(actionResultValue).to.be.equal(resultValue + valueToAdd);
            });
        });

        describe("subtract action", () => {
            it("should return sum when subtracting value from the existing result", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToSubtract = 3;
                const response = await thing.invokeAction("subtract", valueToSubtract);
                const actionResultValue = await response.value();
                expect(actionResultValue).to.be.equal(resultValue - valueToSubtract);
            });
        });

        describe("update event", () => {
            it("should return the update message when subscribed", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToAdd = 13;

                setTimeout(async () => {
                    await thing.invokeAction("add", valueToAdd);
                }, 200);

                const subscription = await thing.subscribeEvent("update", async (response) => {
                    await expect(response.value).to.have.eventually.be.equal(resultValue + valueToAdd);
                });

                await subscription.stop();
            });
        });
    });

    describe("Content Negotiation Calculator", () => {
        let thing;

        before(async () => {
            try {
                const td = await WoT.requestThingDescription(
                    `coap://localhost:${contentNegotiationPort}/coap-calculator-content-negotiation`
                );
                thing = await WoT.consume(td);
            } catch (error) {
                console.error(error);
            }
        });

        describe("result property", () => {
            it("should return initial value", async () => {
                const value = await readProperty(thing, "result");
                expect(value).to.be.equal(0);
            });

            it("should return sum when adding value to the existing result", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToAdd = 12;
                await thing.invokeAction("add", valueToAdd);
                const newResultValue = await readProperty(thing, "result");
                expect(newResultValue).to.be.equal(resultValue + valueToAdd);
            });

            it("should return sum when subtracting value from the existing result", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToSubtract = 3;
                await thing.invokeAction("subtract", valueToSubtract);
                const newResultValue = await readProperty(thing, "result");
                expect(newResultValue).to.be.equal(resultValue - valueToSubtract);
            });
        });

        describe("lastChange property", () => {
            it("should observe a change when the result is changed", async () => {
                setTimeout(async () => {
                    await thing.invokeAction("add", 1);
                }, 200);

                let value;
                const subscription = thing.observeProperty("lastChange", async (response) => {
                    value = await response.value();
                });

                setTimeout(async () => {
                    expect(value).to.be.not.undefined;
                    await subscription.stop();
                });
            });
        });

        describe("add action", () => {
            it("should return sum when adding value to the existing result", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToAdd = 12;
                const response = await thing.invokeAction("add", valueToAdd);
                const actionResultValue = await response.value();
                expect(actionResultValue).to.be.equal(resultValue + valueToAdd);
            });
        });

        describe("subtract action", () => {
            it("should return sum when subtracting value from the existing result", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToSubtract = 3;
                const response = await thing.invokeAction("subtract", valueToSubtract);
                const actionResultValue = await response.value();
                expect(actionResultValue).to.be.equal(resultValue - valueToSubtract);
            });
        });

        describe("update event", () => {
            it("should return the update message when subscribed", async () => {
                const resultValue = await readProperty(thing, "result");
                const valueToAdd = 13;

                setTimeout(async () => {
                    await thing.invokeAction("add", valueToAdd);
                }, 200);

                const subscription = await thing.subscribeEvent("update", async (response) => {
                    await expect(response.value).to.have.eventually.be.equal(resultValue + valueToAdd);
                });

                await subscription.stop();
            });
        });
    });
});
