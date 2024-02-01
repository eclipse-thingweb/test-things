const { parseArgs } = require('node:util')
const coap = require('coap')
const fs = require('fs')
const path = require('path')
const { JsonPlaceholderReplacer } = require('json-placeholder-replacer')
require('dotenv').config()

const server = coap.createServer()
const hostname = 'localhost'
let portNumber = 5683
const thingName = 'coap-calculator-simple'

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
    PROTOCOL: 'coap',
    THING_NAME: thingName,
    HOSTNAME: hostname,
    PORT_NUMBER: portNumber,
    RESULT_OBSERVABLE: true,
    LAST_CHANGE_OBSERVABLE: true
})

/*****************************************/
/************ Creating the TD ************/
/*****************************************/

const thingDescription = placeholderReplacer.replace(thingModel)
thingDescription['@type'] = 'Thing'

const defaultForm = {
    "href": "",
    "contentType": "application/json",
    "op": []
}

//add properties forms
for (const key in thingDescription['properties']) {

    thingDescription['properties'][key]['forms'] = []

    const newFormRead = JSON.parse(JSON.stringify(defaultForm))
    newFormRead['href'] = `properties/${key}`
    newFormRead['op'] = ["readproperty"]

    const newFormObs = JSON.parse(JSON.stringify(newFormRead))
    newFormObs['op'] = ["observeproperty", "unobserveproperty"]
    newFormObs['subprotocol'] = "cov:observe"

    thingDescription['properties'][key]['forms'].push(newFormRead)
    thingDescription['properties'][key]['forms'].push(newFormObs)
}

//add actions forms
for (const key in thingDescription['actions']) {

    thingDescription['actions'][key]['forms'] = []

    const newForm = JSON.parse(JSON.stringify(defaultForm))
    newForm['href'] = `actions/${key}`
    newForm['op'] = ["invokeaction"]

    thingDescription['actions'][key]['forms'].push(newForm)
}

//add events forms
for (const key in thingDescription['events']) {

    thingDescription['events'][key]['forms'] = []

    const newForm = JSON.parse(JSON.stringify(defaultForm))
    newForm['href'] = `events/${key}`
    newForm['op'] = ["subscribeevent", "unsubscribeevent"]
    newForm['subprotocol'] = 'cov:observe'

    thingDescription['events'][key]['forms'].push(newForm)
}

//Creating the TD for testing purposes
try {
    fs.writeFileSync('coap-simple-calculator-thing.td.jsonld', JSON.stringify(thingDescription, null, 2))
} catch (err) {
    console.log(err);
}


/*********************************************************/
/************** Main server functionality ****************/
/*********************************************************/

let result = 0
let lastChange = ''

server.on('request', (req, res) => {
    const segments = req.url.split('/')

    if (segments[1] !== thingName) {
        res.code = 404
        res.end('Thing does not exist!')
    } else {
        if (!segments[2]) {
            if (req.method === 'GET') {
                res.end(JSON.stringify(thingDescription))
            }
            else {
                res.code = 405
                res.end('Method Not Allowed')
            }
        }
    }

    if (segments[2] === 'properties') {
        if (req.method === 'GET') {

            //Result endpoint
            if (segments[3] === 'result') {
                //Checking for the observe option
                if (req.headers.Observe === 0) {
                    console.log('Observing the result property...')
                    res.statusCode = 205

                    let oldResult = result
                    const changeInterval = setInterval(() => {
                        if (oldResult !== result) {
                            res.write(`${result.toString()}`)
                            oldResult = result
                        }
                    }, 1000)

                    res.on('finish', () => {
                        console.log('Client stopped the result observation')
                        clearInterval(changeInterval)
                    })
                }
                //If the observe option is false, then the value is given and the connection is closed
                else {
                    res.end(result.toString())
                }
            }
            else if (segments[3] === 'lastChange') {
                //Checking for the observe option
                if (req.headers.Observe === 0) {
                    console.log('Observing the lastChange property...')
                    res.statusCode = 205

                    let oldDate = lastChange
                    const changeInterval = setInterval(() => {
                        if (oldDate !== lastChange) {
                            res.write(`${lastChange.toISOString()}`)
                            oldDate = lastChange
                        }
                    }, 1000)

                    res.on('finish', () => {
                        console.log('Client stopped the lastChange observation');
                        clearInterval(changeInterval)
                    })
                }
                //If the observe option is false, then the value is given and the connection is closed
                else {
                    if (lastChange === '') {
                        res.end(lastChange)
                    } else {
                        res.end(lastChange.toISOString())
                    }
                }
            }
            else {
                res.code = 404
                res.end('Endpoint does not exist!')
            }
        }
        else {
            res.code = 405
            res.end('Method Not Allowed')
        }
    }


    if (segments[2] === 'actions') {
        if (req.method === 'POST') {
            if (segments[3] === 'add') {
                const parsedInput = parseInt(req.payload.toString())

                if (isNaN(parsedInput)) {
                    res.code = 400
                    res.end('Input should be a valid integer')
                } else {
                    result += parsedInput
                    lastChange = new Date()
                    res.end(result.toString())
                }
            }
            else if (segments[3] === 'subtract') {
                const parsedInput = parseInt(req.payload.toString())

                if (isNaN(parsedInput)) {
                    res.code = 400
                    res.end('Input should be a valid integer')
                } else {
                    result -= parsedInput
                    lastChange = new Date()
                    res.end(result.toString())
                }
            }
            else {
                res.code = 404
                res.end('Endpoint does not exist!')
            }
        }
        else {
            res.code = 405
            res.end('Method Not Allowed')
        }
    }

    if (segments[2] === 'events' && req.method === 'GET') {
        if (segments[3] === 'update') {
            if (req.headers.Observe === 0) {
                console.log('Observing the update event...')
                res.statusCode = 205

                let oldResult = result
                const changeInterval = setInterval(() => {
                    if (oldResult !== result) {
                        res.write(`${result}`)
                        oldResult = result
                    }
                }, 1000)

                res.on('finish', () => {
                    console.log('Client stopped the update observation');
                    clearInterval(changeInterval)
                })

            }
            else {
                res.code = 402
                res.end('Bad Option: Observe option should be set to true')
            }
        }
        else {
            res.code = 404
            res.end('Endpoint does not exist!')
        }
    }
})

server.listen(portNumber, () => {
    console.log(`Started listening to localhost on port ${portNumber}...`)
    console.log('ThingIsReady')
})