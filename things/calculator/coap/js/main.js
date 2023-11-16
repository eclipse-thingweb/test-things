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
  PORT_NUMBER: portNumber,
  LAST_CHANGE_OBSERVABLE: true,
  RESULT_OBSERVABLE: true
})

/*****************************************/
/************ Creating the TD ************/
/*****************************************/

const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

//Modifying TD
const defaultForm = {
  "href": "",
  "contentType": "application/json",
  "op": []
}

for (const key in thingDescription['properties']) {

  thingDescription['properties'][key]['forms'] = []

  const newFormRead = JSON.parse(JSON.stringify(defaultForm))
  newFormRead['href'] = `properties/${key}`
  newFormRead['op'] = ["readproperty"]

  thingDescription['properties'][key]['forms'].push(newFormRead)
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
  newForm['subprotocol'] = "cov:observe"
                 
  thingDescription['events'][key]['forms'].push(newForm)
}

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