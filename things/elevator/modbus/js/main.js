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

const { ServerTCP } = require("modbus-serial");
const fs = require("fs");
const path = require("path");
const { JsonPlaceholderReplacer } = require("json-placeholder-replacer");
const { parseArgs } = require("node:util");
require("dotenv").config();

// Import OpenTelemetry tracing
const { initTracing, traceMessage, traceOperation, traceAsyncOperation } = require("../../../../util/tracing");

const thingName = "modbus-elevator";
// The following is needed since the modbus library we use does not support localhost but does support 0.0.0.0
const hostname = process.env.HOSTNAME
    ? process.env.HOSTNAME === "localhost"
        ? "0.0.0.0"
        : process.env.HOSTNAME
    : "0.0.0.0";
let portNumber = process.env.PORT ?? "8502";
const thingUnitID = 1;

// Initialize OpenTelemetry tracing
initTracing(thingName);

const {
    values: { port, isTestRun },
} = parseArgs({
    options: {
        port: {
            type: "string",
            short: "p",
        },
        isTestRun: {
            type: "boolean",
            short: "t",
            default: false,
        },
    },
});

if (port && !isNaN(parseInt(port))) {
    portNumber = parseInt(port);
}

const tmPath = process.env.TM_PATH;

if (process.platform === "win32") {
    tmPath.split(path.sep).join(path.win32.sep);
}

const thingModel = JSON.parse(fs.readFileSync(path.join(__dirname, tmPath)));

const placeholderReplacer = new JsonPlaceholderReplacer();
placeholderReplacer.addVariableMap({
    PROTOCOL: "modbus+tcp",
    THING_NAME: thingName,
    HOSTNAME: hostname,
    PORT_NUMBER: portNumber,
    UNIT_ID: thingUnitID,
});
const thingDescription = placeholderReplacer.replace(thingModel);
thingDescription["@type"] = "Thing";

const coils = new Array(9999);
const discreteInputs = new Array(9999);
const holdingRegisters = new Array(9999);

coils[0] = 0;

const lightSwitchForms = [
    {
        href: `modbus+tcp://0.0.0.0:8502/1/1?quantity=1`,
        op: "readproperty",
        "modv:entity": "Coil",
        "modv:function": "readCoil",
        contentType: "application/octet-stream",
    },
    {
        href: `modbus+tcp://0.0.0.0:8502/1/1?quantity=1`,
        op: "writeproperty",
        "modv:entity": "Coil",
        "modv:function": "writeSingleCoil",
        contentType: "application/octet-stream",
    },
];

thingDescription.properties.lightSwitch.forms = lightSwitchForms;

const onTheMoveAddress = 0;
const onTheMovePollingTime = 1000;

const onTheMoveForms = [
    {
        href: `modbus+tcp://0.0.0.0:8502/1/10001?quantity=1`,
        op: ["readproperty", "observeproperty"],
        "modv:entity": "DiscreteInput",
        "modv:function": "readDiscreteInput",
        "modv:pollingTime": onTheMovePollingTime,
        contentType: "application/octet-stream",
    },
];

discreteInputs[0] = 0;
let onTheMoveIsPolled = false;
thingDescription.properties.onTheMove.forms = onTheMoveForms;

const floorNumberForms = [
    {
        href: `modbus+tcp://0.0.0.0:8502/1/40001?quantity=2`,
        op: "readproperty",
        "modv:entity": "HoldingRegister",
        "modv:function": "readHoldingRegisters",
        contentType: "application/octet-stream",
    },
    {
        href: `modbus+tcp://0.0.0.0:8502/1/40001?quantity=2`,
        op: "writeproperty",
        "modv:entity": "HoldingRegister",
        "modv:function": "writeSingleHoldingRegister",
        contentType: "application/octet-stream",
    },
];

const floorNumberAddress = 0;
const floorNumberQuantity = 2;

const getFloorNumberValue = () => {
    return holdingRegisters
        .slice(floorNumberAddress, floorNumberAddress + floorNumberQuantity)
        .reduce((sum, e) => sum + e);
};

holdingRegisters[0] = 0;
const minFloorNumber = 0;
const maxFloorNumber = 15;
thingDescription.properties.floorNumber.forms = floorNumberForms;

fs.writeFile(`${thingName}.td.json`, JSON.stringify(thingDescription, 4, 4), "utf-8", function () {});

const coilMemoryRange = [1, 9999];
const discreteInputMemoryRange = [10001, 19999];
// const inputRegisterMemoryRange = [30001, 39999]
const holdingRegisterMemoryRange = [40001, 49999];

const isAddressInRange = (address, range) => {
    return address >= range[0] && address <= range[1];
};

const getNormalizedAddress = (address, range) => {
    return address - range[0];
};

const vector = {
    getDiscreteInput: function (addr, unitID) {
        return traceOperation(
            "getDiscreteInput",
            () => {
                if (thingUnitID === unitID) {
                    if (!isAddressInRange(addr, discreteInputMemoryRange)) {
                        console.log(`Address is out of discrete input memory range.`);
                        return;
                    }

                    console.log(`Reading discrete input @${addr}`);
                    const normalizedAddress = getNormalizedAddress(addr, discreteInputMemoryRange);

                    if (normalizedAddress === onTheMoveAddress) {
                        if (onTheMoveIsPolled) {
                            console.log(
                                `Polling onTheMove too frequently. You should poll it every ${onTheMovePollingTime} ms.`
                            );
                            return;
                        }

                        onTheMoveIsPolled = true;
                        let returnValue;

                        if (isTestRun) {
                            onTheMoveIsPolled = false;
                            returnValue = discreteInputs[normalizedAddress];
                            discreteInputs[normalizedAddress] = 0;
                        } else {
                            setTimeout(function () {
                                onTheMoveIsPolled = false;
                            }, onTheMovePollingTime);

                            returnValue = discreteInputs[normalizedAddress];
                        }

                        // Add tracing for onTheMove property read
                        traceMessage("Property read: onTheMove", {
                            affordance: "property",
                            affordanceName: "onTheMove",
                            op: "readproperty",
                            value: returnValue,
                            address: addr,
                            normalizedAddress: normalizedAddress,
                        });

                        return returnValue;
                    }
                }
            },
            {
                affordance: "property",
                affordanceName: "onTheMove",
                operation: "getDiscreteInput",
                address: addr,
                unitID: unitID,
            }
        );
    },
    getHoldingRegister: function (addr, unitID, callback) {
        return traceOperation(
            "getHoldingRegister",
            () => {
                if (thingUnitID === unitID) {
                    if (!isAddressInRange(addr, holdingRegisterMemoryRange)) {
                        console.log(`Address is out of holding register memory range.`);
                        return;
                    }

                    const normalizedAddress = getNormalizedAddress(addr, holdingRegisterMemoryRange);

                    setTimeout(function () {
                        const value = holdingRegisters[normalizedAddress];

                        // Add tracing for floorNumber property read
                        if (
                            normalizedAddress >= floorNumberAddress &&
                            normalizedAddress < floorNumberAddress + floorNumberQuantity
                        ) {
                            traceMessage("Property read: floorNumber", {
                                affordance: "property",
                                affordanceName: "floorNumber",
                                op: "readproperty",
                                value: value,
                                address: addr,
                                normalizedAddress: normalizedAddress,
                                registerIndex: normalizedAddress - floorNumberAddress,
                            });
                        }

                        callback(null, value);
                    }, 10);
                }
            },
            {
                affordance: "property",
                affordanceName: "floorNumber",
                operation: "getHoldingRegister",
                address: addr,
                unitID: unitID,
            }
        );
    },
    getCoil: function (addr, unitID) {
        return traceOperation(
            "getCoil",
            () => {
                if (thingUnitID === unitID) {
                    if (!isAddressInRange(addr, coilMemoryRange)) {
                        console.log(`Address is out of coil memory range.`);
                        return;
                    }

                    return new Promise(function (resolve) {
                        console.log(`Reading coil @${addr}`);
                        const normalizedAddress = getNormalizedAddress(addr, coilMemoryRange);
                        const value = coils[normalizedAddress];

                        // Add tracing for lightSwitch property read
                        traceMessage("Property read: lightSwitch", {
                            affordance: "property",
                            affordanceName: "lightSwitch",
                            op: "readproperty",
                            value: value,
                            address: addr,
                            normalizedAddress: normalizedAddress,
                        });

                        resolve(value);
                    });
                }
            },
            {
                affordance: "property",
                affordanceName: "lightSwitch",
                operation: "getCoil",
                address: addr,
                unitID: unitID,
            }
        );
    },
    setRegister: function (addr, value, unitID) {
        return traceOperation(
            "setRegister",
            () => {
                if (thingUnitID === unitID) {
                    if (!isAddressInRange(addr, holdingRegisterMemoryRange)) {
                        console.log(`Address is out of holding register memory range.`);
                        return;
                    }

                    console.log(`Setting register @${addr} to ${value}`);
                    const normalizedAddress = getNormalizedAddress(addr, holdingRegisterMemoryRange);
                    // trying to change floor number
                    holdingRegisters[normalizedAddress] = value;

                    // writing last part of the value and running the thing logic
                    if (normalizedAddress === floorNumberAddress + floorNumberQuantity - 1) {
                        // elevator is on the move
                        if (discreteInputs[onTheMoveAddress] && !isTestRun) {
                            console.log("Elevator is on the move, cannot change the floor number");

                            traceMessage("Property write failed: floorNumber - elevator moving", {
                                affordance: "property",
                                affordanceName: "floorNumber",
                                op: "writeproperty",
                                result: false,
                                reason: "elevator_moving",
                                requestedValue: value,
                                currentFloor: getFloorNumberValue(),
                            });

                            return -1;
                        }

                        const floorNumberValue = getFloorNumberValue();
                        if (floorNumberValue < minFloorNumber) {
                            console.log(`Floor number should not be under ${minFloorNumber}`);

                            traceMessage("Property write failed: floorNumber - below minimum", {
                                affordance: "property",
                                affordanceName: "floorNumber",
                                op: "writeproperty",
                                result: false,
                                reason: "below_minimum",
                                requestedValue: floorNumberValue,
                                minimum: minFloorNumber,
                            });

                            return -1;
                        }

                        if (floorNumberValue > maxFloorNumber) {
                            console.log(`Floor number should not be above ${maxFloorNumber}`);

                            traceMessage("Property write failed: floorNumber - above maximum", {
                                affordance: "property",
                                affordanceName: "floorNumber",
                                op: "writeproperty",
                                result: false,
                                reason: "above_maximum",
                                requestedValue: floorNumberValue,
                                maximum: maxFloorNumber,
                            });

                            return -1;
                        }

                        console.log(`Changing the floor number to ${value}`);

                        // Add tracing for successful floor change
                        traceMessage("Property write: floorNumber", {
                            affordance: "property",
                            affordanceName: "floorNumber",
                            op: "writeproperty",
                            result: true,
                            value: floorNumberValue,
                            address: addr,
                            normalizedAddress: normalizedAddress,
                        });

                        // simulating elevator movement
                        discreteInputs[onTheMoveAddress] = 1;

                        // Add tracing for elevator movement start
                        traceMessage("Elevator movement started", {
                            affordance: "property",
                            affordanceName: "onTheMove",
                            op: "writeproperty",
                            value: true,
                            fromFloor: getFloorNumberValue(),
                            duration: 5000,
                        });

                        // elevator completes its movement in 5 seconds
                        if (!isTestRun) {
                            setTimeout(() => {
                                discreteInputs[onTheMoveAddress] = 0;

                                // Add tracing for elevator movement completion
                                traceMessage("Elevator movement completed", {
                                    affordance: "property",
                                    affordanceName: "onTheMove",
                                    op: "writeproperty",
                                    value: false,
                                    toFloor: getFloorNumberValue(),
                                });
                            }, 5000);
                        }
                    }
                }
            },
            {
                affordance: "property",
                affordanceName: "floorNumber",
                operation: "setRegister",
                address: addr,
                value: value,
                unitID: unitID,
            }
        );
    },
    setCoil: function (addr, value, unitID) {
        return traceOperation(
            "setCoil",
            () => {
                if (thingUnitID === unitID) {
                    if (!isAddressInRange(addr, coilMemoryRange)) {
                        console.log(`Address is out of coil memory range.`);
                        return;
                    }

                    const normalizedAddress = getNormalizedAddress(addr, coilMemoryRange);

                    console.log(`Setting coil @${addr} to ${value}`);
                    coils[normalizedAddress] = value;

                    // Add tracing for lightSwitch property write
                    traceMessage("Property write: lightSwitch", {
                        affordance: "property",
                        affordanceName: "lightSwitch",
                        op: "writeproperty",
                        value: value,
                        address: addr,
                        normalizedAddress: normalizedAddress,
                    });
                }
            },
            {
                affordance: "property",
                affordanceName: "lightSwitch",
                operation: "setCoil",
                address: addr,
                value: value,
                unitID: unitID,
            }
        );
    },
};

// set the server to answer for modbus requests
console.log(`Started listening to on port ${portNumber}`);
console.log("ThingIsReady");

// Add tracing for server startup
traceMessage("Modbus server started", {
    affordance: "server",
    operation: "startup",
    hostname: hostname,
    port: portNumber,
    unitID: thingUnitID,
});

const serverTCP = new ServerTCP(vector, {
    host: hostname,
    port: portNumber,
    debug: true,
    unitID: thingUnitID,
});

serverTCP.on("socketError", function (err) {
    // Handle socket error if needed, can be ignored
    console.error(err);

    // Add tracing for socket errors
    traceMessage("Modbus socket error", {
        affordance: "server",
        operation: "socketError",
        error: err.message,
        hostname: hostname,
        port: portNumber,
    });
});
