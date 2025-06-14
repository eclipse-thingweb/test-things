import { Servient } from '@node-wot/core';
import { HttpClientFactory } from '@node-wot/binding-http';
import { MqttClientFactory } from '@node-wot/binding-mqtt';
import { CoapClientFactory } from '@node-wot/binding-coap';
import { ModbusClientFactory } from '@node-wot/binding-modbus';
import { createLogger, format, transports } from 'winston';
import LokiTransport from 'winston-loki';
import { ThingConfig, ThingStatus, MonitorConfig } from './types';
import { NotificationService } from './notifications';
import fetch, { Response } from 'node-fetch';
import mqtt from 'mqtt';

const logger = createLogger({
    transports: [
        new transports.Console({
            format: format.combine(format.simple(), format.colorize()),
        }),
    ],
});

// Add Loki transport only if hostname and port are configured
if (process.env.LOKI_HOSTNAME && process.env.LOKI_PORT) {
    logger.add(new LokiTransport({
        host: `http://${process.env.LOKI_HOSTNAME}:${process.env.LOKI_PORT}`,
        labels: { service: 'thing-monitor' },
        json: true,
        format: format.json(),
        replaceTimestamp: true,
        onConnectionError: (err) => console.error(err),
    }));
}

export class ThingMonitor {
    private servient: Servient;
    private thingStatuses: Map<string, ThingStatus> = new Map();
    private notificationService: NotificationService;

    constructor(private config: MonitorConfig) {
        this.servient = new Servient();
        // Add protocol bindings to the servient
        this.servient.addClientFactory(new HttpClientFactory());
        this.servient.addClientFactory(new MqttClientFactory());
        this.servient.addClientFactory(new CoapClientFactory());
        this.servient.addClientFactory(new ModbusClientFactory());
        
        this.notificationService = new NotificationService(config.notifications);

        // Initialize status for all things
        config.things.forEach(thing => {
            this.thingStatuses.set(thing.name, {
                name: thing.name,
                protocol: thing.protocol,
                isUp: false,
                lastCheck: new Date(),
                retryCount: 0
            });
        });
    }

    async start(): Promise<void> {
        logger.info('Starting Thing Monitor service');
        
        // Start the WoT servient ONCE. This is a critical change.
        try {
            await this.servient.start();
            logger.info('WoT Servient started successfully.');
        } catch (error) {
            logger.error('Failed to start WoT Servient:', error);
            // If the servient fails to start, we should not proceed.
            throw error;
        }

        // Start periodic checks
        this.checkAllThings(); // Initial check
        setInterval(() => this.checkAllThings(), this.config.heartbeatInterval);
    }

    private async checkAllThings(): Promise<void> {
        const checkPromises = this.config.things.map(thing => this.checkThing(thing));
        await Promise.all(checkPromises);
    }

    private async checkThing(thing: ThingConfig): Promise<void> {
        const currentStatus = this.thingStatuses.get(thing.name)!;
        const wasUp = currentStatus.isUp;

        try {
            switch (thing.protocol) {
                case 'http':
                    await this.checkHttpThing(thing, currentStatus);
                    break;
                case 'mqtt':
                    await this.checkMqttThing(thing, currentStatus);
                    break;
                case 'coap':
                    await this.checkCoapThing(thing, currentStatus);
                    break;
                case 'modbus':
                    await this.checkModbusThing(thing, currentStatus);
                    break;
                default:
                    throw new Error(`Unsupported protocol: ${thing.protocol}`);
            }

            // If we reach here, the Thing is considered UP
            if (!wasUp) {
                // Thing was down and is now up
                logger.info(`${thing.name} is back up.`);
                currentStatus.isUp = true;
                currentStatus.lastCheck = new Date();
                currentStatus.lastError = undefined;
                currentStatus.retryCount = 0;
                await this.notificationService.sendThingUpNotification(currentStatus);
            } else {
                // Thing continues to be up, just update the status
                currentStatus.isUp = true;
                currentStatus.lastCheck = new Date();
                currentStatus.retryCount = 0;
            }

        } catch (error: any) {
            // --- If we reach here, the Thing is considered DOWN ---
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            if (wasUp || currentStatus.lastError !== errorMessage) {
                // Thing was up and is now down, or the error has changed
                currentStatus.retryCount = 0; // Reset retry count for a new error
                logger.warn(`${thing.name} has failed for the first time with a new error: ${errorMessage}`);
            }

            currentStatus.isUp = false;
            currentStatus.lastCheck = new Date();
            currentStatus.lastError = errorMessage;
            currentStatus.retryCount++;
            
            const thingLogger = logger.child({ thing: thing.name });
            thingLogger.warn(`Thing is down (Attempt ${currentStatus.retryCount}/${this.config.retryCount}): ${errorMessage}`);

            // Send notification on the first failure and when retry count is met
            if (currentStatus.retryCount === 1 || currentStatus.retryCount === this.config.retryCount) {
                await this.notificationService.sendThingDownNotification(currentStatus);
            }
        }
    }

    private async checkHttpThing(thing: ThingConfig, currentStatus: ThingStatus): Promise<void> {
        const thingUrl = this.getThingUrl(thing);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), this.config.heartbeatTimeout)
        );

        const fetchPromise = fetch(thingUrl);
        
        // Race the fetch against a timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

        if (!response.ok) {
            throw new Error(`Failed to fetch Thing Description: Status ${response.status} ${response.statusText}`);
        }

        // Try to parse the response as JSON to verify it's a valid Thing Description
        const td = await response.json();
        if (!td || typeof td !== 'object') {
            throw new Error('Invalid Thing Description: Response is not a valid JSON object');
        }
    }

    private async checkMqttThing(thing: ThingConfig, currentStatus: ThingStatus): Promise<void> {
        return new Promise((resolve, reject) => {
            const client = mqtt.connect(`mqtt://${thing.host}:${thing.port}`, {
                clientId: `monitor-${Date.now()}`,
                clean: true,
                connectTimeout: this.config.heartbeatTimeout,
                rejectUnauthorized: false // For testing only, remove in production
            });

            const timeout = setTimeout(() => {
                client.end();
                reject(new Error('MQTT connection timed out'));
            }, this.config.heartbeatTimeout);

            client.on('connect', () => {
                clearTimeout(timeout);
                client.end();
                resolve();
            });

            client.on('error', (err) => {
                clearTimeout(timeout);
                client.end();
                reject(err);
            });
        });
    }

    private async checkCoapThing(thing: ThingConfig, currentStatus: ThingStatus): Promise<void> {
        // We'll use node-fetch to try to fetch the TD over CoAP if possible, or just check if the port is open
        // For now, we'll do a simple UDP socket connection to the port
        const dgram = await import('dgram');
        return new Promise((resolve, reject) => {
            const client = dgram.createSocket('udp4');
            const timeout = setTimeout(() => {
                client.close();
                reject(new Error('CoAP connection timed out'));
            }, this.config.heartbeatTimeout);
            client.on('error', (err) => {
                clearTimeout(timeout);
                client.close();
                reject(err);
            });
            client.send(Buffer.from(''), thing.port, thing.host, (err) => {
                clearTimeout(timeout);
                client.close();
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private async checkModbusThing(thing: ThingConfig, currentStatus: ThingStatus): Promise<void> {
        // We'll use TCP socket to check if the Modbus port is open
        const net = await import('net');
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('Modbus connection timed out'));
            }, this.config.heartbeatTimeout);
            client.connect(thing.port, thing.host, () => {
                clearTimeout(timeout);
                client.destroy();
                resolve();
            });
            client.on('error', (err) => {
                clearTimeout(timeout);
                client.destroy();
                reject(err);
            });
        });
    }

    private getThingUrl(thing: ThingConfig): string {
        // This health check assumes TDs are served over HTTP, which is standard.
        // If your non-HTTP things expose their TD differently, you'll need to adjust this logic.
        return `http://${thing.host}:${thing.port}${thing.path || ''}`;
    }

    getThingStatuses(): ThingStatus[] {
        return Array.from(this.thingStatuses.values());
    }

    getThingStatus(name: string): ThingStatus | undefined {
        return this.thingStatuses.get(name);
    }
}