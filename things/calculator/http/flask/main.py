from flask import Flask
from flask import request 
from flask import Response
import math
from datetime import datetime
import json
import argparse
import os
from dotenv import load_dotenv
import logging
import sys
import click

load_dotenv()

app = Flask(__name__)
log = logging.getLogger('werkzeug')
log.disabled = True

cli = sys.modules['flask.cli']

cli.show_server_banner = lambda *x: click.echo("ThingIsReady")

hostname = "0.0.0.0"
portNumber = 5000

thingName = "http-flask-calculator"
PROPERTIES = "properties"
ACTIONS = "actions"
EVENTS = "events"

tmPath = os.environ["TM_PATH"]

with open(tmPath) as infile:
    thingModel = json.load(infile)

thingModel["@type"] = 'Thing'
thingModel = json.dumps(thingModel)
thingModel = thingModel.replace('{{PROTOCOL}}', 'http')
thingModel = thingModel.replace('{{HOSTNAME}}', hostname)
thingModel = thingModel.replace('{{PROPERTIES}}', PROPERTIES)
thingModel = thingModel.replace('{{ACTIONS}}', ACTIONS)
thingModel = thingModel.replace('{{EVENTS}}', EVENTS)
thingModel = thingModel.replace('{{THING_NAME}}', thingName)
thingDescription = thingModel.replace('{{PORT_NUMBER}}', str(portNumber))

result = 0
lastChange = ""

@app.route(f'/{thingName}', methods=['GET'])
def getThingDescription():
    return thingDescription

@app.route(f'/{thingName}/{PROPERTIES}/result', methods=['GET'])
def getResult():
    return str(result)

@app.route(f'/{thingName}/{PROPERTIES}/lastChange', methods=['GET'])
def getLastChange():
    return lastChange

@app.route(f'/{thingName}/{ACTIONS}/add', methods=['POST'])
def add():
    operand = int(request.data)

    if math.isnan(operand):
        print(request.data)
    else:
        global result
        result += operand
        global lastChange
        lastChange = str(datetime.now())
        return str(result)

@app.route(f'/{thingName}/{ACTIONS}/subtract', methods=['POST'])
def subtract():
    operand = int(request.data)

    if math.isnan(operand):
        print(request.data)
    else:
        global result
        result -= operand
        global lastChange
        lastChange = str(datetime.now())
        return str(result)

@app.route(f'/{thingName}/{EVENTS}/change', methods=['GET'])
def change():
    def stream():
        oldResult = result
        while True:
            if oldResult != result:
                oldResult = result
                yield f'Result: {result}\n\n'

    return Response(stream(), mimetype='text/event-stream')


parser = argparse.ArgumentParser()
parser.add_argument('-p', '--port', required=False)
args = parser.parse_args()

port = 5000
if args.port:
    port = args.port

if __name__ == "__main__":
    app.run(debug=False, host=hostname, port=port)
