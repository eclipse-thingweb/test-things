import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { trace, SpanStatusCode } from "@opentelemetry/api";
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
    const nameKey = isAction ? "action.name" : "property.name";

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
    const provider = new NodeTracerProvider({
        resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
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
}

export function traceAction<T>(
    name: string,
    fn: (params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<T>
): (params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<T> {
    return async (params, options) => {
        return tracer.startActiveSpan(`action.${name}`, async (span: any) => {
            try {
                const result = await fn(params, options);
                setSpanAttributes(span, name, "invokeaction", options, params, null, result);
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                setSpanAttributes(span, name, "invokeaction", options, params, error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
                throw error;
            } finally {
                span.end();
            }
        });
    };
}

export function traceProperty(
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

// Legacy compatibility
export const tracedActionHandler = traceAction;
export const tracedPropertyWriteHandler = traceProperty;
