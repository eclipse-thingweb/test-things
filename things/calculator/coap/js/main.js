const { parseArgs } = require('node:util')
const coap = require('coap')
const fs = require('fs')
const path = require('path')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
const cbor = require('cbor')
require('dotenv').config()

const server = coap.createServer()
const hostname = 'localhost'
let portNumber = 5683

const thingName = 'coap-calculator'
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
  PROTOCOL: 'coap',
  THING_NAME: thingName,
  PROPERTIES,
  ACTIONS,
  EVENTS,
  HOSTNAME: hostname,
  PORT_NUMBER: portNumber
})

/*****************************************/
/************ Creating the TD ************/
/*****************************************/

const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

const supportedContentTypes = ['text/plain', 'application/json', 'application/cbor'];
const formatIdentifiers = {
  "text/plain": 0,
  "application/json": 50,
  "application/cbor": 60
}

//Adding headers to the Properties
for (const key in thingDescription['properties']) {

  // Setting the original form with the necessary values to then duplicate
  thingDescription['properties'][key]['forms'][0]['contentType'] = "text/plain"
  thingDescription['properties'][key]['forms'][0]['cov:contentFormat'] = 0
  thingDescription['properties'][key]['forms'][0]['cov:method'] = 'GET'
  thingDescription['properties'][key]['forms'][0]['cov:accept'] = 0
  thingDescription['properties'][key]['forms'][0]['response'] = {
    "contentType": "text/plain",
    "cov:contentFormat": 0
  }

  //Getting the original form to use as reference
  const originalForm = thingDescription['properties'][key]['forms'][0]

  for (const identifier in formatIdentifiers) {
    /**
     * Checking if the original form does not have the json and cbor formats, and cloning 
     * the original format but adding the different formats
     */
    if (thingDescription['properties'][key]['forms'][0]['cov:accept'] !== formatIdentifiers[identifier]) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['contentType'] = identifier
      newForm['cov:contentFormat'] = formatIdentifiers[identifier]
      newForm['cov:accept'] = formatIdentifiers[identifier]
      newForm['response']['contentType'] = identifier
      newForm['response']['cov:contentFormat'] = formatIdentifiers[identifier]
      thingDescription['properties'][key]['forms'].push(newForm)
    }

  }
}

//Adding headers to the Actions
for (const key in thingDescription['actions']) {

  // Setting the original form with the necessary values to then duplicate
  thingDescription['actions'][key]['forms'][0]['contentType'] = "text/plain"
  thingDescription['actions'][key]['forms'][0]['cov:contentFormat'] = 0
  thingDescription['actions'][key]['forms'][0]['cov:method'] = 'POST'
  thingDescription['actions'][key]['forms'][0]['cov:accept'] = 0
  thingDescription['actions'][key]['forms'][0]['response'] = {
    "contentType": "text/plain",
    "cov:contentFormat": 0
  }

  //Getting the original form to use as reference
  const originalForm = thingDescription['actions'][key]['forms'][0]

  for (const identifier in formatIdentifiers) {

    /**
     * Checking if the original form does not have the formats from the "formatIdentifiers" object and 
     * duplicating the original for with the new formats.
     * If it does have it, duplicate the original one, but modify the response and accept header to include
     * the other headers.
     */

    if (thingDescription['actions'][key]['forms'][0]['cov:accept'] !== formatIdentifiers[identifier]) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['contentType'] = identifier
      newForm['cov:contentFormat'] = formatIdentifiers[identifier]
      thingDescription['actions'][key]['forms'].push(newForm)

      /**
       * Cloning the forms with the new format, but modifying the accept and response headers 
       * to include the different formats
       */
      for (const identifier in formatIdentifiers) {
        if (thingDescription['actions'][key]['forms'][0]['cov:accept'] !== formatIdentifiers[identifier]) {
          const newFormAccept = JSON.parse(JSON.stringify(newForm))
          newFormAccept['cov:accept'] = formatIdentifiers[identifier]
          newFormAccept['response']['contentType'] = identifier
          newFormAccept['response']['cov:contentFormat'] = formatIdentifiers[identifier]
          thingDescription['actions'][key]['forms'].push(newFormAccept)
        }
      }
    }
    else {
      for (const identifier in formatIdentifiers) {
        if (originalForm['cov:accept'] !== formatIdentifiers[identifier]) {
          const newForm = JSON.parse(JSON.stringify(originalForm))
          newForm['cov:accept'] = formatIdentifiers[identifier]
          newForm['response']['contentType'] = identifier
          newForm['response']['cov:contentFormat'] = formatIdentifiers[identifier]
          thingDescription['actions'][key]['forms'].push(newForm)
        }
      }
    }

  }
}


//Adding headers to the Events
for (const key in thingDescription['events']) {

  // Setting the original form with the necessary values to then duplicate
  thingDescription['events'][key]['forms'][0]['contentType'] = "text/plain"
  thingDescription['events'][key]['forms'][0]['cov:contentFormat'] = 0
  thingDescription['events'][key]['forms'][0]['cov:method'] = 'GET'
  thingDescription['events'][key]['forms'][0]['cov:accept'] = 0
  thingDescription['events'][key]['forms'][0]['response'] = {
    "contentType": "text/plain",
    "cov:contentFormat": 0
  }
  thingDescription['events'][key]['forms'][0]["subprotocol"] = "cov:observe"
  thingDescription['events'][key]['forms'][0]["op"].push("observeproperty")

  const originalForm = thingDescription['events'][key]['forms'][0]

  for (const identifier in formatIdentifiers) {
    /**
     * Checking if the original form does not have the json and cbor formats, and cloning 
     * the original format but adding the different formats
     */
    if (thingDescription['events'][key]['forms'][0]['cov:accept'] !== formatIdentifiers[identifier]) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['contentType'] = identifier
      newForm['cov:contentFormat'] = formatIdentifiers[identifier]
      newForm['cov:accept'] = formatIdentifiers[identifier]
      newForm['response']['contentType'] = identifier
      newForm['response']['cov:contentFormat'] = formatIdentifiers[identifier]
      thingDescription['events'][key]['forms'].push(newForm)
    }
  }
}

//Creating the TD for testing purposes
try {
  fs.writeFileSync('coap-calculator-thing.td.jsonld', JSON.stringify(thingDescription, null, 2))
} catch (err) {
  console.log(err);
}


/*********************************************************/
/************** Main server functionality ****************/
/*********************************************************/
let result = 0
let lastChange = 'No changes made so far'

server.on('request', (req, res) => {
  const segments = req.url.split('/')
  // console.log(segments);
  const acceptHeaders = req.headers["Accept"]
  const reqContentType = req.headers["Content-Type"] || req.headers["Content-Format"]


  if (segments[1] !== thingName) {
    res.code = 404
    res.end('Thing does not exist!')
  } else {
    if (!segments[2]) {
      //TODO: Understand and fix the problem with block wise transfer to be able to pass the headers properly
      if (req.method === 'GET') {

        if (supportedContentTypes.includes(acceptHeaders) || acceptHeaders === undefined) {
          if (acceptHeaders === undefined) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify(thingDescription))
          }
          else if (acceptHeaders.includes('application/json')) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify(thingDescription))
          }
          else if (acceptHeaders.includes('application/cbor')) {
            const cborData = cbor.encode(JSON.stringify(thingDescription))
            res.setOption('Content-Format', 'application/cbor')
            res.end(cborData)
          }
          else {
            res.setOption('Content-Format', 'text/plain')
            res.end(JSON.stringify(thingDescription))
          }
        }
        else {
          res.code = 415
          res.end(`Unsupported Content-Format: ${acceptHeaders}`)
        }
      }
    }
  }

  if (segments[2] === 'properties') {
    if (segments[3] === 'result') {
      if (req.method === 'GET') {

        if (acceptHeaders === undefined) {
          res.setOption('Content-Format', 'application/json')
          res.end(JSON.stringify({ "result": result }))
        }
        else if (acceptHeaders.includes('application/json')) {
          res.setOption('Content-Format', 'application/json')
          res.end(JSON.stringify({ "result": result }))
        }
        else if (acceptHeaders.includes('application/cbor')) {
          const cborData = cbor.encode(result)
          res.setOption('Content-Format', 'application/cbor')
          res.end(cborData)
        }
        else {
          res.setOption('Content-Format', 'text/plain')
          res.end(result.toString())
        }
      }
    }

    if (segments[3] === 'lastChange') {
      if (req.method === 'GET') {
        if (acceptHeaders === undefined) {
          res.setOption('Content-Format', 'application/json')
          res.end(JSON.stringify({ "lastChange": lastChange }))
        }
        else if (acceptHeaders.includes('application/json')) {
          res.setOption('Content-Format', 'application/json')
          res.end(JSON.stringify({ "lastChange": lastChange }))
        }
        else if (acceptHeaders.includes('application/cbor')) {
          const cborData = cbor.encode(lastChange)
          res.setOption('Content-Format', 'application/cbor')
          res.end(cborData)
        }
        else {
          res.setOption('Content-Format', 'text/plain')
          res.end(lastChange)
        }
      }
    }
  }

  if (segments[2] === 'actions' && req.method === 'POST') {
    if (segments[3] === 'add') {

      if (supportedContentTypes.includes(reqContentType)) {
        let numberToAdd

        if (reqContentType.includes('application/json')) {
          numberToAdd = JSON.parse(req.payload.toString())["data"]
        }
        else if (reqContentType.includes('application/cbor')) {
          numberToAdd = cbor.decode(req.payload);
        }
        else {
          numberToAdd = req.payload.toString()
        }

        const parsedInput = parseInt(numberToAdd)

        if (isNaN(parsedInput)) {
          res.code = 400
          res.end('Input should be a valid integer')
        } else {
          result += parsedInput
          lastChange = (new Date()).toLocaleTimeString()

          if (acceptHeaders === undefined) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify({ "additionResult": result }))
          }
          else if (acceptHeaders.includes('application/json')) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify({ "additionResult": result }))
          }
          else if (acceptHeaders.includes('application/cbor')) {
            const cborData = cbor.encode(result)
            res.setOption('Content-Format', 'application/cbor')
            res.end(cborData)
          }
          else {
            res.setOption('Content-Format', 'text/plain')
            res.end(result.toString())
          }
        }

      } else {
        res.code = 415
        res.end(`Unsupported Content-Format`)
      }
    }

    if (segments[3] === 'subtract') {

      if (supportedContentTypes.includes(reqContentType)) {
        let numberToSubtract

        if (reqContentType.includes('application/json')) {
          numberToSubtract = JSON.parse(req.payload.toString())["data"]
        }
        else if (reqContentType.includes('application/cbor')) {
          numberToSubtract = cbor.decode(req.payload);
        }
        else {
          numberToSubtract = req.payload.toString()
        }

        const parsedInput = parseInt(numberToSubtract)

        if (isNaN(parsedInput)) {
          res.code = 400
          res.end('Input should be a valid integer')
        } else {
          result -= parsedInput
          lastChange = (new Date()).toLocaleTimeString()

          if (acceptHeaders === undefined) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify({ "subtractionResult": result }))
          }
          else if (acceptHeaders.includes('application/json')) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify({ "subtractionResult": result }))
          }
          else if (acceptHeaders.includes('application/cbor')) {
            const cborData = cbor.encode(result)
            res.setOption('Content-Format', 'application/cbor')
            res.end(cborData)
          }
          else {
            res.setOption('Content-Format', 'text/plain')
            res.end(result.toString())
          }
        }

      } else {
        res.code = 415
        res.end(`Unsupported Content-Format`)
      }
    }
  }

  if (segments[2] === 'events' && req.method === 'GET') {
    if (segments[3] === 'update') {
      if (req.headers.Observe === 0) {
        if (supportedContentTypes.includes(acceptHeaders) || acceptHeaders === undefined) {
          res.setOption('Content-Format', 'text/plain')
          console.log('Observing the change...')

          let oldResult = result

          const changeInterval = setInterval(() => {
            res.setOption('Content-Format', 'text/plain')
            res.write('stay connected!')

            if (oldResult !== result) {
              res.code = 205
              if (acceptHeaders === undefined) {
                res.setOption('Content-Format', 'application/json')
                res.write(JSON.stringify({ "Result": result }))
                oldResult = result
              }
              else if (acceptHeaders.includes('application/json')) {
                res.setOption('Content-Format', 'application/json')
                res.write(JSON.stringify({ "Result": result }))
                oldResult = result
              }
              else if (acceptHeaders.includes('application/cbor')) {
                const cborData = cbor.encode(result)
                res.setOption('Content-Format', 'application/cbor')
                res.write(cborData)
                oldResult = result
              }
              else {
                res.setOption('Content-Format', 'text/plain')
                res.write(result.toString())
                oldResult = result
              }
            }
          }, 1000)

          res.on('finish', () => {
            clearInterval(changeInterval)
          })
        }
        else {
          res.setOption('Content-Format', 'text/plain')
          res.code = 415
          res.end(`Unsupported Content-Format: ${acceptHeaders}`)
        }
      } else {
        res.end()
      }
    }
  }
})

server.listen(portNumber, () => {
  console.log(`Started listening to on port ${portNumber}...`)
  console.log('ThingIsReady')
})