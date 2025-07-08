/********************************************************************************
 * Copyright (c) 2024 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/

const { trace, context, SpanStatusCode } = require("@opentelemetry/api");
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { JaegerExporter } = require("@opentelemetry/exporter-jaeger");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

// Simple tracing setup - similar to how winston-loki is used
let tracer = null;
let isInitialized = false;

/**
 * Initialize tracing (call this once at the start of your thing)
 */
function initTracing(serviceName = "test-things") {
    if (isInitialized) return;

    const provider = new NodeTracerProvider({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        }),
    });

    const exporter = new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || "http://localhost:14268/api/traces",
    });

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();

    tracer = trace.getTracer(serviceName);
    isInitialized = true;

    console.log(`Tracing initialized for: ${serviceName}`);
}

/**
 * Simple trace method - replaces logger.info() calls
 */
function traceMessage(message, labels = {}) {
    if (!isInitialized) {
        console.warn("Tracing not initialized. Call initTracing() first.");
        return;
    }

    const span = tracer.startSpan(message, {
        attributes: {
            message: message,
            ...labels,
        },
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
}

/**
 * Trace an operation with timing
 */
function traceOperation(operationName, operation, labels = {}) {
    if (!isInitialized) {
        console.warn("Tracing not initialized. Call initTracing() first.");
        return operation();
    }

    const span = tracer.startSpan(operationName, {
        attributes: {
            operation: operationName,
            ...labels,
        },
    });

    try {
        const result = context.with(trace.setSpan(context.active(), span), operation);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
    } catch (error) {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
        });
        span.recordException(error);
        throw error;
    } finally {
        span.end();
    }
}

/**
 * Trace async operations
 */
async function traceAsyncOperation(operationName, operation, labels = {}) {
    if (!isInitialized) {
        console.warn("Tracing not initialized. Call initTracing() first.");
        return await operation();
    }

    const span = tracer.startSpan(operationName, {
        attributes: {
            operation: operationName,
            ...labels,
        },
    });

    try {
        const result = await context.with(trace.setSpan(context.active(), span), operation);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
    } catch (error) {
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
        });
        span.recordException(error);
        throw error;
    } finally {
        span.end();
    }
}

module.exports = {
    initTracing,
    traceMessage,
    traceOperation,
    traceAsyncOperation,
};
