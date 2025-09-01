/********************************************************************************
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
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
import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { trace, SpanStatusCode } from "@opentelemetry/api";

import WoT from "wot-typescript-definitions";

interface SpanLike {
    setAttributes: (attributes: Record<string, unknown>) => void;
    setStatus: (status: { code: SpanStatusCode; message?: string }) => void;
    end: () => void;
}

interface TracerLike {
    startActiveSpan: (name: string, fn: (span: SpanLike) => Promise<unknown> | unknown) => Promise<unknown> | unknown;
}

let tracer: TracerLike | null = null;

function safeStringify(value: unknown): string {
    try {
        if (value === null || value === undefined) {
            return String(value);
        }
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        return JSON.stringify(value);
    } catch {
        return `[Unable to serialize: ${typeof value}]`;
    }
}

function setSpanAttributes(
    span: SpanLike,
    name: string,
    operation: string,
    options: WoT.InteractionOptions | undefined,
    params?: WoT.InteractionInput,
    error?: unknown,
    result?: unknown
): void {
    // Set basic attributes
    const isAction = operation === "invokeaction";
    const isPropertyRead = operation === "readproperty";
    const isPropertyWrite = operation === "writeproperty";
    const isEvent = operation === "subscribeevent";

    let nameKey: string;
    if (isAction) {
        nameKey = "action.name";
    } else if (isPropertyRead || isPropertyWrite) {
        nameKey = "property.name";
    } else if (isEvent) {
        nameKey = "event.name";
    } else {
        nameKey = "interaction.name";
    }

    span.setAttributes({
        [nameKey]: name,
        "wot.operation": operation,
        timestamp: new Date().toISOString(),
    });

    // Add input options if present
    if (options !== undefined) {
        span.setAttributes({ "input.options": safeStringify(options) });

        // Add URI variables if present
        if (options.uriVariables !== undefined) {
            span.setAttributes({ "input.uriVariables": safeStringify(options.uriVariables) });

            // Add individual URI variables for easy filtering in Jaeger
            for (const [key, value] of Object.entries(options.uriVariables)) {
                span.setAttributes({ [`input.uriVariables.${key}`]: safeStringify(value) });
            }
        }
    }

    // Add input parameters if present
    if (params !== undefined) {
        span.setAttributes({
            "input.params.present": true,
            "input.params.type": typeof params,
            "input.params.value": safeStringify(params),
        });
    }

    // Add error or success information
    if (error !== undefined) {
        const errorMessage = safeStringify(error);
        const isValidationError =
            errorMessage.includes("validation") || errorMessage.includes("schema") || errorMessage.includes("required");

        span.setAttributes({
            "td.validation": isValidationError ? "failed" : "passed",
            "error.category": isValidationError ? "td_validation" : "handler_execution",
            "error.message": errorMessage,
            status: "error",
        });
    } else {
        span.setAttributes({
            "td.validation": "passed",
            "handler.execution": "success",
            status: "success",
        });

        // Add result if present
        if (result !== undefined) {
            span.setAttributes({ "result.value": safeStringify(result) });
        }
    }
}

export function initTracing(serviceName: string): void {
    try {
        const provider = new NodeTracerProvider({
            resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: "development",
            }),
        });

        provider.addSpanProcessor(
            new BatchSpanProcessor(
                new JaegerExporter({
                    endpoint: process.env.JAEGER_ENDPOINT ?? "http://host.docker.internal:8085/api/traces",
                }),
                {
                    // Ensure spans are processed quickly
                    scheduledDelayMillis: 100,
                    maxQueueSize: 1000,
                    maxExportBatchSize: 100,
                }
            )
        );

        provider.register();
        tracer = trace.getTracer(serviceName) as TracerLike;

        console.log(`OpenTelemetry tracing initialized for service: ${serviceName}`);
    } catch (error) {
        console.error("Failed to initialize OpenTelemetry tracing:", error);
        // Create a no-op tracer as fallback
        tracer = {
            startActiveSpan: (name: string, fn: (span: SpanLike) => Promise<unknown> | unknown) => {
                return fn({
                    setAttributes: () => {},
                    setStatus: () => {},
                    end: () => {},
                });
            },
        };
    }
}

export function traceAction<T>(
    name: string,
    fn: (params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<T>
): (params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<T> {
    return async (params, options) => {
        if (tracer === null || tracer.startActiveSpan === undefined) {
            // Fallback if tracer is not available
            return fn(params, options);
        }

        return tracer.startActiveSpan(`action.${name}`, async (span: SpanLike) => {
            try {
                const result = await fn(params, options);
                setSpanAttributes(span, name, "invokeaction", options, params, null, result);
                if (span.setStatus !== undefined) {
                    span.setStatus({ code: SpanStatusCode.OK });
                }
                return result;
            } catch (error) {
                setSpanAttributes(span, name, "invokeaction", options, params, error);
                if (span.setStatus !== undefined) {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                }
                throw error;
            } finally {
                if (span.end !== undefined) {
                    span.end();
                }
            }
        }) as Promise<T>;
    };
}

export function tracePropertyRead<T>(
    name: string,
    fn: (options?: WoT.InteractionOptions) => Promise<T>
): (options?: WoT.InteractionOptions) => Promise<T> {
    return async (options) => {
        if (tracer === null || tracer.startActiveSpan === undefined) {
            return fn(options);
        }
        return tracer.startActiveSpan(`property.read.${name}`, async (span: SpanLike) => {
            try {
                const result = await fn(options);
                setSpanAttributes(span, name, "readproperty", options, undefined, null, result);
                if (span.setStatus !== undefined) {
                    span.setStatus({ code: SpanStatusCode.OK });
                }
                return result;
            } catch (error) {
                setSpanAttributes(span, name, "readproperty", options, undefined, error);
                if (span.setStatus !== undefined) {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                }
                throw error;
            } finally {
                if (span.end !== undefined) {
                    span.end();
                }
            }
        }) as Promise<T>;
    };
}

export function tracePropertyWrite(
    name: string,
    fn: (value: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<void>
): (value: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<void> {
    return async (value, options) => {
        if (tracer === null || tracer.startActiveSpan === undefined) {
            return fn(value, options);
        }
        return tracer.startActiveSpan(`property.write.${name}`, async (span: SpanLike) => {
            try {
                await fn(value, options);
                setSpanAttributes(span, name, "writeproperty", options, value);
                if (span.setStatus !== undefined) {
                    span.setStatus({ code: SpanStatusCode.OK });
                }
            } catch (error) {
                setSpanAttributes(span, name, "writeproperty", options, value, error);
                if (span.setStatus !== undefined) {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                }
                throw error;
            } finally {
                if (span.end !== undefined) {
                    span.end();
                }
            }
        }) as Promise<void>;
    };
}

export function traceEvent(
    name: string,
    fn: (data: WoT.InteractionInput, options?: WoT.InteractionOptions) => void
): (data: WoT.InteractionInput, options?: WoT.InteractionOptions) => void {
    return (data, options) => {
        if (tracer === null || tracer.startActiveSpan === undefined) {
            fn(data, options);
            return;
        }
        tracer.startActiveSpan(`event.${name}`, async (span: SpanLike) => {
            try {
                fn(data, options);
                setSpanAttributes(span, name, "subscribeevent", options, data);
                if (span.setStatus !== undefined) {
                    span.setStatus({ code: SpanStatusCode.OK });
                }
            } catch (error) {
                setSpanAttributes(span, name, "subscribeevent", options, data, error);
                if (span.setStatus !== undefined) {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                }
                throw error;
            } finally {
                if (span.end !== undefined) {
                    span.end();
                }
            }
        });
    };
}

// Helper function to create nested spans for operations
export function createChildSpan<T>(
    operationName: string,
    operation: () => Promise<T> | T,
    attributes?: Record<string, unknown>
): Promise<T> {
    if (tracer === null || tracer.startActiveSpan === undefined) {
        return Promise.resolve(operation());
    }

    return tracer.startActiveSpan(operationName, async (span: SpanLike) => {
        try {
            // Add custom attributes if provided
            if (attributes !== undefined && span.setAttributes !== undefined) {
                span.setAttributes(attributes);
            }

            const result = await operation();
            if (span.setStatus !== undefined) {
                span.setStatus({ code: SpanStatusCode.OK });
            }
            return result;
        } catch (error) {
            if (span.setStatus !== undefined) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
            }
            if (span.setAttributes !== undefined) {
                span.setAttributes({
                    "error.name": error instanceof Error ? error.name : "Error",
                    "error.message": String(error),
                });
            }
            throw error;
        } finally {
            if (span.end !== undefined) {
                span.end();
            }
        }
    }) as Promise<T>;
}

// Helper function to simulate database operations
export function traceDatabaseOperation<T>(
    operation: string,
    table: string,
    operationFn: () => Promise<T> | T
): Promise<T> {
    if (tracer === null) {
        return Promise.resolve(operationFn());
    }
    return createChildSpan(`db.${operation}`, operationFn, {
        "db.operation": operation,
        "db.table": table,
        "db.system": "memory", // Since we're using in-memory storage
        "span.kind": "internal",
    });
}

// Helper function to trace validation operations
export function traceValidation<T>(
    validationType: string,
    data: WoT.InteractionInput | null,
    validationFn: () => Promise<T> | T
): Promise<T> {
    if (tracer === null) {
        return Promise.resolve(validationFn());
    }
    return createChildSpan(`validation.${validationType}`, validationFn, {
        "validation.type": validationType,
        "validation.input": safeStringify(data),
        "span.kind": "internal",
    });
}

// Helper function to trace business logic operations
export function traceBusinessLogic<T>(
    operationName: string,
    operationFn: () => Promise<T> | T,
    metadata?: Record<string, unknown>
): Promise<T> {
    if (tracer === null) {
        return Promise.resolve(operationFn());
    }
    return createChildSpan(`business.${operationName}`, operationFn, {
        "business.operation": operationName,
        "span.kind": "internal",
        ...metadata,
    });
}

export const tracedActionHandler = traceAction;
export const tracedPropertyReadHandler = tracePropertyRead;
export const tracedPropertyWriteHandler = tracePropertyWrite;
export const tracedEventHandler = traceEvent;
