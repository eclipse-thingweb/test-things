const Ajv = require("ajv");
const chai = require("chai");
const https = require("https");

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });

const expect = chai.expect;

describe("Elevator", () => {
  let validate;

  before((done) => {
    https.get(
      "https://raw.githubusercontent.com/w3c/wot-thing-description/main/validation/tm-json-schema-validation.json",
      function (response) {
        const body = [];
        response.on("data", (chunk) => {
          body.push(chunk);
        });

        response.on("end", () => {
          const tmSchema = JSON.parse(Buffer.concat(body).toString());
          validate = ajv.compile(tmSchema);
          done();
        });
      },
    );
  });

  it("should have a valid TM", () => {
    const elevatorTM = require("./elevator.tm.json");
    const valid = validate(elevatorTM);
    expect(valid).to.be.true;
  });
});
