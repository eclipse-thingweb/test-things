"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTDValidate = exports.getInitiateMain = void 0;
const ajv_1 = __importDefault(require("ajv"));
const https = __importStar(require("https"));
const spawn = require('node:child_process').spawn;
const getInitiateMain = (cmdArgs) => {
    return new Promise((resolve, reject) => {
        const thingProcess = spawn('node', cmdArgs);
        // Avoids unsettled promise in case the promise is not settled in a second.
        const timeout = setTimeout(() => {
            reject({
                process: thingProcess,
                message: 'Thing did not start as expected.'
            });
        }, 1000);
        thingProcess.stdout.on('data', (data) => {
            if (data.toString().includes('ThingIsReady')) {
                clearTimeout(timeout);
                resolve({
                    process: thingProcess,
                    message: 'Success'
                });
            }
        });
        thingProcess.stderr.on('data', (data) => {
            reject({
                process: thingProcess,
                message: `Error: ${data}`
            });
        });
        thingProcess.on('error', (error) => {
            reject({
                process: thingProcess,
                message: `Error: ${error}`
            });
        });
        thingProcess.on('close', () => {
            reject({
                process: thingProcess,
                message: 'Failed to initiate the main script.'
            });
        });
    });
};
exports.getInitiateMain = getInitiateMain;
const ajv = new ajv_1.default({ strict: false, allErrors: true, validateFormats: false });
const getTDValidate = async () => {
    const tdSchema = await getTDJSONSchema;
    return Promise.resolve({
        validate: ajv.compile(tdSchema),
        message: 'Success'
    });
};
exports.getTDValidate = getTDValidate;
const getTDJSONSchema = new Promise((resolve, reject) => {
    https.get('https://raw.githubusercontent.com/w3c/wot-thing-description/main/validation/td-json-schema-validation.json', function (response) {
        const body = [];
        response.on('data', (chunk) => {
            body.push(chunk);
        });
        response.on('end', () => {
            const tdSchema = JSON.parse(Buffer.concat(body).toString());
            resolve(tdSchema);
        });
    });
});
