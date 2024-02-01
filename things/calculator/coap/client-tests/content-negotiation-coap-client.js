const coap = require('coap')
const cbor = require('cbor')
const hostname = 'localhost'
const portNumber = 5683
const thingName = 'coap-calculator-content-negotiation'

const fullTDEndpoint = `/${thingName}`,
    resultEndPoint = `/${thingName}/properties/result`,
    lastChangeEndPoint = `/${thingName}/properties/lastChange`,
    additionEndPoint = `/${thingName}/actions/add`,
    subtractionEndPoint = `/${thingName}/actions/subtract`,
    updateEndPoint = `/${thingName}/events/update`



/****************************************/
/****** Thing Description Endpoint ******/
/****************************************/

// GET request to retrieve thing description
function getFullTD() {

    const TDEndpointHeader = {
        "Accept": "application/cbor"
    }
    const getThingDescription = coap.request({
        method: 'GET',
        host: hostname,
        port: portNumber,
        pathname: fullTDEndpoint,
        headers: TDEndpointHeader
    })

    getThingDescription.on('response', (res) => {
        //TODO: Fix the problem with block wise transfer to be able to parse the response accordingly
        if (res.code === '2.05') {
            if (TDEndpointHeader["Accept"] === "application/json") {
                console.log('Thing Description:', JSON.parse(res.payload.toString()))
            }
            else {
                const decodedData = cbor.decode(res.payload);
                console.log('Thing Description: ', JSON.parse(decodedData))
            }

        } else {
            console.error(`Failed to get Thing Description: ${res.code} - ${res.payload.toString()}`)
        }
    })
    getThingDescription.end()
}


/****************************************/
/*********** Result Endpoint ************/
/****************************************/

// GET request to retrieve a property (result)
function getResult() {

    const getPropertyResult = coap.request({
        method: 'GET',
        host: hostname,
        port: portNumber,
        pathname: resultEndPoint,
        headers: {
            "Accept": "application/cbor"
        }
    });

    getPropertyResult.on('response', (res) => {
        const contentType = res.headers["Content-Type"]

        if (res.code === '2.05') {
            if (contentType.includes("application/json")) {
                console.log("Result (json): ", JSON.parse(res.payload.toString()));
            }
            else if (contentType.includes("application/cbor")) {
                const decodedData = cbor.decode(res.payload);
                console.log("Result (cbor): ", decodedData);
            }
            else {
                throw new Error(`Unsupported content type: ${contentType}`);
            }
        } else {
            console.error(`Failed to get Property "result": ${res.code} - ${res.payload.toString()}`)
        }
    })
    getPropertyResult.end()
}

/**
 * GET request to observe the property result.
 * Uncomment to test the update functionality.
 */
function observeResultProperty() {

    const observeResult = coap.request({
        method: 'GET',
        observe: true,
        host: hostname,
        port: portNumber,
        pathname: resultEndPoint,
        headers: {
            "Accept": "application/cbor"
        }
    });

    observeResult.on('response', (res) => {

        res.on('data', function () {
            const contentType = res.headers["Content-Type"]

            if (res.code === '2.05') {
                if (contentType.includes("application/json")) {
                    console.log("Observe result property (json): ", JSON.parse(res.payload.toString()));
                }
                else if (contentType.includes("application/cbor")) {
                    const decodedData = cbor.decode(res.payload);
                    console.log("Observe result property (cbor): ", decodedData);
                }
                else {
                    throw new Error(`Unsupported content type: ${contentType}`);
                }
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        })

    });

    observeResult.end();
}


/****************************************/
/********** lastChange Endpoint *********/
/****************************************/

// GET request to retrieve a property (lastChange)
function getLastChange() {

    const getPropertyLastChange = coap.request({
        method: 'GET',
        host: hostname,
        port: portNumber,
        pathname: lastChangeEndPoint,
        headers: {
            "Accept": "application/json"
        }
    })
    getPropertyLastChange.on('response', (res) => {
        const contentType = res.headers["Content-Type"]

        if (res.code === '2.05') {
            if (contentType.includes("application/json")) {
                console.log("Last Change (json): ", JSON.parse(res.payload.toString()));
            }
            else if (contentType.includes("application/cbor")) {
                const decodedData = cbor.decode(res.payload);
                console.log("Last Change (cbor): ", decodedData);
            }
            else {
                throw new Error(`Unsupported content type: ${contentType}`);
            }
        } else {
            console.error(`Failed to get Property "lastChange": ${res.code} - ${res.payload.toString()}`)
        }
    })
    getPropertyLastChange.end()
}


/**
 * GET request to observe the property result.
 * Uncomment to test the update functionality.
 */
function observeLastChangeProperty() {

    const observeLastChange = coap.request({
        method: 'GET',
        observe: true,
        host: hostname,
        port: portNumber,
        pathname: lastChangeEndPoint,
        headers: {
            "Accept": "application/json"
        }
    });

    observeLastChange.on('response', (res) => {

        res.on('data', function () {
            const contentType = res.headers["Content-Type"]

            if (res.code === '2.05') {
                if (contentType.includes("application/json")) {
                    console.log("Observe lastChange property (json): ", JSON.parse(res.payload.toString()));
                }
                else if (contentType.includes("application/cbor")) {
                    const decodedData = cbor.decode(res.payload);
                    console.log("Observe lastChange property (cbor): ", decodedData);
                }
                else {
                    throw new Error(`Unsupported content type: ${contentType}`);
                }
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        })

    });

    observeLastChange.end();
}



/****************************************/
/*********** Addition Endpoint **********/
/****************************************/

// POST request to perform the addition action
function addNumber() {

    const addNumberReq = coap.request({
        method: 'POST',
        host: hostname,
        port: portNumber,
        pathname: additionEndPoint,
        headers: {
            "Accept": "application/json",
            "Content-Format": "application/cbor"
        }
    });

    // Set the payload with the input value
    const inputAddCBOR = cbor.encode(2)

    addNumberReq.write(inputAddCBOR)

    addNumberReq.on('response', (res) => {
        const contentType = res.headers["Content-Type"]

        if (res.code === '2.05') {
            if (contentType.includes("application/json")) {
                console.log("Addition result (json): ", JSON.parse(res.payload.toString()));
            }
            else if (contentType.includes("application/cbor")) {
                const decodedData = cbor.decode(res.payload);
                console.log("Addition result (cbor): ", decodedData);
            }
            else {
                throw new Error(`Unsupported content type: ${contentType}`);
            }
        } else {
            console.error(`Failed to call the Action "add": ${res.code} - ${res.payload.toString()}`)

        }
    });
    addNumberReq.end();
}



/****************************************/
/********** Subtraction Endpoint ********/
/****************************************/

// POST request to perform the subtract action
function subtractNumber() {

    const subtractNumberReq = coap.request({
        method: 'POST',
        host: hostname,
        port: portNumber,
        pathname: subtractionEndPoint,
        headers: {
            "Accept": "application/cbor",
            "Content-Format": "application/json"
        }
    });

    // Set the payload with the input value
    const inputSubtractJSON = JSON.stringify({ "data": 3 })

    subtractNumberReq.write(inputSubtractJSON)

    subtractNumberReq.on('response', (res) => {
        const contentType = res.headers["Content-Type"]

        if (res.code === '2.05') {
            if (contentType.includes("application/json")) {
                console.log("Subtraction result (json): ", JSON.parse(res.payload.toString()));
            }
            else if (contentType.includes("application/cbor")) {
                const decodedData = cbor.decode(res.payload);
                console.log("Subtraction result (cbor): ", decodedData);
            }
            else {
                throw new Error(`Unsupported content type: ${contentType}`);
            }
        } else {
            console.error(`Failed to call the Action "subtract": ${res.code} - ${res.payload.toString()}`)
        }
    });
    subtractNumberReq.end();
}


/****************************************/
/*********** Update Endpoint ************/
/****************************************/

/**
 * GET request to observe an event (update).
 * Uncomment to test the update functionality.
 */
function observeUpdateEvent() {

    const observeUpdate = coap.request({
        method: 'GET',
        observe: true, // Enable observation
        host: hostname,
        port: portNumber,
        pathname: updateEndPoint,
        headers: {
            "Accept": "application/cbor"
        }
    });

    observeUpdate.on('response', (res) => {

        res.on('data', function () {
            const contentType = res.headers["Content-Type"]

            if (res.code === '2.05') {
                if (contentType.includes("application/json")) {
                    console.log("Observe update event (json): ", JSON.parse(res.payload.toString()));
                }
                else if (contentType.includes("application/cbor")) {
                    const decodedData = cbor.decode(res.payload);
                    console.log("Observe update event (cbor): ", decodedData);
                }
                else {
                    throw new Error(`Unsupported content type: ${contentType}`);
                }
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        })

    });

    // Start observing
    observeUpdate.end();
}


//Test the main functionality of the content-negotiation-calculator-thing
function runCalculatorInteractions() {

    //Main GET and POST requests
    getFullTD()
    getResult()
    getLastChange()
    addNumber()
    subtractNumber()

    //Observation of properties and events after 1 second
    setTimeout(() => {
        console.log("\n-------- Start observation --------\n");
        observeResultProperty()
        observeLastChangeProperty()
        observeUpdateEvent()
    }, 1000)

    //Update the property result after 2.5 seconds to test the observation
    setTimeout(() => {
        addNumber()
    }, 2500)
}

runCalculatorInteractions()