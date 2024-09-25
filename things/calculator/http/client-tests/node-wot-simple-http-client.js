const { Servient } = require("@node-wot/core");
const { HttpClientFactory } = require("@node-wot/binding-http");

const servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));

servient
  .start()
  .then(async (WoT) => {
    const td = await WoT.requestThingDescription(
      "http://localhost:3000/http-express-calculator-simple",
    );

    let thing = await WoT.consume(td);
    console.log(td);

    //Property endpoints
    let result = await (await thing.readProperty("result")).value();
    console.log("Read result:", result);

    let lastChange = await (await thing.readProperty("lastChange")).value();
    console.log("Read lastChange:", lastChange);

    //Update event observation
    thing.subscribeEvent("update", async (data) => {
      console.log("Update event:", (await data.value())["data"]);
    });

    //Action endpoints
    let additionResult = await thing.invokeAction("add", 3);
    console.log("Addition result: ", await additionResult.value());

    let subtractionResult = await thing.invokeAction("subtract", 3);
    console.log("Subtraction result: ", await subtractionResult.value());

    //TODO: Property Observation failing do to returning wrong type (SSE returns object rather than a number)
    // thing.observeProperty("result", async (data) => { console.log("Result observe:", await data.value()); });
    // thing.observeProperty("lastChange", async (data) => { console.log("lastChange observe:", await data.value()); });
  })
  .catch((err) => {
    console.error(err);
  });
