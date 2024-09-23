const mqtt = require('mqtt')
const { parseArgs } = require('node:util')
const fs = require('fs')
const path = require('path')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
require('dotenv').config()

const brokerURI = process.env.BROKER_URI ?? 'test.mosquitto.org'
let portNumber = process.env.PORT ?? 1883

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

const thingName = 'mqtt-calculator'
const PROPERTIES = 'properties'
const ACTIONS = 'actions'
const EVENTS = 'events'

const broker = mqtt.connect(`mqtt://${brokerURI}`, { port: portNumber })

const tmPath = process.env.TM_PATH

if (process.platform === 'win32') {
  tmPath.split(path.sep).join(path.win32.sep)
}

const thingModel = JSON.parse(fs.readFileSync(path.join(__dirname, tmPath)))

const placeholderReplacer = new JsonPlaceholderReplacer()
placeholderReplacer.addVariableMap({
  PROTOCOL: 'mqtt',
  THING_NAME: thingName,
  PROPERTIES,
  ACTIONS,
  EVENTS,
  HOSTNAME: brokerURI,
  PORT_NUMBER: portNumber,
  RESULT_OBSERVABLE: true,
  LAST_CHANGE_OBSERVABLE: true
})
const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

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

  thingDescription['events'][key]['data']['type'] = "string"

  thingDescription['events'][key]['forms'] = []

  const newForm = JSON.parse(JSON.stringify(defaultForm))
  newForm['href'] = `events/${key}`
  newForm['op'] = ["subscribeevent", "unsubscribeevent"]

  thingDescription['events'][key]['forms'].push(newForm)
}

fs.writeFile(`${thingName}.td.json`, JSON.stringify(thingDescription, 4, 4), 'utf-8', function(){})

broker.on('connect', () => {
  console.log(`Connected to broker via port ${portNumber}`)
  broker.subscribe(`${thingName}/${PROPERTIES}/result`)
  broker.subscribe(`${thingName}/${PROPERTIES}/lastChange`)
  broker.subscribe(`${thingName}/${ACTIONS}/add`)
  broker.subscribe(`${thingName}/${ACTIONS}/subtract`)
  broker.subscribe(`${thingName}/${EVENTS}/update`)
})

let result = 0
let lastChange = ''

broker.on('message', (topic, payload, packet) => {
  console.log(`Messaged to the topic ${topic}`)
  const segments = topic.split('/')

  if (segments[0] !== thingName) {
    return
  }

  if (segments[1] === PROPERTIES) {
    if (segments.length === 3 && segments[2] === 'result') {
      console.log(`Result is : ${result}`)
    }

    if (segments.length === 3 && segments[2] === 'lastChange') {
      console.log(`Last change : ${lastChange}`)
    }
  }

  if (segments[1] === ACTIONS) {
    if (segments.length === 3 && segments[2] === 'add') {
      const parsedValue = parseInt(payload.toString())

      if (isNaN(parsedValue)) {
        return
      } else {
        result += parsedValue
        lastChange = (new Date()).toLocaleTimeString()
        broker.publish(`${thingName}/${PROPERTIES}/result`, `${result}`, { retain: true })
        broker.publish(`${thingName}/${PROPERTIES}/lastChange`, lastChange,  { retain: true })
      }
    }

    if (segments.length === 3 && segments[2] === 'subtract') {
      const parsedValue = parseInt(payload.toString())

      if (isNaN(parsedValue)) {

      } else {
        result -= parsedValue
        lastChange = (new Date()).toLocaleTimeString()
        broker.publish(`${thingName}/${PROPERTIES}/result`, `${result}`, { retain: true })
        broker.publish(`${thingName}/${PROPERTIES}/lastChange`, lastChange, { retain: true })
      }
    }
  }
})

setInterval(() => {
  broker.publish(`${thingName}/${EVENTS}/update`, 'Updated the thing!')
}, 500)

// broker.publish(`${thingName}/${PROPERTIES}/result`, `${result}`, { retain: true })
broker.publish(`${thingName}`, JSON.stringify(thingDescription), { retain: true })
console.log('ThingIsReady')
