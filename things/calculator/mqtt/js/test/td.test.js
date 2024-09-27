/********************************************************************************
 * Copyright (c) 2024 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/

const chai = require('chai')
const mqtt = require('mqtt')
const { getTDValidate } = require("../../../../../util/dist/util")
const { port } = require('./fixtures')


const expect = chai.expect
const hostname = 'test.mosquitto.org'

describe("Calculator MQTT JS", () => {
    let validate;

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
