/**
 * This file is a simple js client to test the main functionality from the http thing.
 * Requests as well as Responses can be sent and received in Text, JSON, and CBOR formats.
 */

const cbor = require('cbor')
const EventSource = require('eventsource')

const url = "http://localhost:3000/http-express-calculator-content-negotiation",
    resultEndPoint = "/properties/result",
    lastChangeEndPoint = "/properties/lastChange",
    additionEndPoint = "/actions/add",
    subtractionEndPoint = "/actions/subtract",
    updateEndPoint = "/events/update"


/**
 * Return the Full TD 
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns Thing description as either a String, JSON or cbor
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
 * @returns result - a string or number depending on the req
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
    } else {
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
    else if (contentType.includes("application/cbor")) {
        const buffer = await res.arrayBuffer()
        const decodedData = cbor.decode(buffer);
        return decodedData
    }
    else {
        throw new Error(`Unsupported content type: ${contentType}`);
    }
}

/**
 * Fetches when the latest change was made
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
        inputNumber = JSON.stringify({ "data": number })
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
        else if (contentType.includes("application/cbor")) {
            const buffer = await res.arrayBuffer()
            const decodedData = cbor.decode(buffer);
            return decodedData
        }
        else {
            // Handle unsupported content types or return an error
            throw new Error(`Unsupported content type: ${contentType}`);
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
        inputNumber = JSON.stringify({ "data": number })
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
        else if (contentType.includes("application/cbor")) {
            const buffer = await res.arrayBuffer()
            const decodedData = cbor.decode(buffer);
            return decodedData
        }
        else {
            // Handle unsupported content types or return an error
            throw new Error(`Unsupported content type: ${contentType}`);
        }
    } else {
        throw new Error(await res.text());
    }
}


/**
 * Runs all the previous functions to test the full functionality of the calculator
 */
async function runCalculator() {

    try {
        console.log("Full thing: \n", await getFullTD("cbor"))
        console.log("Current number: ", await getCurrentResult("json"))
        console.log("Last Change: ", await getLatestChange("cbor"));
        console.log("Result of the addition is: ", await addNumber(10, "json", "cbor"))
        console.log("Result of the subtraction is: ", await subtractNumber(5, "cbor", "json"))
        console.log("Current number: ", await getCurrentResult("json"))
        console.log("Last Change: ", await getLatestChange("cbor"))

    } catch (err) {
        console.log(err);
    }

}

runCalculator()



/**
 * Create an EventSource for the update endpoint.
 * Uncomment to test the SSE functionality.
 */

// const updateEventSource = new EventSource(url + updateEndPoint, {
//     headers: {
//         'Accept': 'application/cbor'
//     }
// });

// updateEventSource.onmessage = (e) => {
//     const data = JSON.parse(e.data);
//     if (data.headers["content-type"] === 'application/cbor') {
//         const buffer = Buffer.from(data.result.data);
//         const decodedData = cbor.decode(buffer);
//         console.log(decodedData);
//     }
//     else {
//         console.log(data.result);
//     }
// };

// updateEventSource.onerror = (error) => {
//     console.error('Error with SSE:', error);
// };