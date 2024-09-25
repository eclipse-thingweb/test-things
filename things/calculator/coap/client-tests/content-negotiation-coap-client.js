const coap = require("coap");
const cbor = require("cbor");
const hostname = "localhost";
const portNumber = 5684;
const thingName = "coap-calculator-content-negotiation";

const fullTDEndpoint = `/${thingName}`,
  resultEndPoint = `/${thingName}/properties/result`,
  lastChangeEndPoint = `/${thingName}/properties/lastChange`,
  additionEndPoint = `/${thingName}/actions/add`,
  subtractionEndPoint = `/${thingName}/actions/subtract`,
  updateEndPoint = `/${thingName}/events/update`;

/****************************************/
/****** Thing Description Endpoint ******/
/****************************************/

// GET request to retrieve thing description
function getFullTD(acceptType) {
  const getThingDescription = coap.request({
    method: "GET",
    host: hostname,
    port: portNumber,
    pathname: fullTDEndpoint,
    headers: {
      Accept: acceptType,
    },
  });

  getThingDescription.on("response", (res) => {
    //TODO: Fix the problem with block wise transfer to be able to parse the response accordingly
    if (res.code === "2.05") {
      if (
        acceptType === "application/json" ||
        acceptType === "application/td+json"
      ) {
        console.log(
          "Thing Description (json):\n",
          JSON.parse(res.payload.toString()),
        );
      } else {
        const decodedData = cbor.decode(res.payload);
        console.log("Thing Description (cbor):\n", JSON.parse(decodedData));
      }
    } else {
      console.error(`Failed to get Thing Description: ${res.code}`);
    }
  });
  getThingDescription.end();
}

/****************************************/
/*********** Result Endpoint ************/
/****************************************/

// GET request to retrieve a property (result)
function getResult(acceptType) {
  const getPropertyResult = coap.request({
    method: "GET",
    host: hostname,
    port: portNumber,
    pathname: resultEndPoint,
    headers: {
      Accept: acceptType,
    },
  });

  getPropertyResult.on("response", (res) => {
    const contentType = res.headers["Content-Type"];

    if (res.code === "2.05") {
      if (contentType.includes("application/json")) {
        console.log("Result (json): ", JSON.parse(res.payload.toString()));
      } else {
        const decodedData = cbor.decode(res.payload);
        console.log("Result (cbor): ", decodedData);
      }
    } else {
      console.error(`Failed to get Property "result": ${res.code}`);
    }
  });
  getPropertyResult.end();
}

/**
 * GET request to observe the property result.
 * Uncomment to test the update functionality.
 */
function observeResultProperty(acceptType) {
  const observeResult = coap.request({
    method: "GET",
    observe: true,
    host: hostname,
    port: portNumber,
    pathname: resultEndPoint,
    headers: {
      Accept: acceptType,
    },
  });

  observeResult.on("response", (res) => {
    res.on("data", function () {
      const contentType = res.headers["Content-Type"];

      if (res.code === "2.05") {
        if (contentType.includes("application/json")) {
          console.log(
            "Observe result property (json): ",
            JSON.parse(res.payload.toString()),
          );
        } else {
          const decodedData = cbor.decode(res.payload);
          console.log("Observe result property (cbor): ", decodedData);
        }
      } else {
        console.error(`Failed to observe Event "update": ${res.code}`);
      }
    });
  });

  observeResult.end();
}

/****************************************/
/********** lastChange Endpoint *********/
/****************************************/

// GET request to retrieve a property (lastChange)
function getLastChange(acceptType) {
  const getPropertyLastChange = coap.request({
    method: "GET",
    host: hostname,
    port: portNumber,
    pathname: lastChangeEndPoint,
    headers: {
      Accept: acceptType,
    },
  });
  getPropertyLastChange.on("response", (res) => {
    const contentType = res.headers["Content-Type"];

    if (res.code === "2.05") {
      if (contentType.includes("application/json")) {
        console.log("Last Change (json): ", JSON.parse(res.payload.toString()));
      } else {
        const decodedData = cbor.decode(res.payload);
        console.log("Last Change (cbor): ", decodedData);
      }
    } else {
      console.error(`Failed to get Property "lastChange": ${res.code}`);
    }
  });
  getPropertyLastChange.end();
}

/**
 * GET request to observe the property result.
 * Uncomment to test the update functionality.
 */
function observeLastChangeProperty(acceptType) {
  const observeLastChange = coap.request({
    method: "GET",
    observe: true,
    host: hostname,
    port: portNumber,
    pathname: lastChangeEndPoint,
    headers: {
      Accept: acceptType,
    },
  });

  observeLastChange.on("response", (res) => {
    res.on("data", function () {
      const contentType = res.headers["Content-Type"];

      if (res.code === "2.05") {
        if (contentType.includes("application/json")) {
          console.log(
            "Observe lastChange property (json): ",
            JSON.parse(res.payload.toString()),
          );
        } else {
          const decodedData = cbor.decode(res.payload);
          console.log("Observe lastChange property (cbor): ", decodedData);
        }
      } else {
        console.error(`Failed to observe Event "update": ${res.code}`);
      }
    });
  });

  observeLastChange.end();
}

/****************************************/
/*********** Addition Endpoint **********/
/****************************************/

// POST request to perform the addition action
function addNumber(acceptType, contentType, numberToAdd) {
  const addNumberReq = coap.request({
    method: "POST",
    host: hostname,
    port: portNumber,
    pathname: additionEndPoint,
    headers: {
      Accept: acceptType,
      "Content-Format": contentType,
    },
  });

  // Set the payload with the input value
  addNumberReq.write(
    contentType === "application/json"
      ? JSON.stringify(numberToAdd)
      : cbor.encode(numberToAdd),
  );

  addNumberReq.on("response", (res) => {
    const contentType = res.headers["Content-Type"];

    if (res.code === "2.05") {
      if (contentType.includes("application/json")) {
        console.log(
          "Addition result (json): ",
          JSON.parse(res.payload.toString()),
        );
      } else {
        const decodedData = cbor.decode(res.payload);
        console.log("Addition result (cbor): ", decodedData);
      }
    } else {
      console.error(`Failed to call the Action "add": ${res.code}`);
    }
  });
  addNumberReq.end();
}

/****************************************/
/********** Subtraction Endpoint ********/
/****************************************/

// POST request to perform the subtract action
function subtractNumber(acceptType, contentType, numberToSubtract) {
  const subtractNumberReq = coap.request({
    method: "POST",
    host: hostname,
    port: portNumber,
    pathname: subtractionEndPoint,
    headers: {
      Accept: acceptType,
      "Content-Format": contentType,
    },
  });

  // Set the payload with the input value
  subtractNumberReq.write(
    contentType === "application/json"
      ? JSON.stringify(numberToSubtract)
      : cbor.encode(numberToSubtract),
  );

  subtractNumberReq.on("response", (res) => {
    const contentType = res.headers["Content-Type"];

    if (res.code === "2.05") {
      if (contentType.includes("application/json")) {
        console.log(
          "Subtraction result (json): ",
          JSON.parse(res.payload.toString()),
        );
      } else {
        const decodedData = cbor.decode(res.payload);
        console.log("Subtraction result (cbor): ", decodedData);
      }
    } else {
      console.error(`Failed to call the Action "subtract": ${res.code}`);
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
function observeUpdateEvent(acceptType) {
  const observeUpdate = coap.request({
    method: "GET",
    observe: true, // Enable observation
    host: hostname,
    port: portNumber,
    pathname: updateEndPoint,
    headers: {
      Accept: acceptType,
    },
  });

  observeUpdate.on("response", (res) => {
    res.on("data", function () {
      const contentType = res.headers["Content-Type"];

      if (res.code === "2.05") {
        if (contentType.includes("application/json")) {
          console.log(
            "Observe update event (json): ",
            JSON.parse(res.payload.toString()),
          );
        } else {
          const decodedData = cbor.decode(res.payload);
          console.log("Observe update event (cbor): ", decodedData);
        }
      } else {
        console.error(`Failed to observe Event "update": ${res.code}`);
      }
    });
  });

  // Start observing
  observeUpdate.end();
}

//Test the main functionality of the content-negotiation-calculator-thing
function runCalculatorInteractions() {
  //Main GET and POST requests
  getFullTD("application/json");
  getResult("application/cbor");
  getLastChange("application/json");
  addNumber("application/cbor", "application/cbor", 3);
  subtractNumber("application/json", "application/json", 2);

  //Observation of properties and events after 1 second
  setTimeout(() => {
    console.log("\n-------- Start observation --------\n");
    observeResultProperty("application/json");
    observeLastChangeProperty("application/cbor");
    observeUpdateEvent("application/json");
  }, 1000);

  //Update the property result after 2.5 seconds to test the observation
  setTimeout(() => {
    addNumber("application/cbor", "application/json", 1);
  }, 2500);
}

runCalculatorInteractions();
