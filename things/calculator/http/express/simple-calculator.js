const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const { parseArgs } = require("node:util");
const { JsonPlaceholderReplacer } = require("json-placeholder-replacer");
require("dotenv").config();

const app = express();

const hostname = "localhost";
let portNumber = 3000;

const thingName = "http-express-calculator-simple";
const RESULT_OBSERVABLE = true;
const LAST_CHANGE_OBSERVABLE = true
const url = `http://localhost:3000/${thingName}`

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
  RESULT_OBSERVABLE,
  LAST_CHANGE_OBSERVABLE,
  HOSTNAME: hostname,
  PORT_NUMBER: portNumber,
});
const thingDescription = placeholderReplacer.replace(thingModel);
thingDescription["@type"] = "Thing";

const defaultForm = {
  "href": "",
  "contentType": "application/json",
  "op": []
}

//add properties forms
for (const key in thingDescription['properties']) {

  thingDescription['properties'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `${url}/properties/${key}`
  newForm['op'] = ["observeproperty", "unobserveproperty", "readproperty"]

  thingDescription['properties'][key]['forms'].push(newForm)
}

//add actions forms
for (const key in thingDescription['actions']) {

  thingDescription['actions'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `${url}/actions/${key}`
  newForm['op'] = ["invokeaction"]

  thingDescription['actions'][key]['forms'].push(newForm)
}

//add events forms
for (const key in thingDescription['events']) {

  thingDescription['events'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `${url}/events/${key}`
  newForm['op'] = ["subscribeevent", "unsubscribeevent"]
                 
  thingDescription['events'][key]['forms'].push(newForm)
}

//Creating the TD for testing purposes
try {
  fs.writeFileSync('http-calculator-thing-simple.td.jsonld', JSON.stringify(thingDescription, null, 2))
} catch (err) {
  console.log(err);
}

const reqParser = bodyParser.text({ type: "*/*" });

let result = 0;
let lastChange = "";

app.get(`/${thingName}`, (req, res) => {
  res.end(JSON.stringify(thingDescription));
});

app.get(`/${thingName}/properties/result`, (req, res) => {
  res.end(result.toString());
});

app.get(`/${thingName}/properties/lastChange`, (req, res) => {
  res.end(lastChange);
});

app.post(`/${thingName}/actions/add`, reqParser, (req, res) => {
  const parsedInput = parseInt(req.body);

  if (isNaN(parsedInput)) {
    res.status(400).send("Input should be a valid integer");
  } else {
    result += parsedInput;
    lastChange = new Date().toLocaleTimeString();
    res.end(result.toString());
  }
});

app.post(`/${thingName}/actions/subtract`, reqParser, (req, res) => {
  const parsedInput = parseInt(req.body);

  if (isNaN(parsedInput)) {
    res.status(400).send("Input should be a valid integer");
  } else {
    result -= parsedInput;
    lastChange = new Date().toLocaleTimeString();
    res.end(result.toString());
  }
});

app.get(`/${thingName}/events/update`, (req, res) => {
  res.statusCode = 200;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream");

  let oldResult = result;

  /**
   ** The SSE specification defines the structure of SSE messages, and
   ** it expects event data to be formatted with "data:" followed by the
   ** actual data. When you deviate from this standard, it might not be
   ** interpreted correctly by the client, which could create empty values.
   */
  const changeInterval = setInterval(() => {
    if (oldResult !== result) {
      res.write(`data: ${result}\n\n`);
      oldResult = result;
    }
  }, 1000);

  res.on("finish", () => {
    clearInterval(changeInterval);
  });
});

app.listen(portNumber, () => {
  console.log(`Started listening to on port ${portNumber}`);
  console.log("ThingIsReady");
});
