/**
 * @file The `simple-http-client.js` file acts a client for the simple-calculator.js.
 * This client is mostly used for testing the overall basic functionality of the http thing.
 */

const EventSource = require('eventsource')

const url = "http://localhost:3000/http-express-calculator-simple",
    resultEndPoint = "/properties/result",
    resultEndPointObserve = `${resultEndPoint}/observe`,
    lastChangeEndPoint = "/properties/lastChange",
    lastChangeEndPointObserve = `${lastChangeEndPoint}/observe`,
    additionEndPoint = "/actions/add",
    subtractionEndPoint = "/actions/subtract",
    updateEndPoint = "/events/update"


/**
 * Return the Full TD 
 * @returns TD - JSON object
 */
async function getFullTD() {
    const res = await fetch(url)

    return res.json()
}

/**
 * Fetch current calculator result 
 * @returns result - Number
 */
async function getCurrentResult() {
    const res = await fetch(url + resultEndPoint)

    return res.json()
}

/**
 * Create an EventSource for the result observe endpoint.
 * Uncomment to test the SSE functionality.
 */
function listenToResult() {
    const resultEventSource = new EventSource(url + resultEndPointObserve);

    resultEventSource.onmessage = (e) => {
        console.log('Result SSE:', JSON.parse(e.data));
    };

    resultEventSource.onerror = (error) => {
        console.error('Error with Result SSE:', error);
    };

    //Closing the event source after 6 seconds
    setTimeout(() => {
        resultEventSource.close()
        console.log("- Closing Result Property SSE");
    }, 6000)
}

/**
 * Fetches when the latest change was made 
 * @returns lastChange - String
 */
async function getLatestChange() {
    const res = await fetch(url + lastChangeEndPoint)

    return res.json()
}

/**
 * Create an EventSource for the result observe endpoint.
 * Uncomment to test the SSE functionality.
 */
function listenToLastChange() {
    const lastChangeEventSource = new EventSource(url + lastChangeEndPointObserve);

    lastChangeEventSource.onmessage = (e) => {
        console.log('lastChange SSE:', JSON.parse(e.data));
    };

    lastChangeEventSource.onerror = (error) => {
        console.error('Error with lastChange SSE:', error);
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
 * @returns result - the new result after the addition
 */
async function addNumber(number) {
    const res = await fetch(url + additionEndPoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: number,
    });

    return res.json()
}

/**
 * Subtracts a number to the current result
 * @param { Number } number - the number to be subtracted
 * @returns result - the new result after the subtraction
 */
async function subtractNumber(number) {
    const res = await fetch(url + subtractionEndPoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: number,
    });

    return res.json()
}


/**
 * Create an EventSource for the update endpoint.
 */
function listenToUpdateEvent() {

    // Listening to the update event
    const updateEventSource = new EventSource(url + updateEndPoint);

    updateEventSource.onmessage = (e) => {
        console.log('Update Event SSE:', JSON.parse(e.data));
    };

    updateEventSource.onerror = (error) => {
        console.error('Error with Update SSE:', error);
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
        console.log("Full thing: \n", await getFullTD())
        console.log("Current result: ", await getCurrentResult())
        console.log("Last Change: ", await getLatestChange());
        console.log("Result of the addition is: ", await addNumber(5))
        console.log("Result of the subtraction is: ", await subtractNumber(3))
        console.log("Current result: ", await getCurrentResult())
        console.log("Last Change: ", await getLatestChange())

        /**
        * Start listening to the update event, result property and lastChange property.
        */
        console.log("\n-------- Start listening to properties and events --------\n");
        listenToUpdateEvent()
        listenToLastChange()
        listenToResult()

        setTimeout(async () => {
            await addNumber(1)
        }, 2000)

    } catch (err) {
        console.log(err);
    }
}

runCalculatorInteractions()
