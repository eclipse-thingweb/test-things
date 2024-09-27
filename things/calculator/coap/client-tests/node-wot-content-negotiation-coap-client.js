const { Servient } = require("@node-wot/core");
const { CoapClientFactory } = require("@node-wot/binding-coap");

// create Servient and add CoAP binding
const servient = new Servient();
servient.addClientFactory(new CoapClientFactory());

servient
    .start()
    .then(async (WoT) => {
        try {
            const td = await WoT.requestThingDescription(
                "coap://localhost:5684/coap-calculator-content-negotiation",
            );

            const thing = await WoT.consume(td);
            console.log(td);

            // read property result
            let result = await thing.readProperty("result", { formIndex: 2 });
            console.log("result: ", await result.value());

            // read property lastChange
            let lastChange = await thing.readProperty("lastChange", {
                formIndex: 2,
            });
            console.log("lastChange: ", await lastChange.value());

            console.log("\n ---------- \n");

            //Observe properties
            thing.observeProperty("result", async (data) => {
                console.log("Result observe:", await data.value());
            });
            thing.observeProperty("lastChange", async (data) => {
                console.log("lastChange observe:", await data.value());
            });

            // Subscribe to event update
            thing.subscribeEvent("update", async (data) => {
                console.log("Update event:", await data.value());
            });

            //Invoke addition action
            let add = await thing.invokeAction("add", 3, { formIndex: 1 });
            console.log("Addition value:", await add.value());
            //Invoke subtraction action
            let subtract = await thing.invokeAction("subtract", 1, {
                formIndex: 3,
            });
            console.log("Subtraction value:", await subtract.value());

            console.log("\n ---------- \n");
        } catch (err) {
            console.error("Script error:", err);
        }
    })
    .catch((err) => {
        console.error("Start error:", err);
    });
