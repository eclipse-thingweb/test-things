/**
 * @file The `content-negotiation-http-client.js` file acts as a client for the content-negotiation-calculator.js.
 * This client is mostly used for testing the content negotiation functionality of the http thing.
 * Requests as well as responses can be sent and received in JSON and CBOR formats.
 */

const cbor = require("cbor");
const EventSource = require("eventsource");

const url = "http://localhost:3000/http-express-calculator-content-negotiation",
  resultEndPoint = "/properties/result",
  resultEndPointObserve = `${resultEndPoint}/observe`,
  lastChangeEndPoint = "/properties/lastChange",
  lastChangeEndPointObserve = `${lastChangeEndPoint}/observe`,
  additionEndPoint = "/actions/add",
  subtractionEndPoint = "/actions/subtract",
  updateEndPoint = "/events/update";

/**
 * Return the Full TD
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns Thing description as either a String, JSON or CBOR
 */
async function getFullTD(acceptType) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: acceptType,
    },
  });

  const contentType = res.headers.get("content-type");

  if (contentType.includes("application/json")) {
    return res.json();
  } else {
    const buffer = await res.arrayBuffer();
    const decodedData = cbor.decode(buffer);
    return decodedData;
  }
}

/**
 * Fetch current calculator result
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns result - a string or number depending on the request
 */
async function getCurrentResult(acceptType) {
  const res = await fetch(url + resultEndPoint, {
    method: "GET",
    headers: {
      Accept: acceptType,
    },
  });

  const contentType = res.headers.get("content-type");

  if (contentType.includes("application/json")) {
    return res.json();
  } else {
    const buffer = await res.arrayBuffer();
    const decodedData = cbor.decode(buffer);
    return decodedData;
  }
}

/**
 * Create an EventSource for the result observe property.
 */
function listenToResultProperty(acceptType) {
  const resultEventSource = new EventSource(url + resultEndPointObserve, {
    headers: {
      Accept: acceptType,
    },
  });

  resultEventSource.onmessage = (e) => {
    const body = e.data;

    if (acceptType === "application/json") {
      console.log("Result SSE:", JSON.parse(body));
    } else {
      const buffer = Buffer.from(body);
      const decodedData = cbor.decode(buffer);
      console.log("Result SSE:", decodedData);
    }
  };

  resultEventSource.onerror = (error) => {
    console.error("Error with Result property SSE:", error);
  };

  //Closing the event source after 6 seconds
  setTimeout(() => {
    resultEventSource.close();
    console.log("- Closing Result Property SSE");
  }, 6000);
}

/**
 * Fetches the last change made
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns lastChange - A string of the date when it was last changed
 */
async function getLatestChange(acceptType) {
  const res = await fetch(url + lastChangeEndPoint, {
    method: "GET",
    headers: {
      Accept: acceptType,
    },
  });

  const contentType = res.headers.get("content-type");

  if (contentType.includes("application/json")) {
    return res.json();
  } else {
    const buffer = await res.arrayBuffer();
    const decodedData = cbor.decode(buffer);
    return decodedData;
  }
}

/**
 * Create an EventSource for the last change observe property.
 */
function listenToLastChangeProperty(acceptType) {
  const lastChangeEventSource = new EventSource(
    url + lastChangeEndPointObserve,
    {
      headers: {
        Accept: acceptType,
      },
    },
  );

  lastChangeEventSource.onmessage = (e) => {
    const body = e.data;

    if (acceptType === "application/json") {
      console.log("lastChange SSE:", JSON.parse(body));
    } else {
      const buffer = Buffer.from(body);
      const decodedData = cbor.decode(buffer);
      console.log("lastChange SSE:", decodedData);
    }
  };

  lastChangeEventSource.onerror = (error) => {
    console.error("Error with lastChange property SSE:", error);
  };

  //Closing the event source after 6 seconds
  setTimeout(() => {
    lastChangeEventSource.close();
    console.log("- Closing lastChange Property SSE");
  }, 6000);
}

/**
 * Adds a number to the current result
 * @param { Number } number - the number to be added
 * @param { String } contentType - Which content type is accepted by the server
 * @param { String } acceptType - Which content type is accepted by the client
 * @returns addedNumber - the number to be added to the calculator
 */
async function addNumber(number, contentType, acceptType) {
  const inputNumber =
    contentType === "application/json"
      ? JSON.stringify(number)
      : cbor.encode(number);

  const res = await fetch(url + additionEndPoint, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Accept: acceptType,
    },
    body: inputNumber,
  });

  if (res.ok) {
    const contentType = res.headers.get("content-type");

    if (contentType.includes("application/json")) {
      return res.json();
    } else {
      const buffer = await res.arrayBuffer();
      const decodedData = cbor.decode(buffer);
      return decodedData;
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
  const inputNumber =
    contentType === "application/json"
      ? JSON.stringify(number)
      : cbor.encode(number);

  const res = await fetch(url + subtractionEndPoint, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Accept: acceptType,
    },
    body: inputNumber,
  });

  if (res.ok) {
    const contentType = res.headers.get("content-type");

    if (contentType.includes("application/json")) {
      return res.json();
    } else {
      const buffer = await res.arrayBuffer();
      const decodedData = cbor.decode(buffer);
      return decodedData;
    }
  } else {
    throw new Error(await res.text());
  }
}

/**
 * Create an EventSource for the update endpoint.
 */
function listenToUpdateEvent(acceptType) {
  const updateEventSource = new EventSource(url + updateEndPoint, {
    headers: {
      Accept: acceptType,
    },
  });

  updateEventSource.onmessage = (e) => {
    const body = e.data;

    if (acceptType === "application/json") {
      console.log("Update SSE:", JSON.parse(body));
    } else {
      const buffer = Buffer.from(body);
      const decodedData = cbor.decode(buffer);
      console.log("Update SSE:", decodedData);
    }
  };

  updateEventSource.onerror = (error) => {
    console.error("Error with Update event SSE:", error);
  };

  //Closing the event source after 6 seconds
  setTimeout(() => {
    updateEventSource.close();
    console.log("- Closing Update Event SSE");
  }, 6000);
}

/**
 * Runs all the previous functions to test the full functionality of the calculator
 */
async function runCalculatorInteractions() {
  try {
    console.log("-------- Basic functionality --------\n");
    console.log("Full thing: \n", await getFullTD("application/cbor"));
    console.log("Current number: ", await getCurrentResult("application/json"));
    console.log("Last Change: ", await getLatestChange("application/cbor"));
    console.log(
      "Result of the addition is: ",
      await addNumber(5, "application/cbor", "application/json"),
    );
    console.log(
      "Result of the subtraction is: ",
      await subtractNumber(3, "application/json", "application/cbor"),
    );
    console.log("Current number: ", await getCurrentResult("application/cbor"));
    console.log("Last Change: ", await getLatestChange("application/json"));

    /**
     * Start listening to the update event, result property and lastChange property.
     */
    console.log(
      "\n-------- Start listening to properties and events --------\n",
    );
    listenToResultProperty("application/cbor");
    listenToUpdateEvent("application/json");
    listenToLastChangeProperty("application/cbor");

    setTimeout(async () => {
      console.log(
        "Adding 1 to test observation: ",
        await addNumber(1, "application/cbor", "application/json"),
        "\n",
      );
    }, 2000);
  } catch (err) {
    console.log(err);
  }
}

runCalculatorInteractions();
