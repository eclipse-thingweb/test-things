# Advanced Coffee Machine Thing

A smart coffee machine simulation for the Eclipse Thingweb Test Things project.

## Description

This advanced coffee machine simulates a device with resource management, drink scheduling, and maintenance features. It is designed for protocol and feature-rich IoT testing.

## Features

-   Resource tracking (water, milk, chocolate, coffee beans)
-   Drink scheduling and possible drinks list
-   Maintenance alerts
-   Make drink and set schedule actions
-   Out-of-resource event
-   HTTP protocol implementation
-   **Distributed tracing with OpenTelemetry** - All interactions are automatically traced with Jaeger

## Protocol Support

-   HTTP

## Programming Language and Framework

-   **Language**: TypeScript
-   **Framework**: node-wot

## Usage

The coffee machine exposes properties, actions, and events for managing drinks and resources. See the [Thing Description](http://plugfest.thingweb.io/http-advanced-coffee-machine) for details on endpoints and data formats.

## Tracing

This implementation uses the centralized tracing utilities from the `util` package. All property reads, writes, and action invocations are automatically traced with OpenTelemetry:

-   Property reads generate spans named `{propertyName}.read` (e.g., `allAvailableResources.read`)
-   Property writes generate spans named `{propertyName}.write` (e.g., `servedCounter.write`)
-   Action invocations generate spans named `{actionName}` (e.g., `makeDrink`)
