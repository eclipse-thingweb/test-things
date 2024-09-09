
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

import { Servient } from "@node-wot/core"
import { HttpClientFactory } from "@node-wot/binding-http"

chai.use(chaiAsPromised)
const expect = chai.expect

let servient = new Servient()
servient.addClientFactory(new HttpClientFactory({ baseUri: 'localhost:3000' }))
const port = 3000

let thing: WoT.ConsumedThing 

const readProperty = async (thing: WoT.ConsumedThing, name: string): Promise<any> => {
    try {
        const res = await thing.readProperty(name)
        const value = await res.value()
        return value
    } 
    catch (error) {
        console.error(`Error: ${error}`)
    }
}

describe("Client Tests", () => {
    before(async () => {
        try {
            const WoT = await servient.start()
            const td: WoT.ThingDescription = await WoT.requestThingDescription(`http://localhost:${port}/http-advanced-coffee-machine`)
            thing = await WoT.consume(td)    
        } catch(error) {
            console.error(error)
        }
    })
    
    it("should read allAvailableResources property", async () => {
        const response = await thing.readProperty("allAvailableResources")
        const value = await response.value()
        expect(value).to.be.eql({
            water: 100,
            milk: 100,
            chocolate: 100,
            coffeeBeans: 100
        })
    })

    it("should change water level to 80", async () => {
        const waterLevel = 80
        await thing.writeProperty("availableResourceLevel", waterLevel, { uriVariables: { id: "water" }})
        const response = await thing.readProperty("availableResourceLevel", { uriVariables: { id: "water" }})
        const value = await response.value()
        expect(value).to.be.equal(waterLevel)
    })

    it("should observe maintenanceNeeded", async () => {
        await thing.observeProperty("maintenanceNeeded", async (data) => {
            const value = await data.value()
            expect(value).to.be.true
        })

        const servedCounter = 1001
        await thing.writeProperty("servedCounter", servedCounter)
    })

    it("should make 3 cups of latte", async () => {
        const makeCoffee = await thing.invokeAction("makeDrink", undefined, {
            uriVariables: { drinkId: "latte", size: "l", quantity: 3 },
        });
        const makeCoffeeValue = (await makeCoffee?.value()) as Record<string, unknown>;
        expect(makeCoffeeValue.result).to.be.not.null
    })

    it("should schedule a task", async () => {
        const schedule = {
            drinkId: "espresso",
            size: "m",
            quantity: 2,
            time: "10:00",
            mode: "everyday",
        }
        await thing.invokeAction("setSchedule", schedule);
        const response = await thing.readProperty("schedules")
        const value = await response.value() as object[]
        expect(value.length).to.be.equal(1)
        expect(value[0]).to.be.eql(schedule)
    })

    it("should subscribe to outOfResource event", async () => {
        await thing.subscribeEvent("outOfResource", async (data) => {
            const value = await data.value()
            expect(value).to.be.not.null
        })

        await thing.invokeAction("makeDrink", undefined, {
            uriVariables: { drinkId: "latte", size: "l", quantity: 1000 },
        });
    })
})
