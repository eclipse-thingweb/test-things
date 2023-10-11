const { ServerTCP } = require("modbus-serial")
const fs = require('fs')
const path = require('path')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
const { parseArgs } = require('node:util')
const express = require('express')
require('dotenv').config()

const app = express()

const thingName = "modbus-lift"
const hostname = "0.0.0.0"
let portNumber = "8502"
const thingUnitID = 1

const { values: { port } } = parseArgs({
    options: {
        port: {
            type: 'string',
            short: 'p'
        }
    }
})
  
if (port && !isNaN(parseInt(port))) {
    portNumber = parseInt(port)
}

const tmPath = process.env.TM_PATH

if (process.platform === 'win32') {
    tmPath.split(path.sep).join(path.win32.sep)
}

const thingModel = JSON.parse(fs.readFileSync(path.join(__dirname, tmPath)))

const placeholderReplacer = new JsonPlaceholderReplacer()
placeholderReplacer.addVariableMap({
    PROTOCOL: 'modbus+tcp',
    THING_NAME: thingName,
    HOSTNAME: hostname,
    PORT_NUMBER: portNumber
})
const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

const coils = new Array(9999)
const discreteInputs = new Array(9999)
const inputRegisters = new Array(9999)
const holdingRegisters = new Array(9999)

const lightSwitchForms = [{
    "href": `${thingUnitID}?address=1&quantity=1`,
    "op": [
        "readproperty"
    ],
    "modbus:entity": "Coil",
    "modbus:function": "readCoil",
    "contentType": "application/octet-stream"
}, {
    "href": `${thingUnitID}?address=1&quantity=1`,
    "op": [
        "writeproperty"
    ],
    "modbus:entity": "Coil",
    "modbus:function": "writeSingleCoil",
    "contentType": "application/octet-stream"
}]


thingDescription['properties']['lightSwitch']['forms'] = lightSwitchForms

const onTheMoveForms = [{
    "href": `${thingUnitID}?address=1&quantity=1`,
    "op": [
        "readproperty"
    ],
    "modbus:entity": "DiscreteInput",
    "modbus:function": "readDiscreteInput",
    "contentType": "application/octet-stream"
}]

discreteInputs[0] = 0
thingDescription['properties']['onTheMove']['forms'] = onTheMoveForms

const floorNumberForms = [{
    "href": `${thingUnitID}?address=1&quantity=1`,
    "op": [
        "readproperty"
    ],
    "modbus:entity": "HoldingRegister",
    "modbus:function": "readHoldingRegisters",
    "contentType": "application/octet-stream"
}, {
    "href": `${thingUnitID}?address=1&quantity=1`,
    "op": [
        "writeproperty"
    ],
    "modbus:entity": "HoldingRegister",
    "modbus:function": "writeSingleHoldingRegister",
    "contentType": "application/octet-stream"
}]

thingDescription['properties']['floorNumber']['forms'] = floorNumberForms

const vector = {
    getDiscreteInput: function(addr, unitID) {
        if (thingUnitID === unitID) {
            console.log(`Reading discrete input @${addr}`)
            return discreteInputs[addr - 1];
        }
    },
    getInputRegister: function(addr, unitID) {
        if (thingUnitID === unitID) {
            return inputRegisters[addr - 1];
        }
    },
    getHoldingRegister: function(addr, unitID, callback) {
        if (thingUnitID === unitID) {
            setTimeout(function() {
                callback(null, holdingRegisters[addr - 1])
            }, 10)
        }
    },
    getCoil: function(addr, unitID) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve(coils[addr - 1])
            }, 10)
        })
    },
    setRegister: function(addr, value, unitID) {
        if (thingUnitID === unitID) {
            // trying to change floor number
            if (addr === 1) {
                // lift is on the move
                if (discreteInputs[0]) {
                    console.log("Lift is on the move, cannot change the floor number")
                } else {
                    console.log(`Changing the floor number to ${value}`)
                    holdingRegisters[addr - 1] = value
                    discreteInputs[0] = 1
                    setTimeout(() => {
                        discreteInputs[0] = 0
                    }, 5000)
                }
            }
        }

        return
    },
    setCoil: function(addr, value, unitID) {
        if (thingUnitID === unitID) {
            coils[addr - 1] = value
        }
        
        return
    }
};

// set the server to answer for modbus requests
console.log(`Started listening to on port ${portNumber}`)
console.log("ThingIsReady")

const serverTCP = new ServerTCP(vector, { host: hostname, port: portNumber, debug: true, unitID: thingUnitID })

serverTCP.on("socketError", function(err){
    // Handle socket error if needed, can be ignored
    console.error(err)
});

app.get(`/${thingName}`, (req, res) => {
    res.end(JSON.stringify(thingDescription))
})

const tdPortNumber = "3" + portNumber
app.listen(tdPortNumber, () => {
    console.log(`Published ${thingName} TD at ${hostname}:${tdPortNumber}`)
})