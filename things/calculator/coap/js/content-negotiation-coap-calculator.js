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
const thingName = 'coap-calculator-content-negotiation'

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
  HOSTNAME: hostname,
  PORT_NUMBER: portNumber,
  RESULT_OBSERVABLE: false,
  LAST_CHANGE_OBSERVABLE: false
})

/*****************************************/
/************ Creating the TD ************/
/*****************************************/

const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

const supportedContentTypes = ['application/json', 'application/cbor'];
const formatIdentifiers = {
  'application/json': 50,
  'application/cbor': 60
}

const defaultForm = {
  'href': '',
  'contentType': 'application/json',
  'cov:contentFormat': 50,
  'op': '',
  'cov:method': '',
  'cov:accept': 50,
  'response': {
    'contentType': 'application/json',
    'cov:contentFormat': 50
  }
}

//Adding headers to the Properties
for (const key in thingDescription['properties']) {

  thingDescription['properties'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `properties/${key}`
  newForm['cov:method'] = 'GET'
  newForm['op'] = 'readproperty'

  thingDescription['properties'][key]['forms'].push(newForm)

  const originalForm = thingDescription['properties'][key]['forms'][0]

  for (const identifier in formatIdentifiers) {
    if (originalForm['contentType'] !== identifier) {
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

  thingDescription['actions'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `actions/${key}`
  newForm['cov:method'] = 'POST'
  newForm['op'] = 'invokeaction'

  thingDescription['actions'][key]['forms'].push(newForm)

  const originalForm = thingDescription['actions'][key]['forms'][0]

  for (const identifier in formatIdentifiers) {
    /**
     * Checking if the original form does not have the formats from the 'formatIdentifiers' object and 
     * duplicating the original form with the new formats.
     * If it does have it, duplicate the original one, but modify the response and accept header to include
     * the other headers.
     */
    if (originalForm['contentType'] !== identifier) {
      const newForm = JSON.parse(JSON.stringify(originalForm))
      newForm['contentType'] = identifier
      newForm['cov:contentFormat'] = formatIdentifiers[identifier]
      newForm['cov:accept'] = formatIdentifiers[identifier]
      newForm['response']['contentType'] = identifier
      newForm['response']['cov:contentFormat'] = formatIdentifiers[identifier]
      thingDescription['actions'][key]['forms'].push(newForm)

      /**
       * Cloning the forms with the new format, but modifying the accept and response headers 
       * to include the different formats
       */
      for (const identifier in formatIdentifiers) {
        if (newForm['cov:accept'] !== formatIdentifiers[identifier]) {
          const newFormAccept = JSON.parse(JSON.stringify(newForm))
          newFormAccept['cov:accept'] = formatIdentifiers[identifier]
          newFormAccept['response']['contentType'] = identifier
          newFormAccept['response']['cov:contentFormat'] = formatIdentifiers[identifier]
          thingDescription['actions'][key]['forms'].push(newFormAccept)
        }
      }
    } else {
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

  thingDescription['events'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `events/${key}`
  newForm['cov:method'] = 'GET'
  newForm['op'] = ["subscribeevent", "unsubscribeevent"],

  
  newForm['subprotocol'] = 'cov:observe'

  thingDescription['events'][key]['forms'].push(newForm)

  const originalForm = thingDescription['events'][key]['forms'][0]

  for (const identifier in formatIdentifiers) {
    if (originalForm['contentType'] !== identifier) {
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
  fs.writeFileSync('coap-calculator-thing-content-negotiation.td.jsonld', JSON.stringify(thingDescription, null, 2))
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
  const acceptHeaders = req.headers['Accept']
  const reqContentType = req.headers['Content-Type'] || req.headers['Content-Format']


  if (segments[1] !== thingName) {
    res.code = 404
    res.end('Thing does not exist!')
  } else {
    if (!segments[2]) {
      //TODO: Fix the problem with block wise transfer to be able to pass the headers properly
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
          else {
            const cborData = cbor.encode(JSON.stringify(thingDescription))
            res.setOption('Content-Format', 'application/cbor')
            res.end(cborData)
          }
        }
        else {
          res.code = 406
          res.end(`Not Acceptable: ${acceptHeaders}`)
        }
      }
    }
  }

  if (segments[2] === 'properties') {
    if (segments[3] === 'result') {
      if (req.method === 'GET') {

        if (supportedContentTypes.includes(acceptHeaders) || acceptHeaders === undefined) {
          if (acceptHeaders === undefined) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify({ 'result': result }))
          }
          else if (acceptHeaders.includes('application/json')) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify({ 'result': result }))
          }
          else {
            const cborData = cbor.encode(result)
            res.setOption('Content-Format', 'application/cbor')
            res.end(cborData)
          }
        }
        else {
          res.code = 406
          res.end(`Not Acceptable: ${acceptHeaders}`)
        }
      }
    }

    if (segments[3] === 'lastChange') {
      if (req.method === 'GET') {

        if (supportedContentTypes.includes(acceptHeaders) || acceptHeaders === undefined) {
          if (acceptHeaders === undefined) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify({ 'lastChange': lastChange }))
          }
          else if (acceptHeaders.includes('application/json')) {
            res.setOption('Content-Format', 'application/json')
            res.end(JSON.stringify({ 'lastChange': lastChange }))
          }
          else {
            const cborData = cbor.encode(lastChange)
            res.setOption('Content-Format', 'application/cbor')
            res.end(cborData)
          }
        }
        else {
          res.code = 406
          res.end(`Not Acceptable: ${acceptHeaders}`)
        }
      }
    }
  }

  if (segments[2] === 'actions' && req.method === 'POST') {
    if (segments[3] === 'add') {

      if (supportedContentTypes.includes(reqContentType)) {
        let numberToAdd

        if (reqContentType.includes('application/json')) {
          numberToAdd = JSON.parse(req.payload.toString())['data']
        }
        else {
          numberToAdd = cbor.decode(req.payload);
        }

        const parsedInput = parseInt(numberToAdd)

        if (isNaN(parsedInput)) {
          res.code = 400
          res.end('Input should be a valid integer')
        }
        else {
          if (supportedContentTypes.includes(acceptHeaders) || acceptHeaders === undefined) {
            result += parsedInput
            lastChange = (new Date()).toLocaleTimeString()

            if (acceptHeaders === undefined) {
              res.setOption('Content-Format', 'application/json')
              res.end(JSON.stringify({ 'additionResult': result }))
            }
            else if (acceptHeaders.includes('application/json')) {
              res.setOption('Content-Format', 'application/json')
              res.end(JSON.stringify({ 'additionResult': result }))
            }
            else {
              const cborData = cbor.encode(result)
              res.setOption('Content-Format', 'application/cbor')
              res.end(cborData)
            }
          }
          else {
            res.code = 406
            res.end(`Not Acceptable: ${acceptHeaders}`)
          }
        }
      } else {
        res.code = 415
        res.end(`Unsupported Content-Format: ${reqContentType}`)
      }
    }

    if (segments[3] === 'subtract') {

      if (supportedContentTypes.includes(reqContentType)) {
        let numberToSubtract

        if (reqContentType.includes('application/json')) {
          numberToSubtract = JSON.parse(req.payload.toString())['data']
        }
        else {
          numberToSubtract = cbor.decode(req.payload);
        }

        const parsedInput = parseInt(numberToSubtract)

        if (isNaN(parsedInput)) {
          res.code = 400
          res.end('Input should be a valid integer')
        }
        else {
          if (supportedContentTypes.includes(acceptHeaders) || acceptHeaders === undefined) {
            result -= parsedInput
            lastChange = (new Date()).toLocaleTimeString()

            if (acceptHeaders === undefined) {
              res.setOption('Content-Format', 'application/json')
              res.end(JSON.stringify({ 'subtractionResult': result }))
            }
            else if (acceptHeaders.includes('application/json')) {
              res.setOption('Content-Format', 'application/json')
              res.end(JSON.stringify({ 'subtractionResult': result }))
            }
            else {
              const cborData = cbor.encode(result)
              res.setOption('Content-Format', 'application/cbor')
              res.end(cborData)
            }
          }
          else {
            res.code = 406
            res.end(`Not Acceptable: ${acceptHeaders}`)
          }
        }
      } else {
        res.code = 415
        res.end(`Unsupported Content-Format: ${reqContentType}`)
      }
    }
  }

  if (segments[2] === 'events' && req.method === 'GET') {
    if (segments[3] === 'update') {
      if (req.headers.Observe === 0) {
        if (supportedContentTypes.includes(acceptHeaders) || acceptHeaders === undefined) {
          console.log('Observing the change...')

          let oldResult = result

          const changeInterval = setInterval(() => {
            res.setOption('Content-Format', 'application/json')
            res.write(JSON.stringify({ 'Result': 'Stay connected!' }))

            if (oldResult !== result) {
              res.statusCode = 205
              if (acceptHeaders === undefined) {
                res.setOption('Content-Format', 'application/json')
                res.write(JSON.stringify({ 'Result': result }))
                oldResult = result
              }
              else if (acceptHeaders.includes('application/json')) {
                res.setOption('Content-Format', 'application/json')
                res.write(JSON.stringify({ 'Result': result }))
                oldResult = result
              }
              else {
                const cborData = cbor.encode(result)
                res.setOption('Content-Format', 'application/cbor')
                res.write(cborData)
                oldResult = result
              }
            }
          }, 1000)

          res.on('finish', () => {
            clearInterval(changeInterval)
          })
        }
        else {
          res.statusCode = 406
          res.end(`Not Acceptable: ${acceptHeaders}`)
        }
      } else {
        res.end()
      }
    }
  }
})

server.listen(portNumber, () => {
  console.log(`Started listening to localhost on port ${portNumber}...`)
  console.log('ThingIsReady')
})