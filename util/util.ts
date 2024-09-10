import Ajv, { ValidateFunction }  from 'ajv'
import * as https from 'https'
import { ChildProcess } from 'node:child_process'

export type ThingStartResponse =  {
    process?: ChildProcess,
    message: string
}

export type ValidateResponse = {
    validate?: ValidateFunction,
    message: string
}

const spawn = require('node:child_process').spawn

export const getInitiateMain = (cmdArgs: string[]): Promise<ThingStartResponse> => {
    return new Promise((resolve, reject) => {
        const thingProcess = spawn(
          'node',
          cmdArgs,
        )

        // Avoids unsettled promise in case the promise is not settled in a second.
        const timeout = setTimeout(() => {
           reject({
            process: thingProcess,
            message: 'Thing did not start as expected.'
           }) 
        }, 1000)

        thingProcess.stdout!.on('data', (data: Buffer) => {
            if(data.toString().includes('ThingIsReady')) {
                clearTimeout(timeout)
                resolve({
                    process: thingProcess,
                    message: 'Success'
                })
            } 
        })
        thingProcess.stderr!.on('data', (data: Buffer) => {
          reject({
            process: thingProcess,
            message: `Error: ${data}`
          })
        })
        thingProcess.on('error', (error: any) => {
          reject({
            process: thingProcess,
            message: `Error: ${error}`
          })
        })
        thingProcess.on('close', () => {
          reject({
            process: thingProcess,
            message: 'Failed to initiate the main script.'
          })
        })
      })
}


const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false })

export const getTDValidate = async (): Promise<ValidateResponse> => {
    const tdSchema: any = await getTDJSONSchema

    return Promise.resolve({
        validate: ajv.compile(tdSchema),
        message: 'Success'
    })
}

const getTDJSONSchema = new Promise((resolve, reject) => {
    https.get('https://raw.githubusercontent.com/w3c/wot-thing-description/main/validation/td-json-schema-validation.json', function (response: any) {
        const body: Buffer[] = []
        response.on('data', (chunk: Buffer) => {
            body.push(chunk)
        })
    
        response.on('end', () => {
            const tdSchema = JSON.parse(Buffer.concat(body).toString())
            resolve(tdSchema)
        })
    })
})