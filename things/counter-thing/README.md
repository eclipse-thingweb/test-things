# Counter Thing

A simple counter implementation for the Eclipse Thingweb Test Things project.

## Description

This counter thing provides increment, decrement, and reset operations, exposing its state and changes through HTTP.

## Features

-   Increment, decrement, and reset operations
-   Read-only count property
-   SVG and PNG image property representations. These are provided for testing different content types
-   Event emission on count change
-   TypeScript implementation using node-wot

## Protocol Support

-   HTTP

## Programming Language and Framework

-   **Language**: TypeScript
-   **Framework**: node-wot

## Usage

The counter exposes properties and actions for interacting with the count value. See the [Thing Description](http://localhost:3000) for details on endpoints and data formats. 