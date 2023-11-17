const coap = require('coap')
const cbor = require('cbor')
const hostname = 'localhost'
const portNumber = 5683
const thingName = 'coap-calculator'
const PROPERTIES = 'properties'
const ACTIONS = 'actions'
const EVENTS = 'events'

// GET request to retrieve thing description
const getThingDescriptionMsg = coap.request({
    method: 'GET',
    host: hostname,
    port: portNumber,
    pathname: `/${thingName}`,
    headers: {
        "Accept": "application/json"
    }
})

getThingDescriptionMsg.on('response', (res) => {
    //TODO: Understand and fix the problem with block wise transfer to be able to parse the response accordingly
    if (res.code === '2.05') { // 2.05 is the success response code for GET
        console.log('Thing Description:', res.payload.toString())
    } else {
        console.error('Failed to get Thing Description:', res.code, `- ${res.payload.toString()}`)
    }
})
getThingDescriptionMsg.end()

// GET request to retrieve a property (result)
const getPropertyResult = coap.request({
    method: 'GET',
    host: hostname,
    port: portNumber,
    pathname: `/${thingName}/${PROPERTIES}/result`,
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
        else if (contentType.includes("text/plain")) {
            console.log("Result (text): ", res.payload.toString());
        }
        else {
            throw new Error(`Unsupported content type: ${contentType}`);
        }
    } else {
        console.error('Failed to get Property "result":', res.code)
    }
})
getPropertyResult.end()

// GET request to retrieve a property (lastChange)
const getLastChange = coap.request({
    method: 'GET',
    host: hostname,
    port: portNumber,
    pathname: `/${thingName}/${PROPERTIES}/lastChange`,
    headers: {
        "Accept": "text/plain"
    }
})
getLastChange.on('response', (res) => {
    const contentType = res.headers["Content-Type"]

    if (res.code === '2.05') {
        if (contentType.includes("application/json")) {
            console.log("Last Change (json): ", JSON.parse(res.payload.toString()));
        }
        else if (contentType.includes("application/cbor")) {
            const decodedData = cbor.decode(res.payload);
            console.log("Last Change (cbor): ", decodedData);
        }
        else if (contentType.includes("text/plain")) {
            console.log("Last Change (text): ", res.payload.toString());
        }
        else {
            throw new Error(`Unsupported content type: ${contentType}`);
        }
    } else {
        console.error('Failed to get Property "lastChange":', res.code)
    }
})
getLastChange.end()


// Example POST request to perform an action (add)
const addNumberReq = coap.request({
    method: 'POST',
    host: hostname,
    port: portNumber,
    pathname: `/${thingName}/${ACTIONS}/add`,
    headers: {
        "Accept": "application/json",
        "Content-Format": "text/plain"
        // "Content-Format": "application/json"
        // "Content-Format": "application/cbor"
    }
});

// Set the payload with the input value
const inputAdd = 4
const inputAddJSON = { "data": 3 }
const inputAddCBOR = cbor.encode(2)

addNumberReq.write(inputAdd.toString())
// addNumberReq.write(JSON.stringify(inputAddJSON))
// addNumberReq.write(inputAddCBOR)

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
        else if (contentType.includes("text/plain")) {
            console.log("Addition result (text): ", res.payload.toString());
        }
        else {
            throw new Error(`Unsupported content type: ${contentType}`);
        }
    } else {
        console.error('Failed to call the Action "add":', res.code, `- ${res.payload.toString()}`)
    }
});
addNumberReq.end();


// Example POST request to perform an action (subtract)
const subtractNumberReq = coap.request({
    method: 'POST',
    host: hostname,
    port: portNumber,
    pathname: `/${thingName}/${ACTIONS}/subtract`,
    headers: {
        "Accept": "application/cbor",
        // "Content-Format": "text/plain"
        // "Content-Format": "application/json"
        "Content-Format": "application/json"
    }
});

// Set the payload with the input value
const inputSubtract = 4
const inputSubtractJSON = { "data": 3 }
const inputSubtractCBOR = cbor.encode(2)

// subtractNumberReq.write(inputSubtract.toString())
subtractNumberReq.write(JSON.stringify(inputSubtractJSON))
// subtractNumberReq.write(inputSubtractCBOR)

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
        else if (contentType.includes("text/plain")) {
            console.log("Subtraction result (text): ", res.payload.toString());
        }
        else {
            throw new Error(`Unsupported content type: ${contentType}`);
        }
    } else {
        console.error('Failed to call the Action "subtract":', res.code, `- ${res.payload.toString()}`)
    }
});
subtractNumberReq.end();

// // GET request to observe an event (update)
// const observeEventChange = coap.request({
//     method: 'GET',
//     observe: true, // Enable observation
//     host: hostname,
//     port: portNumber,
//     pathname: `/${thingName}/${EVENTS}/update`,
//     headers: {
//         "Accept": "text/plain"
//     }
// });

// observeEventChange.on('response', (res) => {

//     res.on('data', function () {
//         const contentType = res.headers["Content-Type"]

//         if (res.code === '2.05') {
//             if (contentType.includes("application/json")) {
//                 console.log("Update result (json): ", JSON.parse(res.payload.toString()));
//             }
//             else if (contentType.includes("application/cbor")) {
//                 const decodedData = cbor.decode(res.payload);
//                 console.log("Update result (cbor): ", decodedData);
//             }
//             else if (contentType.includes("text/plain")) {
//                 console.log("Update result (text): ", res.payload.toString());
//             }
//             else {
//                 throw new Error(`Unsupported content type: ${contentType}`);
//             }
//         } else {
//             console.error('Failed to observe Event "change":', res.code, res.payload.toString());
//         }
//     })

// });

// // Start observing
// observeEventChange.end();