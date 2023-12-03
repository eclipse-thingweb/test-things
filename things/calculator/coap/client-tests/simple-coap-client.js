const coap = require('coap')
const hostname = 'localhost'
const portNumber = 5683
const thingName = 'coap-calculator-simple'

const fullTDEndpoint = `/${thingName}`,
    resultEndPoint = `/${thingName}/properties/result`,
    lastChangeEndPoint = `/${thingName}/properties/lastChange`,
    additionEndPoint = `/${thingName}/actions/add`,
    subtractionEndPoint = `/${thingName}/actions/subtract`,
    updateEndPoint = `/${thingName}/events/update`

// GET request to retrieve thing description
const getThingDescriptionMsg = coap.request({
    method: 'GET',
    host: hostname,
    port: portNumber,
    pathname: fullTDEndpoint
})

getThingDescriptionMsg.on('response', (res) => {
    if (res.code === '2.05') {
        console.log('Thing Description: \n', JSON.parse(res.payload.toString()))
    } else {
        console.error(`Failed to get Thing Description: ${res.code} - ${res.payload.toString()}`)
    }
})
getThingDescriptionMsg.end()

// GET request to retrieve a property (result)
const getPropertyResult = coap.request({
    method: 'GET',
    host: hostname,
    port: portNumber,
    pathname: resultEndPoint
});

getPropertyResult.on('response', (res) => {

    if (res.code === '2.05') {
        console.log(`Result: ${res.payload.toString()}`)
    } else {
        console.error(`Failed to get Property "result": ${res.code} - ${res.payload.toString()}`)
    }
})
getPropertyResult.end()

// GET request to retrieve a property (lastChange)
const getLastChange = coap.request({
    method: 'GET',
    host: hostname,
    port: portNumber,
    pathname: lastChangeEndPoint
})
getLastChange.on('response', (res) => {

    if (res.code === '2.05') {
        console.log(`Last Change: ${res.payload.toString()}`)
    } else {
        console.error(`Failed to get Property "lastChange": ${res.code} - ${res.payload.toString()}`)
    }
})
getLastChange.end()


// POST request to perform an action (add)
const addNumberReq = coap.request({
    method: 'POST',
    host: hostname,
    port: portNumber,
    pathname: additionEndPoint
});

// Set the payload with the input value
const numberToAdd = 2
addNumberReq.write(numberToAdd.toString())

addNumberReq.on('response', (res) => {

    if (res.code === '2.05') {
        console.log(`Addition result: ${res.payload.toString()}`)
    } else {
        console.error(`Failed to call the Action "add": ${res.code} - ${res.payload.toString()}`)
    }
});
addNumberReq.end();


// POST request to perform an action (subtract)
const subtractNumberReq = coap.request({
    method: 'POST',
    host: hostname,
    port: portNumber,
    pathname: subtractionEndPoint
});

// Set the payload with the input value
const numberToSubtract = 4
subtractNumberReq.write(numberToSubtract.toString())

subtractNumberReq.on('response', (res) => {

    if (res.code === '2.05') {
        console.log(`Subtraction result: ${res.payload.toString()}`)
    } else {
        console.error(`Failed to call the Action "subtract": ${res.code} - ${res.payload.toString()}`)
    }
});
subtractNumberReq.end();

/**
 * GET request to observe an event (update).
 * Uncomment to test the update functionality
 */

// const observeEventChange = coap.request({
//     method: 'GET',
//     observe: true, // Enable observation
//     host: hostname,
//     port: portNumber,
//     pathname: updateEndPoint
// });

// observeEventChange.on('response', (res) => {

//     res.on('data', function () {

//         if (res.code === '2.05') {
//             console.log(`Update result: ${res.payload.toString()}`)
//         } else {
//             console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
//         }
//     })

// });

// // Start observing
// observeEventChange.end();