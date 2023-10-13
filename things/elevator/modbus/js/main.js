const { ServerTCP } = require("modbus-serial")
const fs = require('fs')
const path = require('path')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
const { parseArgs } = require('node:util')
require('dotenv').config()

const thingName = "modbus-elevator"
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
    PORT_NUMBER: portNumber,
    UNIT_ID: thingUnitID
})
const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

const coils = new Array(9999)
const discreteInputs = new Array(9999)
const holdingRegisters = new Array(9999)

const lightSwitchForms = [{
    "href": `?address=1&quantity=1`,
    "op": "readproperty",
    "modbus:entity": "Coil",
    "modbus:function": "readCoil",
    "contentType": "application/octet-stream"
}, {
    "href": `?address=1&quantity=1`,
    "op": "writeproperty",
    "modbus:entity": "Coil",
    "modbus:function": "writeSingleCoil",
    "contentType": "application/octet-stream"
}]


thingDescription['properties']['lightSwitch']['forms'] = lightSwitchForms

const onTheMovePollingTime = 1000

const onTheMoveForms = [{
    "href": `?address=1&quantity=1`,
    "op": [
        "readproperty",
        "observeproperty"
    ],
    "modbus:entity": "DiscreteInput",
    "modbus:function": "readDiscreteInput",
    "modbus:pollingTime": onTheMovePollingTime,
    "contentType": "application/octet-stream"
}]

discreteInputs[0] = 0
let onTheMoveIsPolled = false
thingDescription['properties']['onTheMove']['forms'] = onTheMoveForms

const floorNumberForms = [{
    "href": `?address=1&quantity=1`,
    "op": "readproperty",
    "modbus:entity": "HoldingRegister",
    "modbus:function": "readHoldingRegister",
    "contentType": "application/octet-stream"
}, {
    "href": `?address=1&quantity=1`,
    "op": "writeproperty",
    "modbus:entity": "HoldingRegister",
    "modbus:function": "writeSingleHoldingRegister",
    "contentType": "application/octet-stream"
}]

const minFloorNumber = 0
const maxFloorNumber = 15
thingDescription['properties']['floorNumber']['forms'] = floorNumberForms

fs.writeFile(`${thingName}.td.json`, JSON.stringify(thingDescription, 4, 4), 'utf-8', function(){})

const vector = {
    getDiscreteInput: function(addr, unitID) {
        if (thingUnitID === unitID) {
            console.log(`Reading discrete input @${addr}`)
            if (addr === 1) {
                if (onTheMoveIsPolled) {
                    console.log(`Polling onTheMove too frequently. You should poll it every ${onTheMovePollingTime} ms.`)
                    return
                }

                onTheMoveIsPolled = true
                setTimeout(function() {
                    onTheMoveIsPolled = false
                }, onTheMovePollingTime)

                return discreteInputs[addr - 1];
            }
        }
    },
    getHoldingRegister: function(addr, unitID, callback) {
        if (thingUnitID === unitID) {
            setTimeout(function() {
                console.log(`Reading holding register @${addr}`)
                callback(null, holdingRegisters[addr - 1])
            }, 10)
        }
    },
    getCoil: function(addr, unitID) {
        if (thingUnitID === unitID) {
            return new Promise(function(resolve) {
                console.log(`Reading coil @${addr}`)
                resolve(coils[addr - 1])
            })
        }
    },
    setRegister: function(addr, value, unitID) {
        if (thingUnitID === unitID) {
            console.log(`Setting register @${addr} to ${value}`)
            // trying to change floor number
            if (addr === 1) {
                // elevator is on the move
                if (discreteInputs[0]) {
                    console.log("Elevator is on the move, cannot change the floor number")
                } else {
                    if (value < minFloorNumber) {
                        console.log(`Floor number should not be under ${minFloorNumber}`)
                        return -1
                    }

                    if (value > maxFloorNumber) {
                        console.log(`Floor number should not be above ${maxFloorNumber}`)
                        return -1
                    }

                    console.log(`Changing the floor number to ${value}`)
                    
                    holdingRegisters[addr - 1] = value
                    // simulating elevator movement
                    discreteInputs[0] = 1
                    // elevator completes its movement in 5 seconds
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
            console.log(`Setting coil @${addr} to ${value}`)
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