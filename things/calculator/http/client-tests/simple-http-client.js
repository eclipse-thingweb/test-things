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
// const resultEventSource = new EventSource(url + resultEndPointObserve);

// resultEventSource.onmessage = (e) => {
//     const data = e.data;
//     console.log(data);
// };

// resultEventSource.onerror = (error) => {
//     console.error('Error with SSE:', error);
// };

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
// const lastChangeEventSource = new EventSource(url + lastChangeEndPointObserve);

// lastChangeEventSource.onmessage = (e) => {
//     const data = e.data;
//     console.log(data);
// };

// lastChangeEventSource.onerror = (error) => {
//     console.error('Error with SSE:', error);
// };

/**
 * Adds a number to the current result
 * @param { Number } number - the number to be added 
 * @returns result - the new result after the addition
 */
async function addNumber(number) {
    const res = await fetch(url + additionEndPoint, {
        method: "POST",
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
        body: number,
    });

    return res.json()
}


/**
 * Runs all the previous functions to test the full functionality of the calculator
 */
async function runCalculator() {
    try {
        console.log("Full thing: \n", await getFullTD())
        console.log("Current number: ", await getCurrentResult())
        console.log("Last Change: ", await getLatestChange());
        console.log("Result of the addition is: ", await addNumber(5))
        console.log("Result of the subtraction is: ", await subtractNumber(10))
        console.log("Current number: ", await getCurrentResult())
        console.log("Last Change: ", await getLatestChange())

    } catch (err) {
        console.log(err);
    }
}

runCalculator()


/**
 * Create an EventSource for the update endpoint.
 * Uncomment to test the SSE functionality.
 */

//Listening to the update event
// const updateEventSource = new EventSource(url + updateEndPoint);

// updateEventSource.onmessage = (e) => {
//     const data = JSON.parse(e.data);
//     console.log(data);
// };

// updateEventSource.onerror = (error) => {
//     console.error('Error with SSE:', error);
// };
