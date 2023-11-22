const express = require('express')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const { parseArgs } = require('node:util')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
const cbor = require('cbor')
require('dotenv').config()

const app = express()

const hostname = 'localhost'
let portNumber = 3000
const thingName = 'http-express-calculator-content-negotiation'
const url = `http://localhost:3000/${thingName}`

const fullTDEndPoint = `/${thingName}`,
  resultEndPoint = `/${thingName}/properties/result`,
  lastChangeEndPoint = `/${thingName}/properties/lastChange`,
  additionEndPoint = `/${thingName}/actions/add`,
  subtractionEndPoint = `/${thingName}/actions/subtract`,
  updateEndPoint = `/${thingName}/events/update`

let result = 0
let lastChange = 'No changes made so far'

const { values: { port } } = parseArgs({
  options: {
    port: {
      type: 'string',
      short: 'p'
    }
  }
})

if (port && !isNaN(parseInt(port))) {
  portNumber = parseInt(port)
}

const tmPath = process.env.TM_PATH

if (process.platform === 'win32') {
  tmPath.split(path.sep).join(path.win32.sep)
}

const thingModel = JSON.parse(fs.readFileSync(path.join(__dirname, tmPath)))

const placeholderReplacer = new JsonPlaceholderReplacer()
placeholderReplacer.addVariableMap({
  PROTOCOL: 'http',
  THING_NAME: thingName,
  HOSTNAME: hostname,
  PORT_NUMBER: portNumber,
  RESULT_OBSERVABLE: true,
  LAST_CHANGE_OBSERVABLE: true
})

const defaultForm =
{
  "href": "",
  "contentType": "application/json",
  "response": "application/json",
  "op": "",
  "htv:methodName": "",
  "htv:headers": [
    {
      "@type": "htv:RequestHeader",
      "fieldValue": "application/json",
      "fieldName": "Accept"
    }
  ]
}

const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

const supportedContentTypes = ['application/json', 'application/cbor'];

//Adding headers to the Properties
for (const key in thingDescription['properties']) {

  thingDescription['properties'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `${url}/properties/${key}`
  newForm['htv:methodName'] = 'GET'
  newForm['op'] = 'readproperty'

  thingDescription['properties'][key]['forms'].push(newForm)

  const originalForm = thingDescription['properties'][key]['forms'][0]

  supportedContentTypes.forEach(type => {
    if (!thingDescription['properties'][key]['forms'][0]['contentType'].includes(type)) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['contentType'] = type
      newForm['response'] = type
      newForm['htv:headers'][0]['fieldValue'] = type
      thingDescription['properties'][key]['forms'].push(newForm)
    }
  })
}

//Adding headers to the Actions
for (const key in thingDescription['actions']) {

  thingDescription['actions'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `${url}/actions/${key}`
  newForm['htv:methodName'] = 'POST'
  newForm['op'] = 'invokeaction'

  thingDescription['actions'][key]['forms'].push(newForm)

  const originalForm = thingDescription['actions'][key]['forms'][0]

  supportedContentTypes.forEach(type => {
    if (!thingDescription['actions'][key]['forms'][0]['contentType'].includes(type)) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['contentType'] = type
      thingDescription['actions'][key]['forms'].push(newForm)

      supportedContentTypes.forEach(type => {
        if (!thingDescription['actions'][key]['forms'][0]['response'].includes(type)) {
          const newFormAccept = JSON.parse(JSON.stringify(newForm))
          newFormAccept['response'] = type
          newFormAccept['htv:headers'][0]['fieldValue'] = type
          thingDescription['actions'][key]['forms'].push(newFormAccept)
        }
      })
    } else {
      supportedContentTypes.forEach(type => {
        if (!originalForm['response'].includes(type)) {
          const newForm = JSON.parse(JSON.stringify(originalForm))
          newForm['response'] = type
          newForm['htv:headers'][0]['fieldValue'] = type
          thingDescription['actions'][key]['forms'].push(newForm)
        }
      })
    }
  })
}

//Adding headers to the Events

for (const key in thingDescription['events']) {

  thingDescription['events'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `${url}/events/${key}`
  newForm['htv:methodName'] = 'GET'
  newForm['op'] = 'subscribeevent'

  thingDescription['events'][key]['forms'].push(newForm)

  const originalForm = thingDescription['events'][key]['forms'][0]

  supportedContentTypes.forEach(type => {
    if (!thingDescription['events'][key]['forms'][0]['contentType'].includes(type)) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['contentType'] = type
      newForm['response'] = type
      newForm['htv:headers'][0]['fieldValue'] = type
      thingDescription['events'][key]['forms'].push(newForm)
    }
  })
}

//Creating the TD for testing purposes
try {
  fs.writeFileSync('http-calculator-thing-content-negotiation.td.jsonld', JSON.stringify(thingDescription, null, 2))
} catch (err) {
  console.log(err);
}


/******************************************/
/************** Middleware ****************/
/******************************************/

// Middleware to check if supported "Accept" values have been sent
app.use((req, res, next) => {
  const acceptHeader = req.get('Accept')

  if (acceptHeader === undefined) {
    next()
  }
  else if (acceptHeader.includes('application/json') || acceptHeader.includes('application/cbor') || acceptHeader.includes('*/*')) {
    next()
  } else {
    res.status(406).json({ 'msg': 'Not Acceptable: Supported formats are application/json, and application/cbor' });
  }
});


// Middleware to accept only the content-types: text, json, cbor
app.use((req, res, next) => {
  const contentType = req.get('Content-Type')
  const method = req.method

  if (method === 'POST') {
    if (supportedContentTypes.includes(contentType)) {
      next()
    } else {
      res.status(415).json({ 'msg': 'Unsupported Media Type: Supported Content-Types are application/json, and application/cbor' });
    }
  }
  else {
    next()
  }
});

// Use body-parser middleware to parse the request body
app.use(bodyParser.text());
app.use(bodyParser.json({ type: 'application/json' }));
app.use(bodyParser.raw({ type: 'application/cbor' }));


/*****************************************************/
/************** Properties Endpoints *****************/
/*****************************************************/

// Get full thing
app.get(fullTDEndPoint, (req, res) => {
  const acceptHeader = req.get('Accept')

  if (acceptHeader === '*/*' || acceptHeader === undefined) {
    res.json(thingDescription)
  }
  else if (acceptHeader.includes('application/json')) {
    res.json(thingDescription)
  }
  else {
    const cborData = cbor.encode(thingDescription)
    res.setHeader('Content-Type', 'application/cbor')
    res.send(cborData)
  }
})

//Get current result
app.get(resultEndPoint, (req, res) => {
  const acceptHeader = req.get('Accept')

  if (acceptHeader === '*/*' || acceptHeader === undefined) {
    res.json(result)
  }
  else if (acceptHeader.includes('application/json')) {
    res.json(result)
  }
  else {
    const cborData = cbor.encode(result)
    res.setHeader('Content-Type', 'application/cbor')
    res.send(cborData)
  }
})

// Get the time of the last change
app.get(lastChangeEndPoint, (req, res) => {
  const acceptHeader = req.get('Accept')

  if (acceptHeader === '*/*' || acceptHeader === undefined) {
    res.json(lastChange)
  }
  else if (acceptHeader.includes('application/json')) {
    res.json(lastChange)
  }
  else {
    const cborData = cbor.encode(lastChange)
    res.setHeader('Content-Type', 'application/cbor')
    res.send(cborData)
  }
})


// /*****************************************************/
// /*************** Actions Endpoints *******************/
// /*****************************************************/

// Add a number to the current result endpoint
app.post(additionEndPoint, (req, res) => {
  const acceptHeader = req.get('Accept')
  let parsedInput

  //check if the data was sent as cbor or json and if not get the body normally
  if (req.get('Content-Type') === "application/cbor") {
    const decodedData = cbor.decode(req.body);
    parsedInput = parseInt(decodedData)
  }
  else {
    parsedInput = parseInt(req.body.data)
  }

  /**Check if given input is a valid number, if not return an error message,
   * if yes add the new number to the result, update the lastChange variable and
   * return the added number in the accepted format
   */
  if (isNaN(parsedInput)) {
    res.status(400).json({ 'msg': 'Input should be a valid integer' })
  } else {

    if (acceptHeader === '*/*' || acceptHeader === undefined) {
      result += parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      res.json(result)
    }
    else if (acceptHeader.includes('application/json')) {
      result += parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      res.json(result)
    }
    else {
      result += parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      const cborData = cbor.encode(result)
      res.setHeader('Content-Type', 'application/cbor')
      res.send(cborData)
    }
  }
})

// Subtract a number from the current result endpoint
app.post(subtractionEndPoint, (req, res) => {
  const acceptHeader = req.get('Accept')
  let parsedInput

  //check if the data was sent as cbor, json or text, and if not get the body normally
  if (req.get('Content-Type') === "application/cbor") {
    const decodedData = cbor.decode(req.body);
    parsedInput = parseInt(decodedData)
  }
  else {
    parsedInput = parseInt(req.body.data)
  }

  /**Check  if given input is a valid number, if not return an error message,
   * if yes add the new number to the result, update the lastChange variable and
   * return the added number in the accepted format
   */
  if (isNaN(parsedInput)) {
    res.status(400).json({ 'msg': 'Input should be a valid integer' })
  } else {
    if (acceptHeader === '*/*' || acceptHeader === undefined) {
      result -= parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      res.json(result)
    }
    else if (acceptHeader.includes('application/json')) {
      result -= parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      res.json(result)
    }
    else {
      result -= parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      const cborData = cbor.encode(result)
      res.setHeader('Content-Type', 'application/cbor')
      res.send(cborData)
    }
  }
})


// /*****************************************************/
// /**************** Events Endpoints *******************/
// /*****************************************************/

// Get updates when a change to the main result happens endpoint
app.get(updateEndPoint, (req, res) => {
  const acceptHeader = req.get('Accept')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream')

  let oldResult = result

  /**
   * The SSE specification defines the structure of SSE messages, and 
   * it expects event data to be formatted with "data:" followed by the 
   * actual data. When you deviate from this standard, it might not be 
   * interpreted correctly by the client, which could explain why you receive empty values.
   */
  const changeInterval = setInterval(() => {
    res.write(`data: "Waiting for change.."\n\n`);

    if (oldResult !== result) {
      let message

      if (acceptHeader.includes('application/json')) {
        message = `data: ${JSON.stringify({
          'headers': { 'content-type': 'application/json' },
          'result': result
        })}\n\n`
      }
      else {
        const cborData = cbor.encode(result)
        message = `data: ${JSON.stringify({
          'headers': { 'content-type': 'application/cbor' },
          'result': cborData
        })}\n\n`
      }

      res.statusCode = 200
      res.write(message)
      oldResult = result
    }

  }, 1000)


  res.on('finish', () => {
    clearInterval(changeInterval)
  })

})

/************************************************/
/************** Starting Server *****************/
/************************************************/

app.listen(portNumber, () => {
  console.log(`Started listening to localhost on port ${portNumber}`)
  console.log('ThingIsReady')
})