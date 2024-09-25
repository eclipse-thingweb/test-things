<h1>
  <picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/test-things_for_dark_bg.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/test-things.svg">
  <img title="Eclipse Thingweb Test Things" alt="Thingweb logo with Test Things" src="https://raw.githubusercontent.com/eclipse-thingweb/thingweb/master/brand/logos/test-things.svg" width="300">
</picture>
</h1>

## Test Things

Collection of IoT device simulators that can be used for testing and exploration purposes of different protocols and other Web of Things mechanisms.
The devices are implemented via various programming languages and frameworks.
The protocols you can currently test are:

- HTTP
- CoAP
- MQTT
- Modbus

## Dependencies

The project has several dependencies. Currently, `JavaScript` and `Python` are used for simulating different devices. Every device has its own dependencies and they should be handled separately. For that reason, `Node.js` is used for JS code, and `poetry` is used for Python code to run the scripts and handle the dependencies.

## Testing

For testing JavaScript Testing Framework `mocha` is used. Therefore, the tests are written in JavaScript.
Every Thing should have its Thing Model and Thing Description validation test.
Thing Model validation test should be put under Thing's main directory and named as `tm.test.json`.
The Thing Description validation test should be put under the protocol and programming language/framework's test directory and named `td.test.json`.
For the Thing Description validation test, the device should boot up and to understand the device booted up without any error, a message `"ThingIsReady"` is expected to be prompted to the console by the device.

## Port Configuration

It is possible to run several Things at the same time in a container, which requires a container to expose that many ports.
Traefik helps with this issue and routes the requests on one exposed port to relevant services inside the container.
Traefik configuration can be seen inside `docker-compose.yml`.
It is not possible to route using a path prefix with UDP, therefore port must be exposed for new Things that use UDP.

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

### Advanced Coffee Machine

The advanced coffee machine is a device that simulates a behavior of a coffee machine. `allAvailableResources` property consists of the remaining values for its properties `water`, `milk`, `chocolate` and `coffeeBeans`. `possibleDrinks` property holds a list of possible drinks, a user can order, such as espresso, americano, etc. After certain amount of uses of the coffee machine, `maintenanceNeeded` property becomes true and let users know the coffee machine requires a maintenance. `schedules` property stores the users' schedules to brew a coffee at the scheduled time.

### Calculator

The calculator is a simple device, that has a read-only `result` variable, and depending on the action selected by the user, it adds or subtracts user input from the `result`. There is also a read-only `lastChange` variable, which indicates the last time `result` variable has changed. Additionally, the device publishes an event, when `result` is changed.

### Elevator

The elevator is a simple device, that has three variables `lightSwitch`, `floorNumber`, and `onTheMove`. `lightSwitch` is a boolean that represents whether the light on the elevator is turned on or not. `floorNumber` is an integer and represents the floor number of the elevator. `onTheMove` is a boolean and represents whether the elevator is on the move or not.

### Test Thing

The Test Thing is a total toy device that users can try different types of properties and actions.

#### Supported Protocols and Programming Languages

- HTTP
  - TypeScript node-wot
  - JavaScript Express framework
  - Python Flask framework
- CoAP
  - JavaScript
- MQTT
  - JavaScript
- Modbus
  - JavaScript

## Current Mashups

### Smart Home Mashup

See the mashup's [readme](./mashups//smart-home/README.md).

## How to Run

### Using docker-compose

You can start the devices inside a container, for that running `docker-compose -f docker-compose-infra.yml -f docker-compose-things.yml up` at the root directory builds and runs the containers. For custom configuration, take a look at the `Dockerfile` of each device or [docker-compose-things.yml](./docker-compose-things.yml).

[docker-compose-things.yml](./docker-compose-things.yml) consists of the docker configuration of the things.
[docker-compose-infra.yml](./docker-compose-infra.yml) consists of the docker configuration of additional tools such as traefik, prometheus, grafana and cadvisor.

After the run, as default, the devices are accessible at:

| Thing Title                                 | Access URL                                                     |
| ------------------------------------------- | -------------------------------------------------------------- |
| http-advanced-coffee-machine                | `http://localhost/http-advanced-coffee-machine`                |
| coap-calculator-simple                      | `coap://localhost:5683/coap-calculator-simple`                 |
| coap-calculator-content-negotiation         | `coap://localhost:5684/coap-calculator-content-negotiation`    |
| http-express-calculator-simple              | `http://localhost/http-express-calculator-simple`              |
| http-express-calculator-content-negotiation | `http://localhost/http-express-calculator-content-negotiation` |
| http-flask-calculator                       | `http://localhost/http-flask-calculator`                       |
| mqtt-calculator                             | `mqtt://test.mosquitto.org:1883/mqtt-calculator`               |
| modbus-elevator                             | `modbus+tcp://localhost:3179/1`                                |
| http-data-schema-thing                      | `http://localhost/http-data-schema-thing`                      |

To be able to access additional tools, the user must have a basic username and password pair. The services are accessible at:

- Traefik dashboard -> dashboard.localhost
- Prometheus -> prometheus.localhost
- Grafana -> grafana.localhost
- cAdvisor -> cadvisor.localhost

Hostname and ports can be changed from `.env` file in the root directory. Therefore the links for devices would change accordingly.
A username and password should be generated for running the services. To do so:

1. Choose a username, e.g. `myuser`, and run the following command in the command line: `echo $(htpasswd -nB USERNAMECHOICE) | sed -e s/\\$/\\$\\$/g`
2. Enter the username and the generated password (hashed) in the `.env` file under `TRAEFIK_DASHBOARD_USER` and `TRAEFIK_DASHBOARD_PASS`, respectively.
3. Use the username and the password you have types (not the hashed one) when logging in at any service but Portainer.

### Running separately

For running the things separately, using their `Dockerfile`'s, `docker build -t <image-tag> -f ./Dockerfile ../../` command must be used to give the context to be able to copy `tm.json` into the container.

For Node.js-based devices, we use npm workspaces and running `npm install` at the root directory installs all the packages needed for every device. After packages are installed, running `node main.js` would run the thing. For port configuration, running either `node main.js -p 1000` or `node main.js --port 1000` would start the thing on port 1000.

### Saving Grafana Dashboards

Grafana dashboard json files are stored in [./conf/grafana/dashboards](./conf//grafana//dashboards/).
To save your newly created dashboard locally and push it into the remote repository:

- Export the dashboard as JSON file using Share > Export.
- Save the exported JSON file to [./conf/grafana/dashboards](./conf//grafana//dashboards/).

If your dashboard uses another datasource than our default `prometheus-datasource`, new datasource also must be provisioned in [./conf/grafana/datasources](./conf/grafana/provisioning/datasources/).
For more information check Grafana's provisioning [documentation](https://grafana.com/docs/grafana/latest/administration/provisioning/).
