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

const coap = require("coap");
const hostname = "localhost";
const portNumber = 5683;
const thingName = "coap-calculator-simple";

const fullTDEndpoint = `/${thingName}`;
const resultEndPoint = `/${thingName}/properties/result`;
const lastChangeEndPoint = `/${thingName}/properties/lastChange`;
const additionEndPoint = `/${thingName}/actions/add`;
const subtractionEndPoint = `/${thingName}/actions/subtract`;
const updateEndPoint = `/${thingName}/events/update`;

/****************************************/
/** **** Thing Description Endpoint ******/
/****************************************/

function getThingDescription() {
    // GET request to retrieve thing description
    const getFullTD = coap.request({
        method: "GET",
        host: hostname,
        port: portNumber,
        pathname: fullTDEndpoint,
    });

    getFullTD.on("response", (res) => {
        if (res.code === "2.05") {
            console.log("Thing Description: \n", JSON.parse(res.payload.toString()));
        } else {
            console.error(`Failed to get Thing Description: ${res.code} - ${res.payload.toString()}`);
        }
    });
    getFullTD.end();
}

// /****************************************/
// /*********** Result Endpoint ************/
// /****************************************/

function getResult() {
    // GET request to retrieve the property result
    const getPropertyResult = coap.request({
        method: "GET",
        host: hostname,
        port: portNumber,
        pathname: resultEndPoint,
    });

    getPropertyResult.on("response", (res) => {
        if (res.code === "2.05") {
            console.log("Result:", JSON.parse(res.payload.toString()));
        } else {
            console.error(`Failed to get Property "result": ${res.code} - ${res.payload.toString()}`);
        }
    });

    getPropertyResult.end();
}

/**
 * GET request to observe the property result.
 * Uncomment to test the observe functionality
 */

function observeResultProperty() {
    const observeResult = coap.request({
        method: "GET",
        observe: 0, // Enable observation
        host: hostname,
        port: portNumber,
        pathname: resultEndPoint,
    });

    observeResult.on("response", (res) => {
        res.on("data", function () {
            if (res.code === "2.05") {
                console.log("Observe result property:", JSON.parse(res.payload.toString()));
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        });
    });

    // Start observing
    observeResult.end();
}

/****************************************/
/** ******** lastChange Endpoint *********/
/****************************************/

function getLastChange() {
    // GET request to retrieve the property lastChange
    const getPropertyLastChange = coap.request({
        method: "GET",
        host: hostname,
        port: portNumber,
        pathname: lastChangeEndPoint,
    });
    getPropertyLastChange.on("response", (res) => {
        if (res.code === "2.05") {
            console.log("Last Change:", JSON.parse(res.payload.toString()));
        } else {
            console.error(`Failed to get Property "lastChange": ${res.code} - ${res.payload.toString()}`);
        }
    });

    getPropertyLastChange.end();
}

/**
 * GET request to observe the property lastChange.
 * Uncomment to test the observe functionality
 */

function observeLastChangeProperty() {
    const observeLastChange = coap.request({
        method: "GET",
        observe: 0, // Enable observation
        host: hostname,
        port: portNumber,
        pathname: lastChangeEndPoint,
    });

    observeLastChange.on("response", (res) => {
        res.on("data", function () {
            if (res.code === "2.05") {
                console.log("Observe lastChange property:", JSON.parse(res.payload.toString()));
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        });
    });

    // Start observing
    observeLastChange.end();
}

/****************************************/
/** ********* Addition Endpoint **********/
/****************************************/

function addNumber(numberToAdd) {
    // POST request to perform an action (add)
    const addNumberAction = coap.request({
        method: "POST",
        host: hostname,
        port: portNumber,
        pathname: additionEndPoint,
        headers: {
            "Content-Format": "application/json",
        },
    });

    // Set the payload with the input value
    addNumberAction.write(JSON.stringify(numberToAdd));

    addNumberAction.on("response", (res) => {
        if (res.code === "2.05") {
            console.log("Addition result:", JSON.parse(res.payload.toString()));
        } else {
            console.error(`Failed to call the Action "add": ${res.code} - ${res.payload.toString()}`);
        }
    });
    addNumberAction.end();
}

/****************************************/
/** ******** Subtraction Endpoint ********/
/****************************************/

function subtractNumber(numberToSubtract) {
    // POST request to perform an action (subtract)
    const subtractNumberAction = coap.request({
        method: "POST",
        host: hostname,
        port: portNumber,
        pathname: subtractionEndPoint,
        headers: {
            "Content-Format": "application/json",
        },
    });

    // Set the payload with the input value
    subtractNumberAction.write(JSON.stringify(numberToSubtract));

    subtractNumberAction.on("response", (res) => {
        if (res.code === "2.05") {
            console.log("Subtraction result:", JSON.parse(res.payload.toString()));
        } else {
            console.error(`Failed to call the Action "subtract": ${res.code} - ${res.payload.toString()}`);
        }
    });
    subtractNumberAction.end();
}

/****************************************/
/** ********* Update Endpoint ************/
/****************************************/

/**
 * GET request to observe an event (update).
 * Uncomment to test the update functionality
 */

function observeUpdateEvent() {
    const observeEventChange = coap.request({
        method: "GET",
        observe: 0, // Enable observation
        host: hostname,
        port: portNumber,
        pathname: updateEndPoint,
    });

    observeEventChange.on("response", (res) => {
        res.on("data", function () {
            if (res.code === "2.05") {
                console.log("Observe update event:", JSON.parse(res.payload.toString()));
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        });
    });

    // Start observing
    observeEventChange.end();
}

function runCalculatorInteractions() {
    getThingDescription();
    getResult();
    getLastChange();
    addNumber(3);
    subtractNumber(2);

    // Start the observation of properties and events after 1 second
    setTimeout(() => {
        console.log("\n-------- Start observation --------\n");
        observeResultProperty();
        observeLastChangeProperty();
        observeUpdateEvent();
    }, 1000);

    // Update the property result after 2.5 seconds to test the observation
    setTimeout(() => {
        addNumber(1);
    }, 2500);
}

runCalculatorInteractions();
