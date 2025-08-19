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

import WoT from "wot-typescript-definitions";
import {
    tracedPropertyReadHandler,
    tracedPropertyWriteHandler,
    tracedActionHandler,
    traceBusinessLogic,
    traceValidation,
    traceDatabaseOperation,
    createChildSpan,
} from "./tracing";


interface ValidationConfig {
    type: string;
    validator: (data: any) => Promise<void> | void;
}

interface DatabaseConfig {
    operation: string;
    table: string;
}

interface ProcessingConfig {
    name: string;
    attributes?: Record<string, any>;
}

interface BusinessLogicConfig {
    name: string;
    validations?: ValidationConfig[];
    database?: DatabaseConfig[];
    processing?: ProcessingConfig[];
    metadata?: Record<string, any>;
}

// Auto-traced property handler
export function autoTracedPropertyRead<T>(
    propertyName: string,
    config: BusinessLogicConfig,
    businessLogic: (options?: any) => Promise<T> | T
): (options?: WoT.InteractionOptions) => Promise<T> {
    return tracedPropertyReadHandler(propertyName, async (options) => {
        return await traceBusinessLogic(config.name, async () => {
            // Execute validations
            if (config.validations) {
                for (const validation of config.validations) {
                    await traceValidation(validation.type, null, async () => {
                        await validation.validator(null);
                    });
                }
            }

            // Execute database operations
            if (config.database) {
                for (const db of config.database) {
                    await traceDatabaseOperation(db.operation, db.table, async () => {});
                }
            }

            // Execute processing steps
            if (config.processing) {
                for (const proc of config.processing) {
                    await createChildSpan(proc.name, async () => {}, proc.attributes);
                }
            }

            // Execute main business logic
            return await businessLogic(options);
        });
    });
}

// Auto-traced property write handler
export function autoTracedPropertyWrite(
    propertyName: string,
    config: BusinessLogicConfig,
    businessLogic: (value: any, options?: any) => Promise<void> | void
): (value: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<void> {
    return tracedPropertyWriteHandler(propertyName, async (value, options) => {
        return await traceBusinessLogic(config.name, async () => {
            // Execute validations with the input value
            if (config.validations) {
                for (const validation of config.validations) {
                    await traceValidation(validation.type, value, async () => {
                        await validation.validator(value);
                    });
                }
            }

            // Execute processing steps
            if (config.processing) {
                for (const proc of config.processing) {
                    await createChildSpan(proc.name, async () => {}, proc.attributes);
                }
            }

            // Execute database operations
            if (config.database) {
                for (const db of config.database) {
                    await traceDatabaseOperation(db.operation, db.table, async () => {});
                }
            }

            // Execute main business logic
            await businessLogic(value, options);
        });
    });
}

// Auto-traced action handler
export function autoTracedAction<T>(
    actionName: string,
    config: BusinessLogicConfig,
    businessLogic: (params?: any, options?: any) => Promise<T> | T
): (params?: WoT.InteractionInput, options?: WoT.InteractionOptions) => Promise<T> {
    return tracedActionHandler(actionName, async (params, options) => {
        return await traceBusinessLogic(config.name, async () => {
            // Execute validations
            if (config.validations) {
                for (const validation of config.validations) {
                    await traceValidation(validation.type, params, async () => {
                        await validation.validator(params);
                    });
                }
            }

            // Execute processing steps  
            if (config.processing) {
                for (const proc of config.processing) {
                    await createChildSpan(proc.name, async () => {}, proc.attributes);
                }
            }

            // Execute database operations
            if (config.database) {
                for (const db of config.database) {
                    await traceDatabaseOperation(db.operation, db.table, async () => {});
                }
            }

            // Execute main business logic
            return await businessLogic(params, options);
        });
    });
}

// Smart wrapper that automatically creates spans based on function calls
export class TracedBusinessLogic {
    constructor(private baseSpanName: string) {}

    async withValidation<T>(
        validationType: string,
        data: any,
        operation: () => Promise<T> | T
    ): Promise<T> {
        return await traceValidation(validationType, data, operation);
    }

    async withDatabase<T>(
        operation: string,
        table: string,
        dbOperation: () => Promise<T> | T
    ): Promise<T> {
        return await traceDatabaseOperation(operation, table, dbOperation);
    }

    async withProcessing<T>(
        operationName: string,
        operation: () => Promise<T> | T,
        attributes?: Record<string, any>
    ): Promise<T> {
        return await createChildSpan(operationName, operation, attributes);
    }

    async execute<T>(operation: () => Promise<T> | T): Promise<T> {
        return await traceBusinessLogic(this.baseSpanName, operation);
    }
}


export function createTracedLogic(spanName: string): TracedBusinessLogic {
    return new TracedBusinessLogic(spanName);
}

export class TracingConfigBuilder {
    private config: BusinessLogicConfig;

    constructor(businessLogicName: string) {
        this.config = { name: businessLogicName };
    }

    addValidation(type: string, validator: (data: any) => Promise<void> | void): TracingConfigBuilder {
        if (!this.config.validations) this.config.validations = [];
        this.config.validations.push({ type, validator });
        return this;
    }

    addDatabase(operation: string, table: string): TracingConfigBuilder {
        if (!this.config.database) this.config.database = [];
        this.config.database.push({ operation, table });
        return this;
    }

    addProcessing(name: string, attributes?: Record<string, any>): TracingConfigBuilder {
        if (!this.config.processing) this.config.processing = [];
        this.config.processing.push({ name, attributes });
        return this;
    }

    addMetadata(metadata: Record<string, any>): TracingConfigBuilder {
        this.config.metadata = { ...this.config.metadata, ...metadata };
        return this;
    }

    build(): BusinessLogicConfig {
        return this.config;
    }
}

export function tracingConfig(businessLogicName: string): TracingConfigBuilder {
    return new TracingConfigBuilder(businessLogicName);
}

export class AutoTracedThing {
    constructor(private thing: WoT.ExposedThing) {}

    setPropertyReadHandler<T>(
        propertyName: string,
        businessLogicName: string,
        businessLogic: (options?: any) => Promise<T> | T,
        configBuilder?: (builder: TracingConfigBuilder) => TracingConfigBuilder
    ): void {
        let config = tracingConfig(businessLogicName);
        if (configBuilder) {
            config = configBuilder(config);
        }
        
        this.thing.setPropertyReadHandler(
            propertyName,
            autoTracedPropertyRead(propertyName, config.build(), businessLogic) as any
        );
    }

    setPropertyWriteHandler(
        propertyName: string,
        businessLogicName: string,
        businessLogic: (value: any, options?: any) => Promise<void> | void,
        configBuilder?: (builder: TracingConfigBuilder) => TracingConfigBuilder
    ): void {
        let config = tracingConfig(businessLogicName);
        if (configBuilder) {
            config = configBuilder(config);
        }
        
        this.thing.setPropertyWriteHandler(
            propertyName,
            autoTracedPropertyWrite(propertyName, config.build(), businessLogic)
        );
    }

    setActionHandler<T>(
        actionName: string,
        businessLogicName: string,
        businessLogic: (params?: any, options?: any) => Promise<T> | T,
        configBuilder?: (builder: TracingConfigBuilder) => TracingConfigBuilder
    ): void {
        let config = tracingConfig(businessLogicName);
        if (configBuilder) {
            config = configBuilder(config);
        }
        
        this.thing.setActionHandler(
            actionName,
            autoTracedAction(actionName, config.build(), businessLogic) as any
        );
    }

    // Delegate other methods to the wrapped thing
    writeProperty(propertyName: string, value: any): Promise<void> {
        return (this.thing as any).writeProperty(propertyName, value);
    }

    readProperty(propertyName: string, options?: WoT.InteractionOptions): Promise<WoT.InteractionOutput> {
        return (this.thing as any).readProperty(propertyName, options);
    }

    emitEvent(eventName: string, data?: any): void {
        this.thing.emitEvent(eventName, data);
    }

    emitPropertyChange(propertyName: string): void {
        this.thing.emitPropertyChange(propertyName);
    }

    expose(): Promise<void> {
        return this.thing.expose();
    }

    destroy(): Promise<void> {
        return this.thing.destroy();
    }

    // Get the underlying thing for direct access if needed
    getUnderlyingThing(): WoT.ExposedThing {
        return this.thing;
    }
}

// Factory function for creating auto-traced things
export function createAutoTracedThing(thing: WoT.ExposedThing): AutoTracedThing {
    return new AutoTracedThing(thing);
}
