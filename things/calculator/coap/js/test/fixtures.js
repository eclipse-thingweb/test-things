const { getInitiateMain } = require("../../../../../util/dist/util")
const path = require("node:path")

let simpleThingProcess
let contentNegotiationThingProcess
let response
const simplePort = 5683
const contentNegotiationPort = 5684

const mochaGlobalSetup = async function() {
    try {
        response = await getInitiateMain('node', [path.join(__dirname, '..', 'coap-simple-calculator.js'), '-p', `${simplePort}`])
        simpleThingProcess = response.process
    } 
    catch(error) {
        console.error(error)
        simpleThingProcess = error.process
    }

    try {
        response = await getInitiateMain('node', [path.join(__dirname, '..', 'coap-content-negotiation-calculator.js'), '-p', `${contentNegotiationPort}`])
        contentNegotiationThingProcess = response.process
    } 
    catch (error) {
        console.error(error)
        contentNegotiationThingProcess = error.process
    }
}

const mochaGlobalTeardown = function() {
    if(simpleThingProcess) {
        simpleThingProcess.kill()
    }

    if(contentNegotiationThingProcess) {
        contentNegotiationThingProcess.kill()
    }
}

module.exports = {
    simplePort,
    contentNegotiationPort,
    mochaGlobalSetup,
    mochaGlobalTeardown
}