const chai = require('chai')
const coap = require('coap')
const cbor = require('cbor')
const { getTDValidate } = require('../../../../../util/dist/util')
const { simplePort, contentNegotiationPort } = require('./fixtures')

const expect = chai.expect

describe('Calculator CoAP JS', () => {
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

  describe('Calculator Simple', () => {
    it('should have a valid TD', (done) => {
      const req = coap.request(`coap://localhost:${simplePort}/coap-calculator-simple`)
  
      req.on('response', (res) => {
        const valid = validate(JSON.parse(res.payload.toString()))
        expect(valid).to.be.true
        done()
      })
  
      req.end()
    })
  })

  describe('Calculator Content Negotiation', () => {
    it('should have a valid application/json TD', (done) => {
      const req = coap.request({
          method: 'GET',
          observe: false,
          host: 'localhost',
          port: contentNegotiationPort,
          pathname: 'coap-calculator-content-negotiation',
          headers: {
              "Accept": 'application/json'
          }
      })
      
      req.on('response', (res) => {
        const valid = validate(JSON.parse(res.payload.toString()))
        expect(valid).to.be.true
        done()
      })

      req.end()
    })

    it('should have a valid application/cbor TD', (done) => {
      const req = coap.request({
          method: 'GET',
          observe: false,
          host: 'localhost',
          port: contentNegotiationPort,
          pathname: 'coap-calculator-content-negotiation',
          headers: {
              "Accept": 'application/cbor'
          }
      })
      
      req.on('response', (res) => {
        // console.log(res.payload.toString())
        const decodedPayload = cbor.decode(res.payload)
        const valid = validate(JSON.parse(decodedPayload))
        expect(valid).to.be.true
        done()
      })

      req.end()
    })
  })
})
