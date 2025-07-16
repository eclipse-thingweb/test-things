#!/bin/bash

# List of all services to test
services=(
    "coap-calculator-simple"
    "coap-calculator-content-negotiation"
    "http-express-calculator-simple"
    "http-express-calculator-content-negotiation"
    "http-flask-calculator"
    "mqtt-calculator"
    "modbus-elevator"
    "http-advanced-coffee-machine"
    "http-data-schema-thing"
    "counter-thing"
    "smart-home-presence-sensor"
    "smart-home-simple-coffee-machine"
    "smart-home-smart-clock"
    "smart-home-mashup"
)

echo "Testing all 14 services individually..."
echo "======================================"

# Function to test a service
test_service() {
    local service=$1
    echo "Testing $service..."
    
    # Start service in background
    docker-compose -f docker-compose-things-local.yml up --build -d $service
    
    # Wait for service to start
    sleep 10
    
    # Check logs for success indicators
    logs=$(docker-compose -f docker-compose-things-local.yml logs $service 2>&1)
    
    if echo "$logs" | grep -q "ThingIsReady\|ready\|Started listening\|Counter ready"; then
        echo "✅ $service - SUCCESS"
        return 0
    else
        echo "❌ $service - FAILED"
        echo "Logs: $logs"
        return 1
    fi
    
    # Stop service
    docker-compose -f docker-compose-things-local.yml down $service
}

# Test each service
success_count=0
total_count=${#services[@]}

for service in "${services[@]}"; do
    if test_service $service; then
        ((success_count++))
    fi
    echo ""
done

echo "======================================"
echo "Test Results: $success_count/$total_count services working"
echo "======================================"

# Clean up
docker-compose -f docker-compose-things-local.yml down 