import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import WoT from "wot-typescript-definitions";

let tracer: any = null;

function safeStringify(value: any): string {
    try {
        if (value === null || value === undefined) return String(value);
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        return JSON.stringify(value);
    } catch {
        return `[Unable to serialize: ${typeof value}]`;
    }
}

async function captureInputs(span: any, params: any, options: any, operation: string): Promise<void> {
    span.setAttributes({
        'wot.operation': operation,
        'timestamp': new Date().toISOString(),
    });

    // Capture params without consuming the stream
    if (params !== undefined && params !== null) {
        try {
            // Don't call params.value() as it consumes the stream
            // Just capture that params are present and their type
            span.setAttributes({
                'input.params.present': true,
                'input.params.type': typeof params
            });
        } catch (error) {
            span.setAttributes({ 'input.params.error': safeStringify(error) });
        }
    } else {
        span.setAttributes({ 'input.params.present': false });
    }

    // Capture options and uriVariables
    if (options && typeof options === 'object') {
        span.setAttributes({ 'input.options': safeStringify(options) });
        
        if ('uriVariables' in options && options.uriVariables) {
            const uriVars = options.uriVariables as Record<string, any>;
            span.setAttributes({ 'input.uriVariables': safeStringify(uriVars) });
            
            // Add individual uriVariable tags
            Object.entries(uriVars).forEach(([key, value]) => {
                span.setAttributes({ [`input.uriVariables.${key}`]: safeStringify(value) });
            });
        }
    }
}

export function initTracing(serviceName: string): void {
    const provider = new NodeTracerProvider({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        }),
    });
    
    provider.addSpanProcessor(new BatchSpanProcessor(new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || "http://host.docker.internal:14268/api/traces",
    })));
    
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
                span.setAttributes({ 'action.name': name });
                await captureInputs(span, params, options, 'invokeaction');
                
                const result = await fn(params, options);
                
                span.setAttributes({
                    'result.present': result !== undefined,
                    'result.value': result !== undefined ? safeStringify(result) : 'undefined',
                    'status': 'success'
                });
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (error) {
                span.setAttributes({ 
                    'error.message': safeStringify(error),
                    'status': 'error'
                });
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
                span.setAttributes({ 'property.name': name });
                await captureInputs(span, value, options, 'writeproperty');
                await fn(value, options);
                span.setAttributes({ 'status': 'success' });
                span.setStatus({ code: SpanStatusCode.OK });
            } catch (error) {
                span.setAttributes({ 
                    'error.message': safeStringify(error),
                    'status': 'error'
                });
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
