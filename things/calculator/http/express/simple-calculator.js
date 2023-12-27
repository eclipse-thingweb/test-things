const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const { parseArgs } = require("node:util");
const { JsonPlaceholderReplacer } = require("json-placeholder-replacer");
require("dotenv").config();

const app = express();
app.use(express.json({ strict: false }));

const hostname = "localhost";
let portNumber = 3000;
const thingName = "http-express-calculator-simple";

const fullTDEndPoint = `/${thingName}`,
  resultEndPoint = `/${thingName}/properties/result`,
  resultEndPointObserve = `${resultEndPoint}/observe`,
  lastChangeEndPoint = `/${thingName}/properties/lastChange`,
  lastChangeEndPointObserve = `${lastChangeEndPoint}/observe`,
  additionEndPoint = `/${thingName}/actions/add`,
  subtractionEndPoint = `/${thingName}/actions/subtract`,
  updateEndPoint = `/${thingName}/events/update`

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
  LAST_CHANGE_OBSERVABLE: true
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

  const newFormRead = JSON.parse(JSON.stringify(defaultForm))
  newFormRead['href'] = `properties/${key}`
  newFormRead['op'] = ["readproperty"]

  const newFormObs = JSON.parse(JSON.stringify(newFormRead))
  newFormObs['href'] = `properties/${key}/observe`
  newFormObs['op'] = ["observeproperty", "unobserveproperty"]
  newFormObs['subprotocol'] = "sse"

  thingDescription['properties'][key]['forms'].push(newFormRead)
  thingDescription['properties'][key]['forms'].push(newFormObs)
}

//add actions forms
for (const key in thingDescription['actions']) {

  thingDescription['actions'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `actions/${key}`
  newForm['op'] = ["invokeaction"]

  thingDescription['actions'][key]['forms'].push(newForm)
}

//add events forms
for (const key in thingDescription['events']) {

  thingDescription['events'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `events/${key}`
  newForm['op'] = ["subscribeevent", "unsubscribeevent"]
  newForm['subprotocol'] = "sse"
                 
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
let lastChange = "No changes made";

/******************************************/
/************** Middleware ****************/
/******************************************/

//Middleware to ensure the right method is been used for each endpoint
app.use((req, res, next) => {
  const method = req.method
  const endpoint = req.url

  if (endpoint === fullTDEndPoint || endpoint === resultEndPoint || endpoint === resultEndPointObserve || endpoint === lastChangeEndPoint || endpoint === lastChangeEndPointObserve || endpoint === updateEndPoint) {
    if (method === 'GET') {
      next()
    } else {
      res.status(405).json('Method Not Allowed');
    }
  }

  if (endpoint === additionEndPoint || endpoint === subtractionEndPoint) {
    if (method === 'POST') {
      next()
    } else {
      res.status(405).json('Method Not Allowed');
    }
  }
})


/******************************************/
/*************** Endpoints ****************/
/******************************************/

app.get(fullTDEndPoint, (req, res) => {
  res.json(thingDescription);
});

app.get(resultEndPoint, (req, res) => {
  res.json(result);
});

app.get(resultEndPointObserve, (req, res) => {
  res.statusCode = 200;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream");

  let oldResult = result;

  const changeInterval = setInterval(() => {
    res.write(`data: "Waiting for change.."\n\n`);

    if (oldResult !== result) {
      res.write(`data: ${result}\n\n`);
      oldResult = result;
    }
  }, 1000);

  res.on("finish", () => {
    clearInterval(changeInterval);
  });
});

app.get(lastChangeEndPoint, (req, res) => {
  res.json(lastChange);
});

app.get(lastChangeEndPointObserve, (req, res) => {
  res.statusCode = 200;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream");

  let oldLastChange = lastChange;

  const changeInterval = setInterval(() => {
    res.write(`data: "Waiting for change.."\n\n`);

    if (oldLastChange !== lastChange) {
      res.write(`data: ${lastChange}\n\n`);
      oldLastChange = lastChange;
    }
  }, 1000);

  res.on("finish", () => {
    clearInterval(changeInterval);
  });
});

app.post(additionEndPoint, reqParser, (req, res) => {
  const bodyInput = req.body

  if(typeof bodyInput !== "number") {
    res.status(400).json("Input should be a valid integer");
  } else {
    result += bodyInput;
    lastChange = new Date();
    res.json(result);
  }
});

app.post(subtractionEndPoint, reqParser, (req, res) => {
  const bodyInput = req.body

  if(typeof bodyInput !== "number") {
    res.status(400).json("Input should be a valid integer");
  } else {
    result -= bodyInput;
    lastChange = new Date();
    res.json(result);
  }
});

app.get(updateEndPoint, (req, res) => {
  res.statusCode = 200;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("connection", "keep-alive");
  res.setHeader("Content-Type", "text/event-stream");

  let oldResult = result;

  /**
   * The SSE specification defines the structure of SSE messages, and
   * it expects event data to be formatted with "data:" followed by the
   * actual data. When you deviate from this standard, it might not be
   * interpreted correctly by the client, which could create empty values.
   */
  const changeInterval = setInterval(() => {
    res.write(`data: "Waiting for change.."\n\n`);

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
  console.log(`Started listening to localhost on port ${portNumber}`);
  console.log("ThingIsReady");
});
