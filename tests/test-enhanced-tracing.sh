#!/bin/bash

# Test script for Enhanced OpenTelemetry Tracing
# This script demonstrates the full-stack tracing capabilities

echo "🚀 Testing Enhanced OpenTelemetry Tracing for Advanced Coffee Machine"
echo "=================================================="

# Configuration
COFFEE_MACHINE_URL="http://localhost/http-advanced-coffee-machine"
JAEGER_URL="http://jaeger.localhost"


echo "📋 Prerequisites:"
echo "   - Coffee machine should be running on port 80 (via Docker/proxy)"
echo "   - Jaeger should be running on port 8084 (UI) and 14268 (collector)"
echo "   - View traces at: $JAEGER_URL"
echo ""

sleep 2

echo "🧪 Test 0: Reset Resources (prepare for testing)"
echo "----------------------------------------"
curl -X PUT "$COFFEE_MACHINE_URL/properties/availableResourceLevel?id=water" \
  -H 'Content-Type: application/json' \
  -d '100' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

curl -X PUT "$COFFEE_MACHINE_URL/properties/availableResourceLevel?id=milk" \
  -H 'Content-Type: application/json' \
  -d '100' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

curl -X PUT "$COFFEE_MACHINE_URL/properties/availableResourceLevel?id=chocolate" \
  -H 'Content-Type: application/json' \
  -d '100' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

curl -X PUT "$COFFEE_MACHINE_URL/properties/availableResourceLevel?id=coffeeBeans" \
  -H 'Content-Type: application/json' \
  -d '100' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 1: Make a Latte (should show full nested trace)"
echo "----------------------------------------"
curl -X POST "$COFFEE_MACHINE_URL/actions/makeDrink?drinkId=latte&size=l&quantity=1" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 2: Make an Espresso (smaller trace)"
echo "----------------------------------------"
curl -X POST "$COFFEE_MACHINE_URL/actions/makeDrink?drinkId=espresso&size=s&quantity=2" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 3: Set a Valid Schedule (should show full nested trace)"
echo "----------------------------------------"
curl -X POST "$COFFEE_MACHINE_URL/actions/setSchedule" \
  -H 'Content-Type: application/json' \
  -d '{"time":"08:00","mode":"everyday","drinkId":"latte","size":"l","quantity":2}' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 4: Invalid Schedule (should show error trace)"
echo "----------------------------------------"
curl -X POST "$COFFEE_MACHINE_URL/actions/setSchedule" \
  -H 'Content-Type: application/json' \
  -d '{"time":"25:99","mode":"everyday"}' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 5: Check Resources (property read trace)"
echo "----------------------------------------"
curl -X GET "$COFFEE_MACHINE_URL/properties/allAvailableResources" \
  -H 'Accept: application/json' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 6: Check Possible Drinks (property read trace)"
echo "----------------------------------------"
curl -X GET "$COFFEE_MACHINE_URL/properties/possibleDrinks" \
  -H 'Accept: application/json' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 7: Update Resource Level (property write trace)"
echo "----------------------------------------"
curl -X PUT "$COFFEE_MACHINE_URL/properties/availableResourceLevel?id=water" \
  -H 'Content-Type: application/json' \
  -d '50' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 8: Update Served Counter (property write trace)"
echo "----------------------------------------"
curl -X PUT "$COFFEE_MACHINE_URL/properties/servedCounter" \
  -H 'Content-Type: application/json' \
  -d '1001' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 9: Check Schedules (property read trace)"
echo "----------------------------------------"
curl -X GET "$COFFEE_MACHINE_URL/properties/schedules" \
  -H 'Accept: application/json' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 10: Trigger Low Resource Event - Set Water to 5% (event trace)"
echo "----------------------------------------"
curl -X PUT "$COFFEE_MACHINE_URL/properties/availableResourceLevel?id=water" \
  -H 'Content-Type: application/json' \
  -d '5' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 11: Trigger Out of Resource Event - Set Coffee Beans to 0% (event trace)"
echo "----------------------------------------"
curl -X PUT "$COFFEE_MACHINE_URL/properties/availableResourceLevel?id=coffeeBeans" \
  -H 'Content-Type: application/json' \
  -d '0' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 12: Try Making Drink with No Coffee Beans (should trigger outOfResource event)"
echo "----------------------------------------"
curl -X POST "$COFFEE_MACHINE_URL/actions/makeDrink?drinkId=espresso&size=m&quantity=1" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 13: Set High Served Counter to Trigger Maintenance Event (event trace)"
echo "----------------------------------------"
curl -X PUT "$COFFEE_MACHINE_URL/properties/servedCounter" \
  -H 'Content-Type: application/json' \
  -d '1500' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

sleep 1

echo "🧪 Test 14: Check Maintenance Status After High Counter (property read trace)"
echo "----------------------------------------"
curl -X GET "$COFFEE_MACHINE_URL/properties/maintenanceNeeded" \
  -H 'Accept: application/json' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

echo "✅ All tests completed!"
echo ""
echo "🔍 To view the enhanced traces:"
echo "   1. Open Jaeger UI: $JAEGER_URL"
echo "   2. Select service: 'advanced-coffee-machine'"
echo "   3. Click 'Find Traces'"
echo "   4. Click on any trace to see the nested span structure"
echo ""
echo "📊 You should see traces with:"
echo "   • HTTP request spans (auto-instrumented)"
echo "   • property.read.* spans for GET requests with nested business logic"
echo "   • property.write.* spans for PUT requests with validation and events"
echo "   • action.* spans for POST requests with complex workflows"
echo "   • event.* spans for outOfResource and maintenanceNeeded events"
echo "   • Nested business logic, validation, and calculation spans"
echo "   • Database operation spans (db.select, db.update, db.insert)"
echo "   • Hardware simulation spans (sensors, drink preparation)"
echo "   • Rich metadata and contextual attributes"
echo "   • Error details and validation failures"
echo ""
echo "🎯 Event Testing Scenarios:"
echo "   • Low resource alerts (water at 5%)"
echo "   • Out of resource events (coffee beans at 0%)"
echo "   • Maintenance threshold events (served counter > 1000)"
echo "   • Failed drink attempts triggering resource events"
echo ""
echo "🚀 This comprehensive test covers ALL WoT interaction types with full-stack tracing!"
