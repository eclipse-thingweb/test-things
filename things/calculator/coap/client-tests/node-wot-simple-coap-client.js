// example-client.js
const { Servient } = require("@node-wot/core");
const { CoapClientFactory } = require("@node-wot/binding-coap");

// create Servient and add CoAP binding
const servient = new Servient();
servient.addClientFactory(new CoapClientFactory());

servient
    .start()
    .then(async (WoT) => {
        try {
            const td = await WoT.requestThingDescription("coap://localhost:5683/coap-calculator-simple");

            const thing = await WoT.consume(td);
            console.log(td);

            // read property result
            let result = await thing.readProperty("result");
            console.log("result: ", await result.value());

            // read property lastChange
            let lastChange = await thing.readProperty("lastChange");
            console.log("lastChange: ", await lastChange.value());

            console.log("\n------------\n");

            // Observe properties
            thing.observeProperty("result", async (data) => { console.log("Result observe:", await data.value()); });
            thing.observeProperty("lastChange", async (data) => { console.log("lastChange observe:", await data.value()); });

            // Subscribe to event update
            thing.subscribeEvent("update", async (data) => {
                console.log("Update event:", await data.value());
            })


            //Invoke addition action
            let addition = await thing.invokeAction("add", 2)
            console.log("Addition result: ", await addition.value());
            //Invoke addition subtraction
            let subtraction = await thing.invokeAction("subtract", 3)
            console.log("Subtraction result: ", await subtraction.value());

            console.log("\n------------\n");


        } catch (err) {
            console.error("Script error:", err);
        }
    })
    .catch((err) => {
        console.error("Start error:", err);
    });