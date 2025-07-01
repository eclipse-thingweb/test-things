import { Servient } from "@node-wot/core";
import { HttpClientFactory } from "@node-wot/binding-http";
import { MqttClientFactory } from "@node-wot/binding-mqtt";
import { NotificationService } from "./monitoring/thing-monitor/src/notifications";
import {
    NotificationConfig,
    ThingProtocol,
} from "./monitoring/thing-monitor/src/types";
require("dotenv").config();

interface ThingConfig {
    name: string;
    protocol: ThingProtocol;
    host: string;
    port: number;
    path?: string;
}

interface ThingStatus {
    name: string;
    protocol: ThingProtocol;
    isUp: boolean;
    lastCheck: Date;
    retryCount: number;
    lastError?: string;
}

// Configuration for testing
const config = {
    heartbeatTimeout: 5000,
    retryCount: 3,
};

// Define the things to monitor
const thingsToMonitor: ThingConfig[] = [
    {
        name: "http-express-calculator-simple",
        protocol: "http",
        host: process.env.STACK_HOSTNAME || "localhost",
        port: Number(process.env.WEB_PORT_OUT) || 80,
        path: "/http-express-calculator-simple",
    },
    {
        name: "http-express-calculator-content-negotiation",
        protocol: "http",
        host: process.env.STACK_HOSTNAME || "localhost",
        port: Number(process.env.WEB_PORT_OUT) || 80,
        path: "/http-express-calculator-content-negotiation",
    },
    {
        name: "http-flask-calculator",
        protocol: "http",
        host: process.env.STACK_HOSTNAME || "localhost",
        port: Number(process.env.WEB_PORT_OUT) || 80,
        path: "/http-flask-calculator",
    },
    {
        name: "http-advanced-coffee-machine",
        protocol: "http",
        host: process.env.STACK_HOSTNAME || "localhost",
        port: Number(process.env.WEB_PORT_OUT) || 80,
        path: "/http-advanced-coffee-machine",
    },
    {
        name: "http-data-schema-thing",
        protocol: "http",
        host: process.env.STACK_HOSTNAME || "localhost",
        port: Number(process.env.WEB_PORT_OUT) || 80,
        path: "/http-data-schema-thing",
    },
    {
        name: "mqtt-calculator",
        protocol: "mqtt",
        host: process.env.BROKER_URI || "localhost",
        port: 1883,
    },
    {
        name: "mqtt-broker",
        protocol: "mqtt",
        host: process.env.BROKER_URI || "localhost",
        port: 1883,
    },
];

const notificationConfig: NotificationConfig = {
    email: {
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: parseInt(process.env.SMTP_PORT || "587"),
        smtpUser: process.env.SMTP_USER || "",
        smtpPass: process.env.SMTP_PASS || "",
        recipientEmail: process.env.NOTIFICATION_EMAIL || "",
    },
};
const notificationService = new NotificationService(notificationConfig);

class SimpleThingMonitor {
    private thingStatuses: Map<string, ThingStatus>;
    private servient: Servient;
    private WoT: any;

    constructor() {
        this.thingStatuses = new Map();
        this.servient = new Servient();
        this.servient.addClientFactory(new HttpClientFactory());
        this.servient.addClientFactory(new MqttClientFactory());
        thingsToMonitor.forEach((thing) => {
            this.thingStatuses.set(thing.name, {
                name: thing.name,
                protocol: thing.protocol,
                isUp: false,
                lastCheck: new Date(),
                retryCount: 0,
                lastError: undefined,
            });
        });
    }

    async start() {
        this.WoT = await this.servient.start();
        await this.checkAllThings();
        setInterval(async () => {
            await this.checkAllThings();
        }, 30000);
    }

    async checkAllThings() {
        console.log("\n🔍 Starting monitoring check...");
        console.log("=".repeat(60));
        const checkPromises = thingsToMonitor.map((thing) =>
            this.checkThing(thing)
        );
        await Promise.all(checkPromises);
        this.printStatus();
    }

    async checkThing(thing: ThingConfig) {
        const currentStatus = this.thingStatuses.get(thing.name)!;
        const wasUp = currentStatus.isUp;
        try {
            await this.checkThingWithWoT(thing, currentStatus);
            if (!wasUp) {
                console.log(`${thing.name} is back up!`);
            }
            currentStatus.isUp = true;
            currentStatus.lastCheck = new Date();
            currentStatus.lastError = undefined;
            currentStatus.retryCount = 0;
        } catch (error: unknown) {
            let errorMessage = "Unknown error";
            if (error && typeof error === "object" && "message" in error) {
                errorMessage = (error as any).message;
            } else if (typeof error === "string") {
                errorMessage = error;
            }
            if (wasUp || currentStatus.lastError !== errorMessage) {
                console.log(`${thing.name} has failed: ${errorMessage}`);
                await notificationService.sendThingDownNotification(
                    currentStatus
                );
            }
            currentStatus.isUp = false;
            currentStatus.lastCheck = new Date();
            currentStatus.lastError = errorMessage;
            currentStatus.retryCount++;
        }
    }

    async checkThingWithWoT(thing: ThingConfig, currentStatus: ThingStatus) {
        if (!this.WoT) throw new Error("WoT not initialized");
        let thingUrl = "";
        switch (thing.protocol) {
            case "http":
                thingUrl = `http://${thing.host}:${thing.port}${
                    thing.path || ""
                }`;
                break;
            case "mqtt":
                thingUrl = `mqtt://${thing.host}:${thing.port}`;
                break;
            default:
                throw new Error(`Unsupported protocol: ${thing.protocol}`);
        }
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error("Request timed out")),
                config.heartbeatTimeout
            )
        );
        const tdPromise = this.WoT.requestThingDescription(thingUrl);
        const td = await Promise.race([tdPromise, timeoutPromise]);
        await this.WoT.consume(td);
    }

    printStatus() {
        console.log("\nCurrent Status Report:");
        console.log("=".repeat(60));

        let upCount = 0;
        let downCount = 0;

        this.thingStatuses.forEach((status, name) => {
            const statusIcon = status.isUp ? "✅" : "❌";
            const statusText = status.isUp ? "UP" : "DOWN";
            const errorText = status.lastError ? ` (${status.lastError})` : "";

            console.log(`${statusIcon} ${name}: ${statusText}${errorText}`);

            if (status.isUp) upCount++;
            else downCount++;
        });

        console.log("\nSummary:");
        console.log(`UP: ${upCount} services`);
        console.log(`DOWN: ${downCount} services`);
    }

    getThingStatuses() {
        return Array.from(this.thingStatuses.values());
    }
}

// Main execution
async function main() {
    console.log("Starting Thing Monitor Test");
    console.log("Monitoring the following services:");
    thingsToMonitor.forEach((thing) => {
        console.log(
            `  - ${thing.name} (${thing.protocol}) at ${thing.host}:${
                thing.port
            }${thing.path || ""}`
        );
    });
    const monitor = new SimpleThingMonitor();
    await monitor.start();
    process.on("SIGINT", () => {
        console.log("\nStopping monitor...");
        process.exit(0);
    });
}

main().catch((error) => {
    console.error("❌ Monitor failed:", error);
    process.exit(1);
});
