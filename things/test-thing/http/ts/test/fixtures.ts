import { ChildProcess } from "child_process"
import { getInitiateMain, ThingStartResponse } from "../../../../../util/util"
import path from "path"

let thingProcess: ChildProcess | undefined
let response: ThingStartResponse
const port = 3000

export async function mochaGlobalSetup() {
    try {
        response = await getInitiateMain([path.join(__dirname, '..', 'dist', 'main.js'), '-p', `${port}`])
    } 
    catch(error) {
        console.log(error)
    }
    finally {
        thingProcess = response.process
    }
}

export function mochaGlobalTeardown() {
    if (thingProcess) {
        thingProcess.kill()
    }
}