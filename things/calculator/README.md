# Calculator Thing

A simple calculator implementation for the Eclipse Thingweb Test Things project.

## Description

This calculator thing provides basic arithmetic operations through various protocols including HTTP, CoAP, and MQTT. The features are the same across all protocols - all implementations support the same arithmetic operations regardless of the communication protocol used.

## Features

-   Basic arithmetic operations (add, subtract, multiply, divide)
-   Multiple protocol support (HTTP, CoAP, MQTT)
-   Content negotiation support
-   Multiple implementation frameworks

## Protocol Support

-   HTTP (Express.js, Flask)
-   CoAP
-   MQTT

## Programming Language and Framework

-   **HTTP Express**: JavaScript, Express.js
-   **HTTP Flask**: Python, Flask
-   **CoAP**: JavaScript, coap library
-   **MQTT**: JavaScript, mqtt library

## Usage

The calculator exposes basic arithmetic operations through multiple protocols. See the Thing Descriptions for details on endpoints and data formats:

- [HTTP Express Simple Calculator](https://github.com/eclipse-thingweb/test-things/blob/main/things/calculator/http/express/http-simple-calculator-thing.td.jsonld)
- [HTTP Express Content Negotiation Calculator](https://github.com/eclipse-thingweb/test-things/blob/main/things/calculator/http/express/http-content-negotiation-calculator-thing.td.jsonld)
- [HTTP Flask Calculator](http://plugfest.thingweb.io/http-flask-calculator)
- [CoAP Simple Calculator](https://github.com/eclipse-thingweb/test-things/blob/main/things/calculator/coap/js/coap-simple-calculator-thing.td.jsonld)
- [CoAP Content Negotiation Calculator](https://github.com/eclipse-thingweb/test-things/blob/main/things/calculator/coap/js/coap-content-negotiation-calculator-thing.td.jsonld)
- [MQTT Calculator](https://github.com/eclipse-thingweb/test-things/blob/main/things/calculator/mqtt/js/mqtt-calculator.td.json)
