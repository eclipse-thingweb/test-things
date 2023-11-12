/**
 * This file is a simple js client to test the main fucntionality from the http thing.
 * Requests as well as Responses can be sent and received in Text, JSON, YAML ans CBOR formats.
 */

const cbor = require('cbor')
const jsYaml = require('js-yaml');

const url = "http://localhost:3000/http-express-calculator",
    resultEndPoint = "/properties/result",
    lastChangeEndPoint = "/properties/lastChange",
    additionEndPoint = "/actions/add",
    subtractionEndPoint = "/actions/subtract"
    // updateEndPoint = "/events/update"


/**
 * Return the Full TD 
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns Thing description as either a String, Json, yaml or cbor
 */
async function getFullTD(acceptType) {
    let getHeaders = {
        "Accept": "text/plain"
    }

    if (acceptType === "text") {
        getHeaders.Accept = "text/plain"
    }
    else if (acceptType === "json") {
        getHeaders.Accept = "application/json"
    }
    else if (acceptType === "yaml") {
        getHeaders.Accept = "application/yaml"
    }
    else if (acceptType === "cbor") {
        getHeaders.Accept = "application/cbor"
    } else {
        postHeaders['Content-Type'] = `application/${acceptType}`
    }


    const res = await fetch(url, {
        method: "GET",
        headers: getHeaders
    })

    const contentType = res.headers.get("content-type")

    if (contentType.includes("application/json")) {
        return res.json()
    }
    else if (contentType.includes("text/plain")) {
        return res.text()
    }
    else if (contentType.includes("application/cbor")) {
        const buffer = await res.arrayBuffer()
        const decodedData = cbor.decode(buffer);
        return decodedData
    }
    else if (contentType.includes("application/yaml")) {
        return res.text()
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
        "Accept": "text/plain"
    }

    if (acceptType === "text") {
        getHeaders.Accept = "text/plain"
    }
    else if (acceptType === "json") {
        getHeaders.Accept = "application/json"
    }
    else if (acceptType === "yaml") {
        getHeaders.Accept = "application/yaml"
    }
    else if (acceptType === "cbor") {
        getHeaders.Accept = "application/cbor"
    } else {
        postHeaders['Content-Type'] = `application/${acceptType}`
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
    else if (contentType.includes("application/yaml")) {
        return res.text()
    }
    else if (contentType.includes("text/plain")) {
        return res.text()
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
async function getLastestChange(acceptType) {

    let getHeaders = {
        "Accept": "text/plain"
    }

    if (acceptType === "text") {
        getHeaders.Accept = "text/plain"
    }
    else if (acceptType === "json") {
        getHeaders.Accept = "application/json"
    }
    else if (acceptType === "yaml") {
        getHeaders.Accept = "application/yaml"
    }
    else if (acceptType === "cbor") {
        getHeaders.Accept = "application/cbor"
    } else {
        postHeaders['Content-Type'] = `application/${acceptType}`
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
    else if (contentType.includes("application/yaml")) {
        return res.text()
    }
    else if (contentType.includes("text/plain")) {
        return res.text()
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
        "Content-Type": "text/plain",
        "Accept": "text/plain",
    }

    if (contentType === "text") {
        inputNumber = number
        postHeaders['Content-Type'] = "text/plain"
    }
    else if (contentType === "json") {
        inputNumber = JSON.stringify({ "data": number })
        postHeaders['Content-Type'] = "application/json"
    }
    else if (contentType === "yaml") {
        inputNumber = jsYaml.dump({ "data": number })
        postHeaders['Content-Type'] = "application/yaml"
    }
    else if (contentType === "cbor") {
        inputNumber = cbor.encode(number)
        postHeaders['Content-Type'] = "application/cbor"
    }
    else {
        inputNumber = number
        postHeaders['Content-Type'] = `application/${contentType}`
    }

    if (acceptType === "text") {
        postHeaders['Accept'] = "text/plain"
    }
    else if (acceptType === "json") {
        postHeaders['Accept'] = "application/json"
    }
    else if (acceptType === "yaml") {
        postHeaders['Accept'] = "application/yaml"
    }
    else if (acceptType === "cbor") {
        postHeaders['Accept'] = "application/cbor"
    }
    else {
        postHeaders['Accept'] = `application/${acceptType}`
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
        else if (contentType.includes("application/yaml")) {
            return res.text()
        }
        else if (contentType.includes("text/plain")) {
            return res.text()
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
        "Content-Type": "text/plain",
        "Accept": "text/plain",
    }

    if (contentType === "text") {
        inputNumber = number
        postHeaders['Content-Type'] = "text/plain"
    }
    else if (contentType === "json") {
        inputNumber = JSON.stringify({ "data": number })
        postHeaders['Content-Type'] = "application/json"
    }
    else if (contentType === "yaml") {
        inputNumber = jsYaml.dump({ "data": number })
        postHeaders['Content-Type'] = "application/yaml"
    }
    else if (contentType === "cbor") {
        inputNumber = cbor.encode(number)
        postHeaders['Content-Type'] = "application/cbor"
    }
    else {
        inputNumber = number
        postHeaders['Content-Type'] = `application/${contentType}`
    }

    if (acceptType === "text") {
        postHeaders['Accept'] = "text/plain"
    }
    else if (acceptType === "json") {
        postHeaders['Accept'] = "application/json"
    }
    else if (acceptType === "yaml") {
        postHeaders['Accept'] = "application/yaml"
    }
    else if (acceptType === "cbor") {
        postHeaders['Accept'] = "application/cbor"
    }
    else {
        postHeaders['Accept'] = `application/${acceptType}`
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
        else if (contentType.includes("application/yaml")) {
            return res.text()
        }
        else if (contentType.includes("text/plain")) {
            return res.text()
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
 * Runs all the previous fucntions to test the full functionality of the calculator
 */
async function runCalculator() {

    try {
        console.log("Full thing: \n", await getFullTD("cbor"))
        console.log("Current number: ", await getCurrentResult("json"))
        console.log("Last Change:", await getLastestChange("text"))
        console.log("Added the number", await addNumber(3, "cbor", "cbor"))
        console.log("Subtracted the number", await subtractNumber(20, "json", "cbor"))
        console.log("Current number: ", await getCurrentResult("yaml"))
        console.log("Last Change:", await getLastestChange("cbor"))

    } catch (err) {
        console.log(err);
    }

}

runCalculator()