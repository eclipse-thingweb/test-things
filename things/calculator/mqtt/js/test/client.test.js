const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")

const { Servient } = require("@node-wot/core")
const { MqttClientFactory } = require("@node-wot/binding-mqtt")
const mqttTd = require('../mqtt-calculator.td.json')

chai.use(chaiAsPromised)
const expect = chai.expect

const servient = new Servient()
servient.addClientFactory(new MqttClientFactory())
let thing


const readProperty = async (thing, propertyName) => {
    try {
        const response = await thing.readProperty(propertyName)
        return await response.value()
    } catch(error) {
        console.error(`Error: ${error}`)
    }
}

const writeProperty = async (thing, propertyName, propertyValue) => {
    try {
        await thing.writeProperty(propertyName, propertyValue)
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

/**
 * FIXME: To be able to test readProperty, issues https://github.com/eclipse-thingweb/node-wot/issues/980
 * and https://github.com/eclipse-thingweb/node-wot/issues/1241 must be resolved.
 * Until then we can use subscriptions.
 */
 
describe("Client Tests", () => {
    before(async () => {
        try {
            const WoT = await servient.start()
            thing = await WoT.consume(mqttTd)
        } catch(error) {
            console.error(error)
        }
    })

    after(async () => {
        await servient.shutdown()
    })

    describe("result property", () => {
        it("should return initial value", async () => {
            const value = await readProperty(thing, "result")
            expect(value).to.be.equal(0)
        })

        it("should return sum when adding value to the existing result", async () => {
            const resultValue = await readProperty(thing, "result")
            const valueToAdd = 12
            await thing.invokeAction("add", valueToAdd)
            const newResultValue = await readProperty(thing, "result")
            expect(newResultValue).to.be.equal(resultValue + valueToAdd)
        })

        it("should return sum when subtracting value from the existing result", async() => {
            const resultValue = await readProperty(thing, "result")
            const valueToSubtract = 3
            await thing.invokeAction("subtract", valueToSubtract)
            const newResultValue = await readProperty(thing, "result")
            expect(newResultValue).to.be.equal(resultValue - valueToSubtract) 
        })
    })

    describe("add action", () => {
        it("should return sum when adding value to the existing result", async () => {
            const resultValue = await readProperty(thing, "result")
            const valueToAdd = 12
            const response  = await thing.invokeAction("add", valueToAdd)
            const actionResultValue = await response.value()
            expect(actionResultValue).to.be.equal(resultValue + valueToAdd)
        })
    })

    describe("subtract action", () => {
        it("should return sum when subtracting value from the existing result", async() => {
            const resultValue = await readProperty(thing, "result")
            const valueToSubtract = 3
            const response  = await thing.invokeAction("subtract", valueToSubtract)
            const actionResultValue = await response.value()
            expect(actionResultValue).to.be.equal(resultValue - valueToSubtract) 
        })
    })

    describe("update event", () => {
        it("should return the update message when subscribed", async () => {
            const subscription = await thing.subscribeEvent("update", async (response) => {
                const value = await response.value()
                console.log(value)
                expect(value).to.be.equal("Updated the thing!")
                subscription.stop()
            })
        })
    })
})

