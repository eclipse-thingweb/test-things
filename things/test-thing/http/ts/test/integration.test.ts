import { ChildProcess } from "child_process"
import * as path from 'path'
import { ThingStartResponse, getInitiateMain } from '../../../../../util/util'

const port = 3000
let thingProcess: ChildProcess | undefined

const loadTest = (testName: string, path: string) => {
    describe(testName, () => {
        require(path)
    })
}

describe("Test Thing HTTP TS Integration Tests", () => {
    before((done) => {
        getInitiateMain(path.join(__dirname, '..', 'dist', 'main.js'), port)
            .then((response: ThingStartResponse) => {
                thingProcess = response.process
                done()
            })
            .catch((error: ThingStartResponse) => {
                thingProcess = error.process
                done(new Error(error.message))
            }) 
    })

    after(() => {
        if (thingProcess) {
            thingProcess.kill()
        }
    })

    // Load tests here from different files
    loadTest('TD Test', path.join(__dirname, 'td.test')) 
    loadTest('Client Test', path.join(__dirname, 'client.test'))     
})