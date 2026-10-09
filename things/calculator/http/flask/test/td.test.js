const Ajv = require("ajv");
const chai = require("chai");
const http = require("http");
const https = require("https");
const path = require("path");

const spawn = require("child_process").spawn;

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });

const expect = chai.expect;
const port = 5000;
let thingProcess;

describe("Calculator HTTP Flask", () => {
    let validate;

    before(async function () {
        this.timeout(30000);

        const initiateMain = new Promise(async (resolve, reject) => {
            thingProcess = spawn("poetry", ["run", "python", "main.py"], {
                cwd: path.join(__dirname, ".."),
            });
            thingProcess.stdout.on("data", (data) => {
                if (data.toString().trim() === "ThingIsReady") {
                    resolve("Success");
                }
            });
            thingProcess.stderr.on("data", (data) => {
                console.log(`Error: ${data}`);
            });
            thingProcess.on("error", (error) => {
                reject(`Error: ${error}`);
            });
            thingProcess.on("close", () => {
                reject("Failed to initiate the main script.");
            });
        });

        const getJSONSchema = new Promise((resolve, reject) => {
            https.get("https://www.w3.org/2022/wot/td-schema/v1.1", function (response) {
                const body = [];
                response.on("data", (chunk) => {
                    body.push(chunk);
                });

                response.on("end", () => {
                    const tdSchema = JSON.parse(Buffer.concat(body).toString());
                    validate = ajv.compile(tdSchema);
                    resolve("Success");
                });
            });
        });

        await Promise.all([initiateMain, getJSONSchema]).then((data) => {
            if (data[0] !== "Success" || data[1] !== "Success") {
                console.log(`initiateMain: ${data[0]}`);
                console.log(`getJSONSchema: ${data[1]}`);
            }
        });
    });

    after(() => {
        thingProcess.kill();
    });

    it("should have a valid TD", (done) => {
        // wait for server to initiate
        setTimeout(() => {
            http.get(`http://127.0.0.1:${port}/http-flask-calculator`, function (response) {
                const body = [];
                response.on("data", (chunk) => {
                    body.push(chunk);
                });

                response.on("end", () => {
                    const result = JSON.parse(Buffer.concat(body).toString());
                    const valid = validate(result);
                    expect(valid).to.be.true;
                    done();
                });
            });
        }, 1000);
    });
});
