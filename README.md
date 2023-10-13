<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/website/master/misc/thingweb_logo_for_dark_bg.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/website/master/misc/thingweb_logo.svg">
  <img title="ThingWeb" alt="Thingweb logo" src="" width="300px">
</picture>

## Test Things

Collection of IoT device simulators that can be used for testing and exploration purposes of different protocols and other Web of Things mechanisms.
The devices are implemented via various programming languages and frameworks.
The protocols you can currently test are:

- HTTP
- CoAP
- MQTT
- Modbus

## Dependencies

The project has several dependencies. Currently `JavaScript` and `Python` is used for simulating different devices. Every device has its own dependencies and they should be handled separately. For that reason, `Node.js` is used for JS code and `poetry` is used for Python code to run the scripts and handle the dependencies.

## Testing

For testing JavaScript Testing Framework `mocha` is used. Therefore, the tests are written in JavaScript.
Every Thing should have its Thing Model and Thing Description validation test.
Thing Model validation test should be put under Thing's main directory and named as `tm.test.json`.
Thing Description validation test should be put under protocol and programming language/framework's test directory and named as `td.test.json`.
For Thing Description validation test, the device should boot up and to understand the device booted up without any error, a message `"ThingIsReady"` is expected to be prompted to the console by the device.

## Adding a new Thing

If you are going to add a different protocol for an existing Thing:

1. Create a directory such as `things/<existing_thing>/<your_protocol>/<your_programming_language/your_framework>/`.
2. Create your project files and write your code inside this directory.
3. If you are adding a new programming language, please use a tidy dependency management tool for the programming language. Otherwise use already used tools and frameworks not to overcomplicate the project.
4. Create your `test/` directory under your Thing's directory and add your test files there.

If you are going to add a different programming language/framework for an existing protocol:

1. Create a directory such as `things/<existing_thing>/<existing_protocol>/<your_programming_language/your_framework>/`.
2. Create your project files and write your code inside this directory.
3. Please use a tidy dependency management tool for the programming language/framework. Otherwise use already used tools and frameworks not to overcomplicate the project.

If you are going to add a completely new Thing:

1. Create a directory such as `things/<your_thing_name>/`.
2. Add your Thing Model under the previously created directory and name it such as `<your_thing_name>.tm.json`.
3. Follow the steps above to add your protocol and programming language/framework.

## Current Devices

### Calculator

Calculator is a simple device, which has a read only `result` variable and depending on the action selected by the user, it adds or subtracts user input from the `result`. There is also a read only `lastChange` variable, which indicates the last time `result` variable has changed. Additionally, the device publishes an event, when `result` is changed.

#### Supported Protocols and Programming Languages

- HTTP
  - JavaScript Express framework
  - Python Flask framework
- CoAP
  - JavaScript
- MQTT
  - JavaScript
- Modbus
  - JavaScript (WIP)

## How to Run

You can start the devices inside a container, for that running `docker-compose up` at the root directory builds and runs the containers. For custom configuration, take look at the `Dockerfile` of each device or [docker-compose.yml](./docker-compose.yml).

For running the things separately, using their `Dockerfile`'s, `docker build -t <image-tag> -f ./Dockerfile ../../` command must be used to give the context to be able copy `tm.json` into the container.

For Node.js based devices, we use npm workspaces and running `npm install` at the root directory installs all the packages needed for every device. After packages are installed, running `node main.js` would run the thing. For port configuration, running either `node main.js -p 1000` or `node main.js --port 1000` would start the thing on port 1000.
