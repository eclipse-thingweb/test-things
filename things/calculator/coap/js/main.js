const { parseArgs } = require('node:util')
const coap = require('coap')
const fs = require('fs')
const path = require('path')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
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
const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

let result = 0
let lastChange = ''

server.on('request', (req, res) => {
  const segments = req.url.split('/')

  if (segments[1] !== thingName) {
    res.code = 404
    res.end('Thing does not exist!')
  } else {
    if (!segments[2]) {
      if (req.method === 'GET') {
        res.end(JSON.stringify(thingDescription))
      }
    }
  }

  if (segments[2] === 'properties') {
    if (segments[3] === 'result') {
      if (req.method === 'GET') {
        res.end(result.toString())
      }
    }

    if (segments[3] === 'lastChange') {
      if (req.method === 'GET') {
        res.end(lastChange)
      }
    }
  }

  if (segments[2] === 'actions' && req.method === 'POST') {
    if (segments[3] === 'add') {
      const parsedInput = parseInt(req.payload.toString())

      if (isNaN(parsedInput)) {
        res.code = 400
        res.end('Input should be a valid integer')
      } else {
        result += parsedInput
        lastChange = (new Date()).toLocaleTimeString()
        res.end(result.toString())
      }
    }

    if (segments[3] === 'subtract') {
      const parsedInput = parseInt(req.payload.toString())

      if (isNaN(parsedInput)) {
        res.code = 400
        res.end('Input should be a valid integer')
      } else {
        result -= parsedInput
        lastChange = (new Date()).toLocaleTimeString()
        res.end(result.toString())
      }
    }
  }

  if (segments[2] === 'events' && req.method === 'GET') {
    if (segments[3] === 'change') {
      if (req.headers.Observe === 0) {
        console.log('Observing the change...')
        res.code = 205

        let oldResult = result
        const changeInterval = setInterval(() => {
          res.write('stay connected!')
          if (oldResult !== result) {
            res.write(`result: ${result}\n`)
            oldResult = result
          }
        }, 1000)

        res.on('finish', () => {
          clearInterval(changeInterval)
        })
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
