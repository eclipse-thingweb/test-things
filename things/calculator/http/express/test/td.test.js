const chai = require('chai')
const http = require('http')
const { getTDValidate } = require('../../../../../util/dist/util')
const { simplePort, contentNegotiationPort } = require('./fixtures')

const expect = chai.expect

describe('Calculator HTTP JS', () => {
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
      http.get(`http://localhost:${simplePort}/http-express-calculator-simple`, function (response) {
        const body = []
        response.on('data', (chunk) => {
          body.push(chunk)
        })
  
        response.on('end', () => {
          try {
            const result = JSON.parse(Buffer.concat(body).toString())
            const valid = validate(result)
            expect(valid).to.be.true
            done()
          } catch (error) {
            console.log(error)
          }
        })
      })
    })
  })
  
  describe('Calculator Content Negotiation', () => {
    it('should have a valid TD', (done) => {
      http.get({
        hostname: 'localhost',
        port: contentNegotiationPort,
        path: '/http-express-calculator-content-negotiation',
        method: 'GET',
        headers: {
          accept: 'application/json'
        }
      }, function (response) {
        const body = []
        response.on('data', (chunk) => {
          body.push(chunk)
        })
  
        response.on('end', () => {
          try {
            const result = JSON.parse(Buffer.concat(body).toString())
            const valid = validate(result)
            expect(valid).to.be.true
            done()
          } catch (error) {
            console.log(error)
          }
        })
      })
    })
  })
})
