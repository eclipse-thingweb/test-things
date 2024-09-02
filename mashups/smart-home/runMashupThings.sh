#!/bin/bash

node ./dist/things/presence-sensor.js &
presence_sensor_pid=$!

node ./dist/things/simple-coffee-machine.js &
simple_coffee_machine_pid=$!

node ./dist/things/smart-clock.js &
smart_clock_pid=$!

cleanup() {
    echo "Terminating processes..."
    kill $presence_sensor_pid $simple_coffee_machine_pid $smart_clock_pid
    wait $presence_sensor_pid $simple_coffee_machine_pid $smart_clock_pid 2>/dev/null
    echo "All processes terminated."
    exit 0
}

trap cleanup SIGINT

wait