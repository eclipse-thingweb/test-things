const chai = require('chai')
const fs = require('fs')
const path = require('path')
const { getTDValidate } = require("../../../../../util/dist/util")

const expect = chai.expect

describe('Elevator Modbus JS', () => {
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
    fs.readFile(path.join(__dirname, "../modbus-elevator.td.json"), 'utf-8', (err, data) => {
      if (err) {
        console.log(err)
        done(err)
      }

      const result = JSON.parse(data.toString())
      const valid = validate(result)
      expect(valid).to.be.true
      done()
    })
  })
})
