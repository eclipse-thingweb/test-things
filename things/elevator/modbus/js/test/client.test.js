const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

const { Servient } = require('@node-wot/core')
const { ModbusClientFactory } = require('@node-wot/binding-modbus')
const modbusTd = require('../modbus-elevator.td.json')

chai.use(chaiAsPromised)
const expect = chai.expect

let servient = new Servient()
servient.addClientFactory(new ModbusClientFactory())

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

describe("Client Tests", () => {
    before(async () => {
        try {
            const WoT = await servient.start()
            thing = await WoT.consume(modbusTd)
        } catch(error) {
            console.error(error)
        }
    })

    after(async () => {
        await servient.shutdown()
    })

    describe("lightSwitch property", () => {
        it("should return false when it is not turned on", async () => {
            const value = await readProperty(thing, "lightSwitch")
            expect(value).to.be.false
        })

        it("should return true when it is turned on", async () => {
            await writeProperty(thing, "lightSwitch", true)
            const value = await readProperty(thing, "lightSwitch")
            expect(value).to.be.true
        })
    })

    describe("onTheMove property", () => {
        it("should return false when floorNumber is not changed recently", async () => {
            const value = await readProperty(thing, "onTheMove")
            expect(value).to.be.false
        })

        it("should return true when floorNumber is changed recently", async () => {
            const floorNumberValue = await readProperty(thing, "floorNumber")
            await writeProperty(thing, "floorNumber", 12)
            const onTheMoveValue = await readProperty(thing, "onTheMove")
            await writeProperty(thing, "floorNumber", floorNumberValue)
            expect(onTheMoveValue).to.be.true
        })
    })

    describe("floorNumber property", () => {
        it("should return 0 when the thing is newly started", async () => {
            const value = await readProperty(thing, "floorNumber")
            expect(value).to.be.equal(0)
        })

        it("should return the recently set value when a new value is set", async () => {
            const newValue = 12
            await writeProperty(thing, "floorNumber", newValue)
            const value = await readProperty(thing, "floorNumber")
            expect(value).to.be.equal(newValue)
        })

        it.skip("should not write a value when the value is below 0", async () => {
            await expect(writeProperty(thing, "floorNumber", -1)).to.be.rejected
        })

        it.skip("should not write a value when the value is above 15", async() => {
            await expect(writeProperty(thing, "floorNumber", 16)).to.be.rejected
        })
    })
})