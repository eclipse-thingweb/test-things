const { parseArgs } = require("node:util");
const { ServerTCP } = require("modbus-serial");
const fs = require("fs");
const path = require("path");

const hostname = "0.0.0.0";
let portNumber = 8502;


const { values: { port } } = parseArgs({
    options: {
        port: {
            type: "string",
            short: "p"
        }
    }
});

if (port && !isNaN(parseInt(port))) {
    portNumber = parseInt(port);
}

const vector = {
    getInputRegister: function(addr, unitID) {
        // Synchronous handling
        console.log("getInputRegister", addr);
        return addr;
    },
    getHoldingRegister: function(addr, unitID, callback) {
        // Asynchronous handling (with callback)
        setTimeout(function() {
            // callback = function(err, value)
            console.log("getHoldingRegister", addr);
            console.log(callback);
            callback(null, addr + 8000);
        }, 10);
    },
    getCoil: function(addr, unitID) {
        // Asynchronous handling (with Promises, async/await supported)
        return new Promise(function(resolve) {
            setTimeout(function() {
                console.log("getCoil");
                resolve((addr % 2) === 0);
            }, 10);
        });
    },
    setRegister: function(addr, value, unitID) {
        // Asynchronous handling supported also here
        console.log("set register", addr, value, unitID);
        return;
    },
    setCoil: function(addr, value, unitID) {
        // Asynchronous handling supported also here
        console.log("set coil", addr, value, unitID);
        return;
    },
    readDeviceIdentification: function(addr) {
        return {
            0x00: "MyVendorName",
            0x01: "MyProductCode",
            0x02: "MyMajorMinorRevision",
            0x05: "MyModelName",
            0x97: "MyExtendedObject1",
            0xAB: "MyExtendedObject2"
        };
    }
};

// set the server to answer for modbus requests
console.log(`ModbusTCP listening on modbus+tcp://${hostname}:${portNumber}`);
const serverTCP = new ServerTCP(vector, { host: hostname, port: portNumber, debug: true, unitID: 2 });

serverTCP.on("socketError", function(err){
    // Handle socket error if needed, can be ignored
    console.error(err);
});