/********************************************************************************
 * Copyright (c) 2024 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/
 const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const { parseArgs } = require("node:util");
const { JsonPlaceholderReplacer } = require("json-placeholder-replacer");
const cbor = require("cbor");
require("dotenv").config();

const app = express();
app.use(express.json({ strict: false }));

const hostname = process.env.HOSTNAME ?? "localhost";
let portNumber = process.env.PORT ?? 3001;
const thingName = "http-express-calculator-content-negotiation";

const TDEndPoint = `/${thingName}`;
  const resultEndPoint = `/${thingName}/properties/result`;
  const resultEndPointObserve = `${resultEndPoint}/observe`;
  const lastChangeEndPoint = `/${thingName}/properties/lastChange`;
  const lastChangeEndPointObserve = `${lastChangeEndPoint}/observe`;
  const additionEndPoint = `/${thingName}/actions/add`;
  const subtractionEndPoint = `/${thingName}/actions/subtract`;
  const updateEndPoint = `/${thingName}/events/update`;

const existingEndpoints = [
  TDEndPoint,
  resultEndPoint,
  resultEndPointObserve,
  lastChangeEndPoint,
  lastChangeEndPointObserve,
  additionEndPoint,
  subtractionEndPoint,
  updateEndPoint,
];

let result = 0;
let lastChange = new Date().toISOString();

const {
  values: { port },
} = parseArgs({
  options: {
    port: {
      type: "string",
      short: "p",
    },
  },
});

if (port && !isNaN(parseInt(port))) {
  portNumber = parseInt(port);
}

const tmPath = process.env.TM_PATH;

if (process.platform === "win32") {
  tmPath.split(path.sep).join(path.win32.sep);
}

const thingModel = JSON.parse(fs.readFileSync(path.join(__dirname, tmPath)));

const placeholderReplacer = new JsonPlaceholderReplacer();
placeholderReplacer.addVariableMap({
  PROTOCOL: "http",
  THING_NAME: thingName,
  HOSTNAME: hostname,
  PORT_NUMBER: portNumber,
  RESULT_OBSERVABLE: true,
  LAST_CHANGE_OBSERVABLE: true,
});

const defaultForm = {
  href: "",
  contentType: "application/json",
  response: {
    contentType: "application/json",
  },
  op: "",
  "htv:methodName": "",
  "htv:headers": [
    {
      "@type": "htv:RequestHeader",
      fieldValue: "application/json",
      fieldName: "Accept",
    },
  ],
};

const thingDescription = placeholderReplacer.replace(thingModel);
thingDescription["@type"] = "Thing";

const supportedContentTypes = ["application/json", "application/cbor"];

// Adding headers to the Properties
for (const key in thingDescription.properties) {
  thingDescription.properties[key].forms = [];

  const newFormRead = JSON.parse(JSON.stringify(defaultForm));
  newFormRead.href = `properties/${key}`;
  newFormRead["htv:methodName"] = "GET";
  newFormRead.op = "readproperty";
  thingDescription.properties[key].forms.push(newFormRead);

  const newFormObs = JSON.parse(JSON.stringify(newFormRead));
  newFormObs.href = `properties/${key}/observe`;
  newFormObs.op = ["observeproperty", "unobserveproperty"];
  newFormObs.subprotocol = "sse";
  thingDescription.properties[key].forms.push(newFormObs);

  const originalForm = thingDescription.properties[key].forms[0];

  supportedContentTypes.forEach((type) => {
    if (
      !thingDescription.properties[key].forms[0].contentType.includes(
        type,
      )
    ) {
      const newFormRead = JSON.parse(JSON.stringify(originalForm));
      newFormRead.contentType = type;
      newFormRead.response.contentType = type;
      newFormRead["htv:headers"][0].fieldValue = type;
      thingDescription.properties[key].forms.push(newFormRead);

      const newFormObs = JSON.parse(JSON.stringify(newFormRead));
      newFormObs.href = `properties/${key}/observe`;
      newFormObs.op = ["observeproperty", "unobserveproperty"];
      newFormObs.subprotocol = "sse";
      thingDescription.properties[key].forms.push(newFormObs);
    }
  });
}

// Adding headers to the Actions
for (const key in thingDescription.actions) {
  thingDescription.actions[key].forms = [];

  const newForm = JSON.parse(JSON.stringify(defaultForm));
  newForm.href = `actions/${key}`;
  newForm["htv:methodName"] = "POST";
  newForm.op = "invokeaction";

  thingDescription.actions[key].forms.push(newForm);

  const originalForm = thingDescription.actions[key].forms[0];

  supportedContentTypes.forEach((type) => {
    if (
      !thingDescription.actions[key].forms[0].contentType.includes(
        type,
      )
    ) {
      const newForm = JSON.parse(JSON.stringify(originalForm));
      newForm.contentType = type;
      thingDescription.actions[key].forms.push(newForm);

      supportedContentTypes.forEach((type) => {
        if (
          !thingDescription.actions[key].forms[0].response.contentType.includes(type)
        ) {
          const newFormAccept = JSON.parse(JSON.stringify(newForm));
          newFormAccept.response.contentType = type;
          newFormAccept["htv:headers"][0].fieldValue = type;
          thingDescription.actions[key].forms.push(newFormAccept);
        }
      });
    } else {
      supportedContentTypes.forEach((type) => {
        if (!originalForm.response.contentType.includes(type)) {
          const newForm = JSON.parse(JSON.stringify(originalForm));
          newForm.response.contentType = type;
          newForm["htv:headers"][0].fieldValue = type;
          thingDescription.actions[key].forms.push(newForm);
        }
      });
    }
  });
}

// Adding headers to the Events

for (const key in thingDescription.events) {
  thingDescription.events[key].data.type = "object";

  thingDescription.events[key].forms = [];

  const newForm = JSON.parse(JSON.stringify(defaultForm));
  newForm.href = `events/${key}`;
  newForm["htv:methodName"] = "GET";
  newForm.op = "subscribeevent";
  newForm.subprotocol = "sse";

  thingDescription.events[key].forms.push(newForm);

  const originalForm = thingDescription.events[key].forms[0];

  supportedContentTypes.forEach((type) => {
    if (
      !thingDescription.events[key].forms[0].contentType.includes(type)
    ) {
      const newForm = JSON.parse(JSON.stringify(originalForm));
      newForm.contentType = type;
      newForm.response.contentType = type;
      newForm["htv:headers"][0].fieldValue = type;
      thingDescription.events[key].forms.push(newForm);
    }
  });
}

// Creating the TD for testing purposes
try {
  fs.writeFileSync(
    "http-content-negotiation-calculator-thing.td.jsonld",
    JSON.stringify(thingDescription, null, 2),
  );
} catch (err) {
  console.log(err);
}

/******************************************/
/** ************ Middleware ****************/
/******************************************/

// Middleware to ensure the right endpoints are being called
app.use((req, res, next) => {
  const endpoint = req.url;

  if (!existingEndpoints.includes(endpoint)) {
    res.status(404).json("Not Found");
  } else {
    next();
  }
});

// Middleware to ensure the right method is been used for each endpoint
app.use((req, res, next) => {
  const method = req.method;
  const endpoint = req.url;

  if (
    endpoint === TDEndPoint ||
    endpoint === resultEndPoint ||
    endpoint === resultEndPointObserve ||
    endpoint === lastChangeEndPoint ||
    endpoint === lastChangeEndPointObserve ||
    endpoint === updateEndPoint
  ) {
    if (method === "GET") {
      next();
    } else {
      res.status(405).json("Method Not Allowed");
    }
  }

  if (endpoint === additionEndPoint || endpoint === subtractionEndPoint) {
    if (method === "POST") {
      next();
    } else {
      res.status(405).json("Method Not Allowed");
    }
  }
});

// Middleware to check if supported 'Accept' values have been sent
app.use((req, res, next) => {
  const acceptHeader = req.get("Accept");

  if (acceptHeader === undefined) {
    res
      .status(406)
      .json(
        "Not Acceptable: Supported formats are application/json, and application/cbor",
      );
  } else if (
    acceptHeader.includes("*/*") ||
    acceptHeader.includes("application/*") ||
    acceptHeader.includes("application/json") ||
    acceptHeader.includes("application/cbor") ||
    acceptHeader.includes("application/td+json") ||
    acceptHeader.includes("text/event-stream")
  ) {
    next();
  } else {
    res
      .status(406)
      .json(
        "Not Acceptable: Supported formats are application/json, and application/cbor",
      );
  }
});

// Middleware to accept only the content-types: json and cbor
app.use((req, res, next) => {
  const contentType = req.get("Content-Type");
  const method = req.method;

  if (contentType === undefined) {
    if (method === "POST") {
      res.status(415).json("Unsupported Media Type");
    } else {
      next();
    }
  } else {
    next();
  }
});

// Use body-parser middleware to parse the request body
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.raw({ type: "application/cbor" }));

/*****************************************************/
/** ************ Properties Endpoints *****************/
/*****************************************************/

// Get full thing
app.get(TDEndPoint, (req, res) => {
  const jsonData = JSON.stringify(thingDescription);
  res.setHeader("Content-Type", "application/json");
  res.send(jsonData);
});

// Get current result
app.get(resultEndPoint, (req, res) => {
  const acceptHeader = req.get("Accept");

  // JSON media type is utilized as the default for the wild card
  if (
    acceptHeader.includes("application/json") ||
    acceptHeader.includes("*/*") ||
    acceptHeader.includes("application/*")
  ) {
    const jsonData = JSON.stringify(result);
    res.setHeader("Content-Type", "application/json");
    res.send(jsonData);
  } else {
    const cborData = cbor.encode(result);
    res.setHeader("Content-Type", "application/cbor");
    res.send(cborData);
  }
});

// Observe the current result property
app.get(resultEndPointObserve, (req, res) => {
  const acceptHeader = req.get("Accept");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream");

  console.log("Client is listening to result property");
  let oldResult = result;

  const changeInterval = setInterval(() => {
    if (oldResult !== result) {
      let message;

      if (
        acceptHeader.includes("application/json") ||
        acceptHeader.includes("*/*") ||
        acceptHeader.includes("application/*")
      ) {
        message = `data: ${JSON.stringify(result)}\n\n`;
      } else {
        message = `data: ${cbor.encode(result)}\n\n`;
      }

      res.statusCode = 200;
      res.write(message);
      oldResult = result;
    }
  }, 1000);

  res.on("finish", () => {
    clearInterval(changeInterval);
  });

  res.on("close", () => {
    console.log("Client stopped listening to result property");
  });
});

// Get the time of the last change
app.get(lastChangeEndPoint, (req, res) => {
  const acceptHeader = req.get("Accept");

  if (
    acceptHeader.includes("application/json") ||
    acceptHeader.includes("*/*") ||
    acceptHeader.includes("application/*")
  ) {
    const jsonData = JSON.stringify(lastChange);
    res.setHeader("Content-Type", "application/json");
    res.send(jsonData);
  } else {
    const cborData = cbor.encode(lastChange);
    res.setHeader("Content-Type", "application/cbor");
    res.send(cborData);
  }
});

// Observe the last change property
app.get(lastChangeEndPointObserve, (req, res) => {
  const acceptHeader = req.get("Accept");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream");

  console.log("Client is listening to lastChange property");
  let oldLastChange = lastChange;

  const changeInterval = setInterval(() => {
    if (oldLastChange !== lastChange) {
      let message;

      if (
        acceptHeader.includes("application/json") ||
        acceptHeader.includes("*/*") ||
        acceptHeader.includes("application/*")
      ) {
        message = `data: ${JSON.stringify(lastChange)}\n\n`;
      } else {
        message = `data: ${cbor.encode(lastChange.toISOString())}\n\n`;
      }

      res.statusCode = 200;
      res.write(message);
      oldLastChange = lastChange;
    }
  }, 1000);

  res.on("finish", () => {
    clearInterval(changeInterval);
  });

  res.on("close", () => {
    console.log("Client stopped listening to lastChange property");
  });
});

// /*****************************************************/
// /*************** Actions Endpoints *******************/
// /*****************************************************/

// Add a number to the current result endpoint
app.post(additionEndPoint, (req, res) => {
  const acceptHeader = req.get("Accept");
  let bodyInput;

  // check if the data was sent as cbor or json and if not get the body normally
  if (req.get("Content-Type") === "application/cbor") {
    try {
      bodyInput = cbor.decode(req.body);
    } catch (err) {
      res.status(400).json("Bad Request");
    }
  } else {
    try {
      bodyInput = JSON.parse(req.body);
    } catch (err) {
      res.status(400).json("Bad Request");
    }
  }

  /** Check if given input is a number, if not return an error message,
   * if yes add the new number to the result, update the lastChange variable and
   * return the added number in the accepted format
   */
  if (typeof bodyInput !== "number") {
    res.status(400).json("Input should be a valid number");
  } else {
    if (
      acceptHeader.includes("application/json") ||
      acceptHeader.includes("*/*") ||
      acceptHeader.includes("application/*")
    ) {
      result += bodyInput;
      lastChange = new Date();
      const jsonData = JSON.stringify(result);
      res.setHeader("Content-Type", "application/json");
      res.send(jsonData);
    } else {
      result += bodyInput;
      lastChange = new Date();
      console.log("cbor before encoded: ", result);
      const cborData = cbor.encode(result);
      console.log("cbor encoded: ", cborData);
      res.setHeader("Content-Type", "application/cbor");
      res.send(cborData);
    }
  }
});

// Subtract a number from the current result endpoint
app.post(subtractionEndPoint, (req, res) => {
  const acceptHeader = req.get("Accept");
  let bodyInput;

  // check if the data was sent as cbor, json or text, and if not get the body normally
  if (req.get("Content-Type") === "application/cbor") {
    try {
      bodyInput = cbor.decode(req.body);
    } catch (err) {
      res.status(400).json("Bad Request");
    }
  } else {
    try {
      bodyInput = JSON.parse(req.body);
    } catch (err) {
      res.status(400).json("Bad Request");
    }
  }

  /** Check  if given input is a valid number, if not return an error message,
   * if yes add the new number to the result, update the lastChange variable and
   * return the added number in the accepted format
   */
  if (typeof bodyInput !== "number") {
    res.status(400).json("Input should be a valid number");
  } else {
    if (
      acceptHeader.includes("application/json") ||
      acceptHeader.includes("*/*") ||
      acceptHeader.includes("application/*")
    ) {
      result -= bodyInput;
      lastChange = new Date();
      const jsonData = JSON.stringify(result);
      res.setHeader("Content-Type", "application/json");
      res.send(jsonData);
    } else {
      result -= bodyInput;
      lastChange = new Date();
      const cborData = cbor.encode(result);
      res.setHeader("Content-Type", "application/cbor");
      res.send(cborData);
    }
  }
});

// /*****************************************************/
// /**************** Events Endpoints *******************/
// /*****************************************************/

// Get updates when a change to the main result happens endpoint
app.get(updateEndPoint, (req, res) => {
  const acceptHeader = req.get("Accept");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream");

  console.log("Client is listening to update event");
  let oldResult = result;

  const changeInterval = setInterval(() => {
    if (oldResult !== result) {
      let message;

      if (
        acceptHeader.includes("application/json") ||
        acceptHeader.includes("*/*") ||
        acceptHeader.includes("application/*")
      ) {
        message = `data: ${JSON.stringify(result)}\n\n`;
      } else {
        message = `data: ${cbor.encode(result)}\n\n`;
      }

      res.statusCode = 200;
      res.write(message);
      oldResult = result;
    }
  }, 1000);

  res.on("finish", () => {
    clearInterval(changeInterval);
  });

  res.on("close", () => {
    console.log("Client stopped listening to update event");
  });
});

/************************************************/
/** ************ Starting Server *****************/
/************************************************/

app.listen(portNumber, () => {
  console.log(`Started listening to localhost on port ${portNumber}`);
  console.log("ThingIsReady");
});
