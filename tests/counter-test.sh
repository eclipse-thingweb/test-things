#!/bin/bash

# Tests the counter instance

echo "🚀 Starting Counter Thing Test"
echo "================================"

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Test Counter
echo ""
echo "🔢 Testing Counter (http://localhost:3001)"
echo "----------------------------------------"

echo "📋 Getting Thing Description..."
curl -s http://localhost:3001/counter | jq '.title' 2>/dev/null || echo "Counter Thing Description"

echo "📊 Reading initial count..."
COUNT=$(curl -s http://localhost:3001/counter/properties/count)
echo "Initial count: $COUNT"

echo "➕ Incrementing counter..."
curl -s -X POST http://localhost:3001/counter/actions/increment > /dev/null
sleep 1

echo "📊 Reading count after increment..."
COUNT=$(curl -s http://localhost:3001/counter/properties/count)
echo "Count after increment: $COUNT"

echo "➕ Incrementing by 5..."
curl -s -X POST "http://localhost:3001/counter/actions/increment?step=5" > /dev/null
sleep 1

echo "📊 Reading count after step increment..."
COUNT=$(curl -s http://localhost:3001/counter/properties/count)
echo "Count after step increment: $COUNT"

echo "➖ Decrementing counter..."
curl -s -X POST http://localhost:3001/counter/actions/decrement > /dev/null
sleep 1

echo "📊 Reading count after decrement..."
COUNT=$(curl -s http://localhost:3001/counter/properties/count)
echo "Count after decrement: $COUNT"

echo "➖ Decrementing by 3..."
curl -s -X POST "http://localhost:3001/counter/actions/decrement?step=3" > /dev/null
sleep 1

echo "📊 Reading count after step decrement..."
COUNT=$(curl -s http://localhost:3001/counter/properties/count)
echo "Count after step decrement: $COUNT"

# Test image properties
echo ""
echo "🖼️  Testing Image Properties"
echo "---------------------------"

echo "📊 Getting count as SVG..."
curl -s http://localhost:3001/counter/properties/countAsImage | head -c 100
echo "..."

echo "📊 Getting count as red SVG..."
curl -s "http://localhost:3001/counter/properties/countAsImage?fill=red" | head -c 100
echo "..."

# Test reset functionality
echo ""
echo "🔄 Testing Reset Functionality"
echo "-----------------------------"

echo "🔄 Resetting counter..."
curl -s -X POST http://localhost:3001/counter/actions/reset > /dev/null
sleep 1

echo "📊 Reading count after reset..."
COUNT=$(curl -s http://localhost:3001/counter/properties/count)
echo "Count after reset: $COUNT"

# Final status
echo ""
echo "✅ Test Summary"
echo "==============="
echo "Final count: $COUNT"
echo ""
echo "🎉 Counter Thing test completed!"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop services: docker-compose down"