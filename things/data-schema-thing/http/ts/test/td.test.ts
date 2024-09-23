import * as chai from 'chai'
import * as http from 'http'
import { getTDValidate } from '../../../../../util/util'
import { ValidateFunction } from 'ajv'
import { port } from './fixtures'

const expect = chai.expect

let validate: ValidateFunction | undefined

describe("TD Test", () => {
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
    http.get(`http://localhost:${port}/http-data-schema-thing`, function (response: any) {
      const body: Buffer[] = []
      response.on('data', (chunk: Buffer) => {
        body.push(chunk)
      })
  
      response.on('end', () => {
        try {
          const result = JSON.parse(Buffer.concat(body).toString())
          const valid = validate && result ! ? validate(result) : false
          expect(valid).to.be.true
          done()
        } catch (error) {
          console.log(error)
          done(error)
        }
      })
    })
  })
})

