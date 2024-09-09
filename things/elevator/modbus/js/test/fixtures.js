const { getInitiateMain } = require("../../../../../util/dist/util")
const path = require("node:path")

let thingProcess
let response
const port = 8502

exports.mochaGlobalSetup = async function() {
    try {
        response = await getInitiateMain([path.join(__dirname, '..', 'main.js'), '-p', `${port}`, '-t'])
        thingProcess = response.process
    } 
    catch(error) {
        console.log(error)
        thingProcess = error.process
    }
}

exports.mochaGlobalTeardown = function() {
    if (thingProcess) {
        thingProcess.kill()
    }
}