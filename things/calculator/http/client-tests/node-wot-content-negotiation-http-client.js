const { Servient } = require("@node-wot/core");
const { HttpClientFactory } = require("@node-wot/binding-http");

const servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));

servient.start().then(async (WoT) => {
    const td = await WoT.requestThingDescription("http://localhost:3000/http-express-calculator-content-negotiation");

    let thing = await WoT.consume(td);
    console.log(td);


    let result = await thing.readProperty("result", {formIndex: 0})
    console.log("Result property: ",await result.value());

    let lastChange = await thing.readProperty("lastChange", {formIndex: 0})
    console.log("lastChange property: ",await lastChange.value());

    //Update event property
    thing.subscribeEvent("update", async (data) => {
        console.log("Update event:", await data.value());
    })

    // //Properties observation
    // thing.observeProperty("result", async (data) => { console.log("Result observe:", await data.value()); });
    // thing.observeProperty("lastChange", async (data) => { console.log("lastChange observe:", await data.value()); });

    // //Actions endpoints
    // let addition = await thing.invokeAction("add", 3, {formIndex: 0})
    // console.log(await addition.value());

    // let subtraction = await thing.invokeAction("subtract", 5, {formIndex: 0})
    // console.log(await subtraction.value());

}).catch((err) => { console.error(err); }); 