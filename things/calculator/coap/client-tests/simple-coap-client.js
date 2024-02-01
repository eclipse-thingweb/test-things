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


/****************************************/
/****** Thing Description Endpoint ******/
/****************************************/

function getThingDescription() {
    // GET request to retrieve thing description
    const getFullTD = coap.request({
        method: 'GET',
        host: hostname,
        port: portNumber,
        pathname: fullTDEndpoint
    })

    getFullTD.on('response', (res) => {
        if (res.code === '2.05') {
            console.log('Thing Description: \n', JSON.parse(res.payload.toString()))
        } else {
            console.error(`Failed to get Thing Description: ${res.code} - ${res.payload.toString()}`)
        }
    })
    getFullTD.end()
}


// /****************************************/
// /*********** Result Endpoint ************/
// /****************************************/

function getResult() {
    // GET request to retrieve the property result
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
}


/**
 * GET request to observe the property result.
 * Uncomment to test the observe functionality
 */

function observeResultProperty() {
    const observeResult = coap.request({
        method: 'GET',
        observe: 0, // Enable observation
        host: hostname,
        port: portNumber,
        pathname: resultEndPoint
    });

    observeResult.on('response', (res) => {
        res.on('data', function () {
            if (res.code === '2.05') {
                console.log('Observe result property:', res.payload.toString())
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        })

    });

    // Start observing
    observeResult.end();
}


/****************************************/
/********** lastChange Endpoint *********/
/****************************************/

function getLastChange() {
    // GET request to retrieve the property lastChange
    const getPropertyLastChange = coap.request({
        method: 'GET',
        host: hostname,
        port: portNumber,
        pathname: lastChangeEndPoint
    })
    getPropertyLastChange.on('response', (res) => {

        if (res.code === '2.05') {
            console.log(`Last Change: ${res.payload.toString()}`)
        } else {
            console.error(`Failed to get Property "lastChange": ${res.code} - ${res.payload.toString()}`)
        }
    })

    getPropertyLastChange.end()
}


/**
 * GET request to observe the property lastChange.
 * Uncomment to test the observe functionality
 */

function observeLastChangeProperty() {
    const observeLastChange = coap.request({
        method: 'GET',
        observe: 0, // Enable observation
        host: hostname,
        port: portNumber,
        pathname: lastChangeEndPoint
    });

    observeLastChange.on('response', (res) => {

        res.on('data', function () {
            if (res.code === '2.05') {
                console.log('Observe lastChange property:', res.payload.toString())
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        })

    });

    // Start observing
    observeLastChange.end();
}


/****************************************/
/*********** Addition Endpoint **********/
/****************************************/

function addNumber() {
    // POST request to perform an action (add)
    const addNumberAction = coap.request({
        method: 'POST',
        host: hostname,
        port: portNumber,
        pathname: additionEndPoint
    });

    // Set the payload with the input value
    const numberToAdd = 2
    addNumberAction.write(numberToAdd.toString())

    addNumberAction.on('response', (res) => {

        if (res.code === '2.05') {
            console.log(`Addition result: ${res.payload.toString()}`)
        } else {
            console.error(`Failed to call the Action "add": ${res.code} - ${res.payload.toString()}`)
        }
    });
    addNumberAction.end();
}



/****************************************/
/********** Subtraction Endpoint ********/
/****************************************/

function subtractNumber() {
    // POST request to perform an action (subtract)
    const subtractNumberAction = coap.request({
        method: 'POST',
        host: hostname,
        port: portNumber,
        pathname: subtractionEndPoint
    });

    // Set the payload with the input value
    const numberToSubtract = 3
    subtractNumberAction.write(numberToSubtract.toString())

    subtractNumberAction.on('response', (res) => {

        if (res.code === '2.05') {
            console.log(`Subtraction result: ${res.payload.toString()}`)
        } else {
            console.error(`Failed to call the Action "subtract": ${res.code} - ${res.payload.toString()}`)
        }
    });
    subtractNumberAction.end();
}


/****************************************/
/*********** Update Endpoint ************/
/****************************************/

/**
 * GET request to observe an event (update).
 * Uncomment to test the update functionality
 */

function observeUpdateEvent() {
    const observeEventChange = coap.request({
        method: 'GET',
        observe: 0, // Enable observation
        host: hostname,
        port: portNumber,
        pathname: updateEndPoint
    });

    observeEventChange.on('response', (res) => {

        res.on('data', function () {
            if (res.code === '2.05') {
                console.log('Observe update event:', res.payload.toString())
            } else {
                console.error(`Failed to observe Event "update": ${res.code} - ${res.payload.toString()}`);
            }
        })

    });

    // Start observing
    observeEventChange.end();
}


function runCalculatorInteractions() {

    getThingDescription()
    getResult()
    getLastChange()
    addNumber()
    subtractNumber()


    //Start the observation of properties and events after 1 second
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