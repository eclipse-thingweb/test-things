import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { trace, SpanStatusCode, Span } from "@opentelemetry/api";
import WoT from "wot-typescript-definitions";

const provider = new NodeTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "advanced-coffee-machine",
    }),
});
const exporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || "http://host.docker.internal:14268/api/traces",
});
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// Get tracer for early tracing
const tracer = trace.getTracer("advanced-coffee-machine");

/**
 * Safely converts any value to a string for span tagging
 */
function safeStringify(value: any): string {
    try {
        if (value === null || value === undefined) return String(value);
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        return JSON.stringify(value);
    } catch (error) {
        return `[Unable to serialize: ${typeof value}]`;
    }
}

/**
 * Adds comprehensive input parameter tags to a span
 */
function addInputTags(span: Span, params: any, options: any, actionName: string) {
    // Basic span information
    span.setAttributes({
        'action.name': actionName,
        'wot.operation': 'invokeaction',
        'request.timestamp': new Date().toISOString(),
    });

    // Capture raw parameters
    if (params !== undefined && params !== null) {
        try {
            // Try to get the actual value if it's a WoT InteractionInput
            if (params && typeof params.value === 'function') {
                params.value().then((actualValue: any) => {
                    span.setAttributes({
                        'input.params.raw': safeStringify(actualValue),
                        'input.params.type': typeof actualValue,
                        'input.params.present': true
                    });
                }).catch((error: any) => {
                    span.setAttributes({
                        'input.params.error': safeStringify(error),
                        'input.params.present': false
                    });
                });
            } else {
                span.setAttributes({
                    'input.params.raw': safeStringify(params),
                    'input.params.type': typeof params,
                    'input.params.present': true
                });
            }
        } catch (error) {
            span.setAttributes({
                'input.params.error': safeStringify(error),
                'input.params.present': false
            });
        }
    } else {
        span.setAttributes({
            'input.params.present': false
        });
    }

    // Capture options and uriVariables
    if (options && typeof options === 'object') {
        try {
            span.setAttributes({
                'input.options.present': true,
                'input.options.raw': safeStringify(options)
            });

            // Specifically capture uriVariables
            if ('uriVariables' in options && options.uriVariables) {
                const uriVars = options.uriVariables as Record<string, any>;
                span.setAttributes({
                    'input.uriVariables.present': true,
                    'input.uriVariables.raw': safeStringify(uriVars)
                });

                // Add individual uriVariable tags
                Object.entries(uriVars).forEach(([key, value]) => {
                    span.setAttributes({
                        [`input.uriVariables.${key}`]: safeStringify(value)
                    });
                });
            }

            // Capture any formIndex if present
            if ('formIndex' in options) {
                span.setAttributes({
                    'input.formIndex': String(options.formIndex)
                });
            }
        } catch (error) {
            span.setAttributes({
                'input.options.error': safeStringify(error),
                'input.options.present': false
            });
        }
    } else {
        span.setAttributes({
            'input.options.present': false
        });
    }
}

/**
 * Creates a traced action handler that captures input parameters BEFORE TD validation
 */
export function tracedActionHandler(
    actionName: string,
    originalHandler: (params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<any>
): (params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<any> {
    return async (params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => {
        // Start span IMMEDIATELY - before any TD validation or processing
        return await tracer.startActiveSpan(`action.${actionName}`, async (span) => {
            try {
                // Capture ALL input parameters as tags FIRST
                addInputTags(span, params, options, actionName);

                // Mark as processing
                span.setAttributes({
                    'span.stage': 'processing',
                    'td.validation': 'pending'
                });

                // Now call the original handler - TD validation happens inside node-wot
                const result = await originalHandler(params, options);

                // If we get here, TD validation passed and handler succeeded
                span.setAttributes({
                    'td.validation': 'passed',
                    'handler.execution': 'success',
                    'span.stage': 'completed',
                    'output.present': result !== undefined
                });

                if (result !== undefined) {
                    span.setAttributes({
                        'output.value': safeStringify(result)
                    });
                }

                span.setStatus({ code: SpanStatusCode.OK });
                return result;

            } catch (error) {
                // Capture error details - could be TD validation or handler error
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorName = error instanceof Error ? error.name : 'Unknown';

                span.setAttributes({
                    'error.occurred': true,
                    'error.message': errorMessage,
                    'error.name': errorName,
                    'error.type': typeof error,
                    'span.stage': 'error'
                });

                // Try to determine if this is a TD validation error
                if (errorMessage.includes('validation') || 
                    errorMessage.includes('schema') || 
                    errorMessage.includes('required') ||
                    errorMessage.includes('type') ||
                    errorName.includes('Validation')) {
                    span.setAttributes({
                        'td.validation': 'failed',
                        'error.category': 'td_validation'
                    });
                } else {
                    span.setAttributes({
                        'td.validation': 'passed',
                        'handler.execution': 'failed',
                        'error.category': 'handler_execution'
                    });
                }

                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: errorMessage
                });

                throw error;
            } finally {
                span.end();
            }
        });
    };
}

/**
 * Creates a traced property write handler that captures input parameters BEFORE TD validation
 */
export function tracedPropertyWriteHandler(
    propertyName: string,
    originalHandler: (value: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<void>
): (value: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<void> {
    return async (value: WoT.InteractionInput, options?: WoT.InteractionOptions) => {
        return await tracer.startActiveSpan(`property.write.${propertyName}`, async (span) => {
            try {
                // Capture input parameters immediately
                span.setAttributes({
                    'property.name': propertyName,
                    'wot.operation': 'writeproperty',
                    'request.timestamp': new Date().toISOString(),
                    'span.stage': 'processing'
                });

                addInputTags(span, value, options, `write.${propertyName}`);

                // Call original handler
                await originalHandler(value, options);

                span.setAttributes({
                    'td.validation': 'passed',
                    'handler.execution': 'success',
                    'span.stage': 'completed'
                });

                span.setStatus({ code: SpanStatusCode.OK });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                span.setAttributes({
                    'error.occurred': true,
                    'error.message': errorMessage,
                    'span.stage': 'error'
                });

                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: errorMessage
                });

                throw error;
            } finally {
                span.end();
            }
        });
    };
}

// Export tracer for any manual span creation
export { tracer };
