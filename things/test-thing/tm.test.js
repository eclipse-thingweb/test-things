const Ajv = require('ajv')
const chai = require('chai')
const https = require('https')

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false })

const expect = chai.expect

describe('Test Thing', () => {
  let validate

  before((done) => {
    https.get('https://raw.githubusercontent.com/w3c/wot-thing-description/main/validation/tm-json-schema-validation.json', function (response) {
      const body = []
      response.on('data', (chunk) => {
        body.push(chunk)
      })

      response.on('end', () => {
        const tmSchema = JSON.parse(Buffer.concat(body).toString())
        validate = ajv.compile(tmSchema)
        done()
      })
    })
  })

  it('should have a valid TM', () => {
    const testThingTM = require('./test-thing.tm.json')
    const valid = validate(testThingTM)
    expect(valid).to.be.true
  })
})
