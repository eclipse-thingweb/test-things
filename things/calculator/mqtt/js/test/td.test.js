const Ajv = require('ajv')
const chai = require('chai')
const mqtt = require('mqtt')
const path = require('path')
const { getTDValidate } = require("../../../../../util/dist/util")

const spawn = require('child_process').spawn

const expect = chai.expect
const hostname = 'test.mosquitto.org'
const port = 1883

describe('Calculator MQTT JS', () => {
  let validate

  before(async () => {
    const tdValidate = getTDValidate()
  
    try {
      const response = await Promise.all([tdValidate])
      validate = response[0].validate
    } 
    catch (error) {
      console.log(error)
    }
  })

  it('should have a valid TD', (done) => {
    const broker = mqtt.connect(`mqtt://${hostname}`, { port })
    broker.subscribe('mqtt-calculator')

    let valid = false

    broker.on('message', (topic, payload, packet) => {
      valid = validate(JSON.parse(payload.toString()))
      broker.end()
    })

    broker.on('close', () => {
      expect(valid).to.be.true
      done()
    })
  })
})
