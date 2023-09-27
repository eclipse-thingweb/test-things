const mqtt = require("mqtt");
const { parseArgs } = require("node:util");
const fs = require("fs");
const path = require("path");
const { JsonPlaceholderReplacer } = require("json-placeholder-replacer");
require("dotenv").config();

const hostname = "test.mosquitto.org";
let portNumber = 1883;

const { values: { port } } = parseArgs({
    options: {
        port: {
            type: "string",
            short: "p"
        }
    }
});

if (port && !isNaN(parseInt(port))) {
    portNumber = parseInt(port);
}

const thingName = "mqtt-calculator"
const PROPERTIES = "properties";
const ACTIONS = "actions";
const EVENTS = "events";

const broker = mqtt.connect(`mqtt://${hostname}`, { port: portNumber });

let tmPath = process.env.TM_PATH;

if (process.platform === "win32") {
    tmPath.split(path.sep).join(path.win32.sep);
}

let thingModel = JSON.parse(fs.readFileSync(path.join(__dirname, tmPath)));

const placeholderReplacer = new JsonPlaceholderReplacer();
placeholderReplacer.addVariableMap({
    PROTOCOL: "mqtt",
    THING_NAME: thingName,
    PROPERTIES: PROPERTIES,
    ACTIONS: ACTIONS,
    EVENTS: EVENTS,
    HOSTNAME: hostname,
    PORT_NUMBER: portNumber
});
const thingDescription = placeholderReplacer.replace(thingModel);
thingDescription["@type"] = "Thing"

broker.on("connect", () => {
    console.log(`Connected to broker via port ${portNumber}`);
});

let result = 0;
let lastChange = "";

broker.on("message", (topic, payload, packet) => {
    console.log(`Messaged to the topic ${topic}`);
    const segments = topic.split('/');

    if (segments[0] !== thingName) {
        return;
    }

    if (segments[1] === PROPERTIES) {
        if (segments.length === 3 && segments[2] === "result") {
            console.log(`Result is : ${result}`);
        }

        if (segments.length === 3 && segments[2] === "lastChange") {
            console.log(`Last change : ${lastChange}`);
        }
    }

    if (segments[1] === ACTIONS) {
        if (segments.length === 3 && segments[2] === "add") {
            const parsedValue = parseInt(payload.toString());

            if (isNaN(parsedValue)) {
                return;
            } else {
                result += parsedValue;
                lastChange = (new Date()).toLocaleTimeString();
            }
        }

        if (segments.length === 3 && segments[2] === "subtract") {
            const parsedValue = parseInt(payload.toString());

            if (isNaN(parsedValue)) {
                return;
            } else {
                result -= parsedValue;
                lastChange = (new Date()).toLocaleTimeString();
            }
        }
    }
})

setInterval(() => {
    broker.publish(`${thingName}/${EVENTS}/update`, "Updated the thing!");
}, 500);

broker.subscribe(`${thingName}/${PROPERTIES}/result`);
broker.subscribe(`${thingName}/${PROPERTIES}/lastChange`);
broker.subscribe(`${thingName}/${ACTIONS}/add`);
broker.subscribe(`${thingName}/${ACTIONS}/subtract`);
broker.publish(`${thingName}`, JSON.stringify(thingDescription), { retain: true });
console.log("ThingIsReady");