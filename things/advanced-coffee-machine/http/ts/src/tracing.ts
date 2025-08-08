import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { trace, SpanStatusCode, SpanKind } from "@opentelemetry/api";

import WoT from "wot-typescript-definitions";

let tracer: any = null;

function safeStringify(value: any): string {
    try {
        return value === null || value === undefined
            ? String(value)
            : typeof value === "string" || typeof value === "number" || typeof value === "boolean"
              ? String(value)
              : JSON.stringify(value);
    } catch {
        return `[Unable to serialize: ${typeof value}]`;
    }
}

function setSpanAttributes(
    span: any,
    name: string,
    operation: string,
    options: any,
    params?: any,
    error?: any,
    result?: any
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
    if (options) {
        span.setAttributes({ "input.options": safeStringify(options) });

        // Add URI variables if present
        if (options.uriVariables) {
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
    if (error) {
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
                    endpoint: process.env.JAEGER_ENDPOINT || "http://host.docker.internal:14268/api/traces",
                })
            )
        );

        provider.register();
        tracer = trace.getTracer(serviceName);

        console.log(`OpenTelemetry tracing initialized for service: ${serviceName}`);
    } catch (error) {
        console.error("Failed to initialize OpenTelemetry tracing:", error);
        // Create a no-op tracer as fallback
        tracer = {
            startActiveSpan: (name: string, fn: Function) => {
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
        if (!tracer || !tracer.startActiveSpan) {
            // Fallback if tracer is not available
            return fn(params, options);
        }

        return tracer.startActiveSpan(`action.${name}`, async (span: any) => {
            try {
                const result = await fn(params, options);
                setSpanAttributes(span, name, "invokeaction", options, params, null, result);
                if (span.setStatus) {
                    span.setStatus({ code: SpanStatusCode.OK });
                }
                return result;
            } catch (error) {
                setSpanAttributes(span, name, "invokeaction", options, params, error);
                if (span.setStatus) {
                    span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                }
                throw error;
            } finally {
                if (span.end) {
                    span.end();
                }
            }
        });
    };
}

export function tracePropertyRead<T>(
    name: string,
    fn: (options?: WoT.InteractionOptions) => Promise<T>
): (options?: WoT.InteractionOptions) => Promise<T> {
    return async (options) => {
        return tracer.startActiveSpan(`property.read.${name}`, async (span: any) => {
            try {
                const result = await fn(options);
                setSpanAttributes(span, name, "readproperty", options, undefined, null, result);
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                setSpanAttributes(span, name, "readproperty", options, undefined, error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                throw error;
            } finally {
                span.end();
            }
        });
    };
}

export function tracePropertyWrite(
    name: string,
    fn: (value: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<void>
): (value: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<void> {
    return async (value, options) => {
        return tracer.startActiveSpan(`property.write.${name}`, async (span: any) => {
            try {
                await fn(value, options);
                setSpanAttributes(span, name, "writeproperty", options, value);
                span.setStatus({ code: SpanStatusCode.OK });
            } catch (error) {
                setSpanAttributes(span, name, "writeproperty", options, value, error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                throw error;
            } finally {
                span.end();
            }
        });
    };
}

export function traceEvent(
    name: string,
    fn: (data: any, options?: WoT.InteractionOptions) => void
): (data: any, options?: WoT.InteractionOptions) => void {
    return (data, options) => {
        tracer.startActiveSpan(`event.${name}`, async (span: any) => {
            try {
                fn(data, options);
                setSpanAttributes(span, name, "subscribeevent", options, data);
                span.setStatus({ code: SpanStatusCode.OK });
            } catch (error) {
                setSpanAttributes(span, name, "subscribeevent", options, data, error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                throw error;
            } finally {
                span.end();
            }
        });
    };
}

// Helper function to create nested spans for operations
export function createChildSpan<T>(
    operationName: string,
    operation: () => Promise<T> | T,
    attributes?: Record<string, any>
): Promise<T> {
    if (!tracer || !tracer.startActiveSpan) {
        // Fallback if tracer is not available
        return Promise.resolve(operation());
    }

    return tracer.startActiveSpan(operationName, async (span: any) => {
        try {
            // Add custom attributes if provided
            if (attributes && span.setAttributes) {
                span.setAttributes(attributes);
            }

            const result = await operation();
            if (span.setStatus) {
                span.setStatus({ code: SpanStatusCode.OK });
            }
            return result;
        } catch (error) {
            if (span.setStatus) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
            }
            if (span.setAttributes) {
                span.setAttributes({
                    "error.name": error instanceof Error ? error.name : "Error",
                    "error.message": String(error),
                });
            }
            throw error;
        } finally {
            if (span.end) {
                span.end();
            }
        }
    });
}

// Helper function to simulate database operations
export function traceDatabaseOperation<T>(
    operation: string,
    table: string,
    operation_fn: () => Promise<T> | T
): Promise<T> {
    if (!tracer) {
        return Promise.resolve(operation_fn());
    }
    return createChildSpan(`db.${operation}`, operation_fn, {
        "db.operation": operation,
        "db.table": table,
        "db.system": "memory", // Since we're using in-memory storage
        "span.kind": "internal",
    });
}

// Helper function to trace validation operations
export function traceValidation<T>(validationType: string, data: any, validation_fn: () => Promise<T> | T): Promise<T> {
    if (!tracer) {
        return Promise.resolve(validation_fn());
    }
    return createChildSpan(`validation.${validationType}`, validation_fn, {
        "validation.type": validationType,
        "validation.input": safeStringify(data),
        "span.kind": "internal",
    });
}

// Helper function to trace business logic operations
export function traceBusinessLogic<T>(
    operationName: string,
    operation_fn: () => Promise<T> | T,
    metadata?: Record<string, any>
): Promise<T> {
    if (!tracer) {
        return Promise.resolve(operation_fn());
    }
    return createChildSpan(`business.${operationName}`, operation_fn, {
        "business.operation": operationName,
        "span.kind": "internal",
        ...metadata,
    });
}

// Legacy compatibility
export const tracedActionHandler = traceAction;
export const tracedPropertyReadHandler = tracePropertyRead;
export const tracedPropertyWriteHandler = tracePropertyWrite;
export const tracedEventHandler = traceEvent;
