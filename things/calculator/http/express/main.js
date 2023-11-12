const express = require('express')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const { parseArgs } = require('node:util')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
const cbor = require('cbor')
const jsYaml = require('js-yaml')
require('dotenv').config()

const app = express()

const hostname = 'localhost'
let portNumber = 3000

const thingName = 'http-express-calculator'
const PROPERTIES = 'properties'
const ACTIONS = 'actions'
const EVENTS = 'events'

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
  PROPERTIES,
  ACTIONS,
  EVENTS,
  HOSTNAME: hostname,
  PORT_NUMBER: portNumber
})

const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

const supportedContentTypes = ['text/plain', 'application/json', 'application/yaml', 'application/cbor'];

//Adding headers to the Properties
for (const key in thingDescription['properties']) {

  thingDescription['properties'][key]['forms'][0]['htv:methodName'] = 'GET'
  thingDescription['properties'][key]['forms'][0]['htv:RequestHeader'] = {
    "fieldValue": "text/plain",
    "fieldName": "Accept",
  }
  thingDescription['properties'][key]['forms'][0]['htv:ResponseHeader'] = {
    "fieldValue": "text/plain",
    "fieldName": "Content-Type",
  }

  const originalForm = thingDescription['properties'][key]['forms'][0]

  supportedContentTypes.forEach(type => {
    if (!thingDescription['properties'][key]['forms'][0]['htv:RequestHeader']['fieldValue'].includes(type)) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['htv:RequestHeader']['fieldValue'] = type
      newForm['htv:ResponseHeader']['fieldValue'] = type
      thingDescription['properties'][key]['forms'].push(newForm)
    }
  })
}

//Adding headers to the Actions
for (const key in thingDescription['actions']) {

  thingDescription['actions'][key]['forms'][0]['htv:methodName'] = 'POST'
  thingDescription['actions'][key]['forms'][0]['htv:RequestHeader'] = {
    "fieldValue": "text/plain",
    "fieldName": "Accept",
  }
  thingDescription['actions'][key]['forms'][0]['htv:ResponseHeader'] = {
    "fieldValue": "text/plain",
    "fieldName": "Content-Type",
  }

  const originalForm = thingDescription['actions'][key]['forms'][0]

  supportedContentTypes.forEach(type => {
    if (!thingDescription['actions'][key]['forms'][0]['contentType'].includes(type)) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['contentType'] = type
      thingDescription['actions'][key]['forms'].push(newForm)

      supportedContentTypes.forEach(type => {
        if (!thingDescription['actions'][key]['forms'][0]['htv:RequestHeader']['fieldValue'].includes(type)) {
          const newFormAccept = JSON.parse(JSON.stringify(newForm))
          newFormAccept['htv:RequestHeader']['fieldValue'] = type
          newFormAccept['htv:ResponseHeader']['fieldValue'] = type
          thingDescription['actions'][key]['forms'].push(newFormAccept)
        }
      })
    } else {
      supportedContentTypes.forEach(type => {
        if (!originalForm['htv:RequestHeader']['fieldValue'].includes(type)) {
          const newForm = JSON.parse(JSON.stringify(originalForm))
          newForm['htv:RequestHeader']['fieldValue'] = type
          newForm['htv:ResponseHeader']['fieldValue'] = type
          thingDescription['actions'][key]['forms'].push(newForm)
        }
      })
    }
  })
}

//Adding headers to the Events

for (const key in thingDescription['events']) {

  //TODO: Is it necessary to add the method
  // thingDescription['events'][key]['forms'][0]['htv:methodName'] = 'GET'
  thingDescription['events'][key]['forms'][0]['htv:RequestHeader'] = {
    "fieldValue": "text/plain",
    "fieldName": "Accept",
  }

  const originalForm = thingDescription['events'][key]['forms'][0]

  supportedContentTypes.forEach(type => {
    if (!thingDescription['events'][key]['forms'][0]['htv:RequestHeader']['fieldValue'].includes(type)) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['htv:RequestHeader']['fieldValue'] = type
      thingDescription['events'][key]['forms'].push(newForm)
    }
  })
}

//Creating the TD for testing purposes
try {
  fs.writeFileSync('http-calculator-thing.json', JSON.stringify(thingDescription, null, 2))
} catch (err) {
  console.log(err);
}


/******************************************/
/************** Middleware ****************/
/******************************************/

// Middleware to check if supported "Accept" values have been sent
app.use((req, res, next) => {
  const acceptHeader = req.get('Accept')

  if (acceptHeader.includes('text/') || acceptHeader.includes('application/json') || acceptHeader.includes('application/yaml') || acceptHeader.includes('application/cbor')) {
    next()
  } else {
    res.setHeader('Content-Type', 'text/plain')
    res.status(406).send('Not Acceptable: Supported formats are  text/*, application/json, application/yaml, and application/cbor.');
  }
});


// Middleware to accept only the content-types: text, json, yaml, cbor
app.use((req, res, next) => {
  const contentType = req.get('Content-Type')
  const method = req.method

  if (method === 'POST') {
    if (supportedContentTypes.includes(contentType)) {
      next()
    } else {
      res.setHeader('Content-Type', 'text/plain')
      res.status(415).send('Unsupported Media Type: Supported content types are text/plain, application/json, application/yaml, and application/cbor.');
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
app.use(bodyParser.text({ type: 'application/yaml' }));


/*****************************************************/
/************** Properties Endpoints *****************/
/*****************************************************/

let result = 0
let lastChange = 'No changes made so far'

// Get full thing
app.get(`/${thingName}`, (req, res) => {
  const acceptHeader = req.get('Accept')

  if (acceptHeader === '*/*' || acceptHeader === undefined) {
    res.json(thingDescription)
  }
  else if (acceptHeader.includes('application/json')) {
    res.json(thingDescription)
  }
  else if (acceptHeader.includes('application/cbor')) {
    const cborData = cbor.encode(thingDescription)
    res.setHeader('Content-Type', 'application/cbor')
    res.send(cborData)
  }
  else if (acceptHeader.includes('application/yaml')) {
    const yamlData = jsYaml.dump(thingDescription)
    res.setHeader('Content-Type', 'application/yaml')
    res.send(yamlData)
  }
  else {
    res.setHeader('Content-Type', 'text/plain')
    res.send(thingDescription)
  }
})

//Get current result
app.get(`/${thingName}/${PROPERTIES}/result`, (req, res) => {
  const acceptHeader = req.get('Accept')

  if (acceptHeader === '*/*' || acceptHeader === undefined) {
    res.json(result)
  }
  else if (acceptHeader.includes('application/json')) {
    res.json(result)
  }
  else if (acceptHeader.includes('application/cbor')) {
    const cborData = cbor.encode(result)
    res.setHeader('Content-Type', 'application/cbor')
    res.send(cborData)
  }
  else if (acceptHeader.includes('application/yaml')) {
    const yamlData = jsYaml.dump(result)
    res.setHeader('Content-Type', 'application/yaml')
    res.send(yamlData)
  }
  else {
    res.setHeader('Content-Type', 'text/plain')
    res.send(result.toString())
  }
})

// Get the time of the last change
app.get(`/${thingName}/${PROPERTIES}/lastChange`, (req, res) => {
  const acceptHeader = req.get('Accept')

  if (acceptHeader === '*/*' || acceptHeader === undefined) {
    res.json(lastChange)
  }
  else if (acceptHeader.includes('application/json')) {
    res.json(lastChange)
  }
  else if (acceptHeader.includes('application/cbor')) {
    const cborData = cbor.encode(lastChange)
    res.setHeader('Content-Type', 'application/cbor')
    res.send(cborData)
  }
  else if (acceptHeader.includes('application/yaml')) {
    const yamlData = jsYaml.dump(lastChange)
    res.setHeader('Content-Type', 'application/yaml')
    res.send(yamlData)
  }
  else {
    res.setHeader('Content-Type', 'text/plain')
    res.send(lastChange.toString())
  }
})


/*****************************************************/
/*************** Actions Endpoints *******************/
/*****************************************************/

// Add a number to the current result endpoint
app.post(`/${thingName}/${ACTIONS}/add`, (req, res) => {
  const acceptHeader = req.get('Accept')
  let parsedInput

  //check if the data was sent as cbor, json or yaml, and if not get the body normally
  if (req.get('Content-Type') === "application/cbor") {
    const decodedData = cbor.decode(req.body);
    parsedInput = parseInt(decodedData)
  }
  else if (req.get('Content-Type') === "application/json") {
    parsedInput = parseInt(req.body.data)
  }
  else if (req.get('Content-Type') === "application/yaml") {
    yamlToJson = jsYaml.load(req.body)
    parsedInput = parseInt(yamlToJson.data)
  }
  else {
    parsedInput = parseInt(req.body)
  }

  /**Check if given input is a valid number, if not return an error message,
   * if yes add the new number to the result, update the lastChange variable and
   * return the added number in the accepted format
   */
  if (isNaN(parsedInput)) {
    res.setHeader('Content-Type', 'text/plain')
    res.status(400).send('Input should be a valid integer')
  } else {

    if (acceptHeader.includes('application/json')) {
      result += parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      res.json(parsedInput)
    }
    else if (acceptHeader.includes('application/cbor')) {
      result += parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      const cborData = cbor.encode(parsedInput)
      res.setHeader('Content-Type', 'application/cbor')
      res.send(cborData)
    }
    else if (acceptHeader.includes('application/yaml')) {
      result += parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      const yamlData = jsYaml.dump(parsedInput)
      res.setHeader('Content-Type', 'application/yaml')
      res.send(yamlData)
    }
    else {
      result += parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      res.setHeader('Content-Type', 'text/plain')
      res.send(parsedInput.toString())
    }
  }
})

// Subtract a number from the current result endpoint
app.post(`/${thingName}/${ACTIONS}/subtract`, (req, res) => {
  const acceptHeader = req.get('Accept')
  let parsedInput

  //check if the data was sent as cbor, json or yaml, and if not get the body normally
  if (req.get('Content-Type') === "application/cbor") {
    const decodedData = cbor.decode(req.body);
    parsedInput = parseInt(decodedData)
  }
  else if (req.get('Content-Type') === "application/json") {
    parsedInput = parseInt(req.body.data)
  }
  else if (req.get('Content-Type') === "application/yaml") {
    yamlToJson = jsYaml.load(req.body)
    parsedInput = parseInt(yamlToJson.data)
  }
  else {
    parsedInput = parseInt(req.body)
  }

  /**Check  if given input is a valid number, if not return an error message,
   * if yes add the new number to the result, update the lastChange variable and
   * return the added number in the accepted format
   */
  if (isNaN(parsedInput)) {
    res.setHeader('Content-Type', 'text/plain')
    res.status(400).send('Input should be a valid integer')
  } else {
    if (acceptHeader.includes('application/json')) {
      result -= parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      res.json(parsedInput)
    }
    else if (acceptHeader.includes('application/cbor')) {
      result -= parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      const cborData = cbor.encode(parsedInput)
      res.setHeader('Content-Type', 'application/cbor')
      res.send(cborData)
    }
    else if (acceptHeader.includes('application/yaml')) {
      result -= parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      const yamlData = jsYaml.dump(parsedInput)
      res.setHeader('Content-Type', 'application/yaml')
      res.send(yamlData)
    }
    else {
      result -= parsedInput
      lastChange = (new Date()).toLocaleTimeString()
      res.setHeader('Content-Type', 'text/plain')
      res.send(parsedInput.toString())
    }
  }
})


/*****************************************************/
/**************** Events Endpoints *******************/
/*****************************************************/

// Get updates when a change to the main result happens endpoint
//*Changed the endpoint to "/update" instead of "/change" as thats how it is specified in the TD
app.get(`/${thingName}/${EVENTS}/update`, (req, res) => {
  const acceptHeader = req.get('Accept')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream')

  let oldResult = result

  /**
  ** The SSE specification defines the structure of SSE messages, and 
  ** it expects event data to be formatted with "data:" followed by the 
  ** actual data. When you deviate from this standard, it might not be 
  ** interpreted correctly by the client, which could create empty values.
  */
  const changeInterval = setInterval(() => {
    /**
     ** The SSE specification defines the structure of SSE messages, and 
     ** it expects event data to be formatted with "data:" followed by the 
     ** actual data. When you deviate from this standard, it might not be 
     ** interpreted correctly by the client, which could explain why you receive empty values.
     */
    if (oldResult !== result) {
      let message

      if (acceptHeader.includes('text/')) {
        message = `data: ${result}\n\n`
      }
      else if (acceptHeader.includes('application/json')) {
        message = `data: ${result}\n\n`
      }
      else if (acceptHeader.includes('application/yaml')) {
        const yamlData = jsYaml.dump(result).replace(/\n/g, "")
        message = `data: ${yamlData}\n\n`
      }
      if (acceptHeader.includes('application/cbor')) {
        const cborData = cbor.encode(result)
        res.setHeader('Content-Transfer-Encoding', 'base64');
        message = `data: ${cborData.toString('base64')}\n\n`
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
  console.log(`Started listening to on port ${portNumber}`)
  console.log('ThingIsReady')
})