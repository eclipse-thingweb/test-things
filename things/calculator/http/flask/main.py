from flask import Flask
from flask import request 
from flask import Response
from flask import jsonify
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
thingModel = thingModel.replace('{{PORT_NUMBER}}', str(portNumber))

thingDescription = json.loads(thingModel)

default_form = {
    "href": "",
    "contentType": "application/json",
    "op": []
}


for key in thingDescription['properties']:

    thingDescription['properties'][key]['observable'] = True
    thingDescription['properties'][key]['forms'] = []

    new_form_read = default_form.copy()
    new_form_read['href'] = "properties/" + key
    new_form_read['op'] = ["readproperty"]

    thingDescription['properties'][key]['forms'].append(new_form_read)

for key in thingDescription['actions']:
    thingDescription['actions'][key]['forms'] = []

    new_form_action = default_form.copy()
    new_form_action['href'] = "actions/" + key
    new_form_action['op'] = ["invokeaction"]

    thingDescription['actions'][key]['forms'].append(new_form_action)

for key in thingDescription['events']:
    thingDescription['events'][key]['forms'] = []

    new_form_event = default_form.copy()
    new_form_event['href'] = "events/" + key
    new_form_event['op'] = ["subscribeevent", "unsubscribeevent"]
    new_form_event['subprotocol'] = "sse"

    thingDescription['events'][key]['forms'].append(new_form_event)

result = 0
lastChange = ""

@app.route(f'/{thingName}', methods=['GET'])
def getThingDescription():
    return thingDescription

@app.route(f'/{thingName}/{PROPERTIES}/result', methods=['GET'])
def getResult():
    return jsonify(result)

@app.route(f'/{thingName}/{PROPERTIES}/lastChange', methods=['GET'])
def getLastChange():
    return jsonify(lastChange)

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
        return jsonify(result)

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
        return jsonify(result)

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
