const express = require('express')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const { parseArgs } = require('node:util')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
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

const reqParser = bodyParser.text({ type: '*/*' })

let result = 0
let lastChange = ''

app.get(`/${thingName}`, (req, res) => {
  res.end(JSON.stringify(thingDescription))
})

app.get(`/${thingName}/${PROPERTIES}/result`, (req, res) => {
  res.end(result.toString())
})

app.get(`/${thingName}/${PROPERTIES}/lastChange`, (req, res) => {
  res.end(lastChange)
})

app.post(`/${thingName}/${ACTIONS}/add`, reqParser, (req, res) => {
  const parsedInput = parseInt(req.body)

  if (isNaN(parsedInput)) {
    res.status(400).send('Input should be a valid integer')
  } else {
    result += parsedInput
    lastChange = (new Date()).toLocaleTimeString()
    res.end(result.toString())
  }
})

app.post(`/${thingName}/${ACTIONS}/subtract`, reqParser, (req, res) => {
  const parsedInput = parseInt(req.body)

  if (isNaN(parsedInput)) {
    res.status(400).send('Input should be a valid integer')
  } else {
    result -= parsedInput
    lastChange = (new Date()).toLocaleTimeString()
    res.end(result.toString())
  }
})

app.get(`/${thingName}/${EVENTS}/change`, (req, res) => {
  res.statusCode = 200
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('connection', 'keep-alive')
  res.setHeader('Content-Type', 'text/event-stream')

  let oldResult = result
  const changeInterval = setInterval(() => {
    if (oldResult !== result) {
      res.write(`result: ${result}\n\n`)
      oldResult = result
    }
  }, 1000)

  res.on('finish', () => {
    clearInterval(changeInterval)
  })
})

app.listen(portNumber, () => {
  console.log(`Started listening to on port ${portNumber}`)
  console.log('ThingIsReady')
})
