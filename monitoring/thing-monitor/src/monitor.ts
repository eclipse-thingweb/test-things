import { Servient } from "@node-wot/core";
import { HttpClientFactory } from "@node-wot/binding-http";
import { MqttClientFactory } from "@node-wot/binding-mqtt";
import { CoapClientFactory } from "@node-wot/binding-coap";
import { ModbusClientFactory } from "@node-wot/binding-modbus";
import { createLogger, format, transports } from "winston";
import LokiTransport from "winston-loki";
import { ThingConfig, ThingStatus, MonitorConfig } from "./types";
import { NotificationService } from "./notifications";

const logger = createLogger({
    transports: [
        new transports.Console({
            format: format.combine(format.simple(), format.colorize()),
        }),
    ],
});

// Starts logging with Loki
if (process.env.LOKI_HOSTNAME && process.env.LOKI_PORT) {
    logger.add(
        new LokiTransport({
            host: `http://${process.env.LOKI_HOSTNAME}:${process.env.LOKI_PORT}`,
            labels: { service: "thing-monitor" },
            json: true,
            format: format.json(),
            replaceTimestamp: true,
            onConnectionError: (err) => console.error(err),
        })
    );
}

export class ThingMonitor {
    private servient: Servient;
    private WoT: any;
    private thingStatuses: Map<string, ThingStatus> = new Map();
    private notificationService: NotificationService;

    constructor(private config: MonitorConfig) {
        this.servient = new Servient();
        this.servient.addClientFactory(new HttpClientFactory());
        this.servient.addClientFactory(new MqttClientFactory());
        this.servient.addClientFactory(new CoapClientFactory());
        this.servient.addClientFactory(new ModbusClientFactory());
        this.notificationService = new NotificationService(
            config.notifications
        );

        config.things.forEach((thing) => {
            this.thingStatuses.set(thing.name, {
                name: thing.name,
                protocol: thing.protocol,
                isUp: false,
                lastCheck: new Date(),
                retryCount: 0,
            });
        });
    }

    async start(): Promise<void> {
        logger.info("Starting Thing Monitor service");
        try {
            this.WoT = await this.servient.start();
            logger.info("WoT Servient started successfully.");
        } catch (error) {
            logger.error("Failed to start WoT Servient:", error);
            throw error;
        }
        this.checkAllThings();
        setInterval(() => this.checkAllThings(), this.config.heartbeatInterval);
    }

    private async checkAllThings(): Promise<void> {
        const checkPromises = this.config.things.map((thing) =>
            this.checkThing(thing)
        );
        await Promise.all(checkPromises);
    }

    private async checkThing(thing: ThingConfig): Promise<void> {
        const currentStatus = this.thingStatuses.get(thing.name)!;
        const wasUp = currentStatus.isUp;
        try {
            await this.checkThingWithWoT(thing, currentStatus);
            if (!wasUp) {
                logger.info(`${thing.name} is back up.`);
                currentStatus.isUp = true;
                currentStatus.lastCheck = new Date();
                currentStatus.lastError = undefined;
                currentStatus.retryCount = 0;
                await this.notificationService.sendThingUpNotification(
                    currentStatus
                );
            } else {
                currentStatus.isUp = true;
                currentStatus.lastCheck = new Date();
                currentStatus.retryCount = 0;
            }
        } catch (error: any) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            if (wasUp || currentStatus.lastError !== errorMessage) {
                currentStatus.retryCount = 0;
                logger.warn(
                    `${thing.name} has failed for the first time with a new error: ${errorMessage}`
                );
            }
            currentStatus.isUp = false;
            currentStatus.lastCheck = new Date();
            currentStatus.lastError = errorMessage;
            currentStatus.retryCount++;
            const thingLogger = logger.child({ thing: thing.name });
            thingLogger.warn(
                `Thing is down (Attempt ${currentStatus.retryCount}/${this.config.retryCount}): ${errorMessage}`
            );
            if (
                currentStatus.retryCount === 1 ||
                currentStatus.retryCount === this.config.retryCount
            ) {
                await this.notificationService.sendThingDownNotification(
                    currentStatus
                );
            }
        }
    }

    // All encompasing method to deal with all things.
    // Uses node-wot and servient to check
    private async checkThingWithWoT(
        thing: ThingConfig,
        currentStatus: ThingStatus
    ): Promise<void> {
        if (!this.WoT) throw new Error("WoT not initialized");
        
        const thingUrl = this.buildThingUrl(thing);
        
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), this.config.heartbeatTimeout)
        );
        
        const checkPromise = this.WoT.requestThingDescription(thingUrl)
            .then((td: any) => {
                if (!td || typeof td !== 'object' || !td.title) {
                    throw new Error("Invalid Thing Description");
                }
                return this.WoT.consume(td);
            });
        
        await Promise.race([checkPromise, timeoutPromise]);
    }

    private buildThingUrl(thing: ThingConfig): string {
        switch (thing.protocol) {
            case "http":
                return `http://${thing.host}:${thing.port}${thing.path || ""}`;
            case "coap":
                return `coap://${thing.host}:${thing.port}${thing.path || ""}`;
            case "mqtt":
                return `mqtt://${thing.host}:${thing.port}`;
            case "modbus":
                return `modbus+tcp://${thing.host}:${thing.port}`;
            default:
                throw new Error(`Unsupported protocol: ${thing.protocol}`);
        }
    }

    private getThingUrl(thing: ThingConfig): string {
        return this.buildThingUrl(thing);
    }

    getThingStatuses(): ThingStatus[] {
        return Array.from(this.thingStatuses.values());
    }

    getThingStatus(name: string): ThingStatus | undefined {
        return this.thingStatuses.get(name);
    }
}
