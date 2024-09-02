"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// importing dependencies
const core_1 = require("@node-wot/core");
const binding_http_1 = require("@node-wot/binding-http");
const binding_coap_1 = require("@node-wot/binding-coap");
const binding_mqtt_1 = require("@node-wot/binding-mqtt");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// create a Servient and add HTTP, CoAP and MQTT bindings
let servient = new core_1.Servient();
servient.addClientFactory(new binding_http_1.HttpClientFactory());
servient.addClientFactory(new binding_http_1.HttpsClientFactory());
servient.addClientFactory(new binding_coap_1.CoapClientFactory());
servient.addClientFactory(new binding_mqtt_1.MqttClientFactory());
let wotHelper = new core_1.Helpers(servient);
(async () => {
    const WoT = await servient.start();
    // we will fetch the TDs of the devices
    const coffeeMachineTD = await wotHelper.fetch(`http://${process.env.SIMPLE_COFFEE_MACHINE_HOSTNAME}:${process.env.SIMPLE_COFFEE_MACHINE_PORT}/coffee-machine`);
    // Alternatively, this Thing self-hosts its TD at http://plugfest.thingweb.io:8081/coffee-machine that you can fetch
    const presenceSensorTD = await wotHelper.fetch(`mqtt://${process.env.PRESENCE_SENSOR_BROKER_URI}/PresenceSensor`);
    const smartClockTD = await wotHelper.fetch(`coap://${process.env.SMART_CLOCK_HOSTNAME}:${process.env.SMART_CLOCK_PORT}/smart-clock`);
    // consuming TDs allows creates a software object, which allows us to execute functions on them
    const coffeeMachineThing = await WoT.consume(coffeeMachineTD);
    const presenceSensorThing = await WoT.consume(presenceSensorTD);
    const smartClockThing = await WoT.consume(smartClockTD);
    let morningCoffeeFlag = false;
    // We subscribe to the presence detection events
    presenceSensorThing.subscribeEvent("presenceDetected", async (eventData) => {
        // We can log the distance of the detection but this is not necessary.
        // The emission of the event implies that a detection happened anyways
        console.log("Detected presence at,", await eventData.value(), "mm");
        // We read the time property from the smart clock
        const currentTimeData = await smartClockThing.readProperty("time");
        const currentTime = await currentTimeData.value(); // You need to always call the .value function
        // Optionally, we can log the current time
        console.log("Current time is " + currentTime.hour.toString().padStart(2, '0') + ":" + currentTime.minute.toString().padStart(2, '0'));
        // To avoid accidental brews, a flag is used to check whether a coffee was brewed before
        if (!morningCoffeeFlag) {
            // As the task indicates, we brew only between 5:00 and 13:00
            if (currentTime.hour <= 13 && currentTime.hour >= 5) {
                // To brew a coffee, we invoke the brew action in the coffee machine
                await coffeeMachineThing.invokeAction("brew", "espresso");
                // We log to indicate to the user that brewing has finished
                console.log("brewed espresso");
                // for today we should not brew any more coffee
                morningCoffeeFlag = true;
            }
        }
        // we reset the morningCoffeeFlag every day at 1am
        setInterval(() => {
            if (currentTime.hour == 1) {
                morningCoffeeFlag = false;
            }
        }, 1000);
    });
})();
