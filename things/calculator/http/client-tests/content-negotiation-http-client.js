/**
 * @file The `content-negotiation-http-client.js` file acts as a client for the content-negotiation-calculator.js.
 * This client is mostly used for testing the content negotiation functionality of the http thing.
 * Requests as well as responses can be sent and received in JSON and CBOR formats.
 */

const cbor = require('cbor')
const EventSource = require('eventsource')

const url = "http://localhost:3000/http-express-calculator-content-negotiation",
    resultEndPoint = "/properties/result",
    resultEndPointObserve = `${resultEndPoint}/observe`,
    lastChangeEndPoint = "/properties/lastChange",
    lastChangeEndPointObserve = `${lastChangeEndPoint}/observe`,
    additionEndPoint = "/actions/add",
    subtractionEndPoint = "/actions/subtract",
    updateEndPoint = "/events/update"


/**
 * Return the Full TD 
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns Thing description as either a String, JSON or CBOR
 */
async function getFullTD(acceptType) {
    let getHeaders = {
        "Accept": ""
    }

    if (acceptType === "json") {
        getHeaders.Accept = "application/json"
    }
    else if (acceptType === "cbor") {
        getHeaders.Accept = "application/cbor"
    } else {
        getHeaders.Accept = acceptType;
    }

    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders
    })

    const contentType = res.headers.get("content-type")

    if (contentType.includes("application/json")) {
        return res.json()
    }
    else if (contentType.includes("application/cbor")) {
        const buffer = await res.arrayBuffer()
        const decodedData = cbor.decode(buffer);
        return decodedData
    }
    else {
        // Handle unsupported content types or return an error
        throw new Error(`Unsupported content type: ${contentType}`);
    }
}

/**
 * Fetch current calculator result
 * @param { String } acceptType - Which content type is accepted by the client 
 * @returns result - a string or number depending on the request
 */
async function getCurrentResult(acceptType) {

    let getHeaders = {
        "Accept": ""
    }

    if (acceptType === "json") {
        getHeaders.Accept = "application/json"
    }
    else if (acceptType === "cbor") {
        getHeaders.Accept = "application/cbor"
    } 
    else {
        getHeaders.Accept = acceptType;
    }

    const res = await fetch(url + resultEndPoint, {
        method: "GET",
        headers: getHeaders
    })

    const contentType = res.headers.get("content-type")

    if (contentType.includes("application/json")) {
        return res.json()
    }
    else {
        const buffer = await res.arrayBuffer()
        const decodedData = cbor.decode(buffer);
        return decodedData
    }
}

/**
 * Create an EventSource for the result observe property.
 */
function listenToResultProperty(header) {

    const acceptHeader = `application/${header}`
    const resultEventSource = new EventSource(url + resultEndPointObserve, {
        headers: {
            'Accept': acceptHeader
        }
    });

    resultEventSource.onmessage = (e) => {

        const body = e.data;

        if (header === 'json') {
            console.log('Result SSE:', JSON.parse(body))
        }
        else {
            const buffer = Buffer.from(body);
            const decodedData = cbor.decode(buffer)
            console.log('Result SSE:', decodedData);
        }
    };

    resultEventSource.onerror = (error) => {
        console.error('Error with Result property SSE:', error);
    };

    //Closing the event source after 6 seconds
    setTimeout(() => {
        resultEventSource.close()
        console.log("- Closing Result Property SSE");
    }, 6000)
}

/**
 * Fetches the last change made
 * @param { String } acceptType - Which content type is accepted by the client 
 * @returns lastChange - A string of the date when it was last changed
 */
async function getLatestChange(acceptType) {

    let getHeaders = {
        "Accept": ""
    }

    if (acceptType === "json") {
        getHeaders.Accept = "application/json"
    }
    else if (acceptType === "cbor") {
        getHeaders.Accept = "application/cbor"
    } else {
        getHeaders.Accept = acceptType;
    }

    const res = await fetch(url + lastChangeEndPoint, {
        method: "GET",
        headers: getHeaders
    })

    const contentType = res.headers.get("content-type")

    if (contentType.includes("application/json")) {
        return res.json()
    }
    else {
        const buffer = await res.arrayBuffer()
        const decodedData = cbor.decode(buffer);
        return decodedData
    }
}

/**
 * Create an EventSource for the last change observe property.
 */
function listenToLastChangeProperty(header) {

    const acceptHeader = `application/${header}`
    const lastChangeEventSource = new EventSource(url + lastChangeEndPointObserve, {
        headers: {
            'Accept': acceptHeader
        }
    });

    lastChangeEventSource.onmessage = (e) => {
        const body = e.data;

        if (header === 'json') {
            console.log('lastChange SSE:', JSON.parse(body))
        }
        else {
            const buffer = Buffer.from(body);
            const decodedData = cbor.decode(buffer)
            console.log('lastChange SSE:', decodedData);
        }
    };

    lastChangeEventSource.onerror = (error) => {
        console.error('Error with lastChange property SSE:', error);
    };

    //Closing the event source after 6 seconds
    setTimeout(() => {
        lastChangeEventSource.close()
        console.log("- Closing lastChange Property SSE");
    }, 6000)
}

/**
 * Adds a number to the current result
 * @param { Number } number - the number to be added 
 * @param { String } contentType - Which content type is accepted by the server
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns addedNumber - the number to be added to the calculator
 */
async function addNumber(number, contentType, acceptType) {
    let postHeaders = {
        "Content-Type": "",
        "Accept": "",
    }

    if (contentType === "json") {
        inputNumber = JSON.stringify(number)
        postHeaders['Content-Type'] = "application/json"
    }
    else if (contentType === "cbor") {
        inputNumber = cbor.encode(number)
        postHeaders['Content-Type'] = "application/cbor"
    }
    else {
        inputNumber = number
        postHeaders['Content-Type'] = contentType
    }

    if (acceptType === "json") {
        postHeaders['Accept'] = "application/json"
    }
    else if (acceptType === "cbor") {
        postHeaders['Accept'] = "application/cbor"
    }
    else {
        postHeaders['Accept'] = acceptType
    }

    const res = await fetch(url + additionEndPoint, {
        method: "POST",
        headers: postHeaders,
        body: inputNumber,
    });

    if (res.ok) {
        const contentType = res.headers.get("content-type")

        if (contentType.includes("application/json")) {
            return res.json()
        }
        else {
            const buffer = await res.arrayBuffer()
            const decodedData = cbor.decode(buffer);
            return decodedData
        }
    } else {
        throw new Error(await res.text());
    }
}

/**
 * Subtracts a number to the current result
 * @param { Number } number - the number to be subtracted
 * @param { String } contentType - Which content type is accepted by the server
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns subtractedNumber - the number to be added to the calculator
 */
async function subtractNumber(number, contentType, acceptType) {
    let postHeaders = {
        "Content-Type": "",
        "Accept": "",
    }

    if (contentType === "json") {
        inputNumber = JSON.stringify(number)
        postHeaders['Content-Type'] = "application/json"
    }
    else if (contentType === "cbor") {
        inputNumber = cbor.encode(number)
        postHeaders['Content-Type'] = "application/cbor"
    }
    else {
        inputNumber = number
        postHeaders['Content-Type'] = contentType
    }

    if (acceptType === "json") {
        postHeaders['Accept'] = "application/json"
    }
    else if (acceptType === "cbor") {
        postHeaders['Accept'] = "application/cbor"
    }
    else {
        postHeaders['Accept'] = acceptType
    }

    const res = await fetch(url + subtractionEndPoint, {
        method: "POST",
        headers: postHeaders,
        body: inputNumber,
    });

    if (res.ok) {
        const contentType = res.headers.get("content-type")

        if (contentType.includes("application/json")) {
            return res.json()
        }
        else {
            const buffer = await res.arrayBuffer()
            const decodedData = cbor.decode(buffer);
            return decodedData
        }
    } else {
        throw new Error(await res.text());
    }
}

/**
* Create an EventSource for the update endpoint.
*/
function listenToUpdateEvent(header) {

    const acceptHeader = `application/${header}`
    const updateEventSource = new EventSource(url + updateEndPoint, {
        headers: {
            'Accept': acceptHeader
        }
    });

    updateEventSource.onmessage = (e) => {

        const body = e.data;

        if (header === 'json') {
            console.log('Update SSE:', JSON.parse(body));
        }
        else {
            const buffer = Buffer.from(body);
            const decodedData = cbor.decode(buffer);
            console.log('Update SSE:', decodedData);
        }
    };

    updateEventSource.onerror = (error) => {
        console.error('Error with Update event SSE:', error);
    };

    //Closing the event source after 6 seconds
    setTimeout(() => {
        updateEventSource.close()
        console.log("- Closing Update Event SSE");
    }, 6000)
}


/**
 * Runs all the previous functions to test the full functionality of the calculator
 */
async function runCalculatorInteractions() {

    try {
        console.log("-------- Basic functionality --------\n");
        console.log("Full thing: \n", await getFullTD("cbor"))
        console.log("Current number: ", await getCurrentResult("cbor"))
        console.log("Last Change: ", await getLatestChange("json"));
        console.log("Result of the addition is: ", await addNumber(5, "json", "cbor"))
        console.log("Result of the subtraction is: ", await subtractNumber(3, "cbor", "json"))
        console.log("Current number: ", await getCurrentResult("json"))
        console.log("Last Change: ", await getLatestChange("cbor"))

        /**
         * Start listening to the update event, result property and lastChange property.
         */
        console.log("\n-------- Start listening to properties and events --------\n");
        listenToResultProperty("json")
        listenToUpdateEvent("cbor")
        listenToLastChangeProperty("json")

        setTimeout(async () => {
            await addNumber(1, "json", "cbor")
        }, 2000)


    } catch (err) {
        console.log(err);
    }

}

runCalculatorInteractions()