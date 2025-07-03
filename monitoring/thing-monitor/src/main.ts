import dotenv from "dotenv";
import { ThingMonitor } from "./monitor";
import { MonitorApi } from "./api";
import { MonitorConfig, ThingConfig, NotificationConfig } from "./types";

dotenv.config();

function parseThingsConfig(): ThingConfig[] {
    const thingsStr = process.env.THINGS_TO_MONITOR;
    if (!thingsStr) {
        throw new Error("THINGS_TO_MONITOR environment variable is required");
    }

    return thingsStr.split(";").map((thingStr) => {
        const [name, protocol, host, port, path] = thingStr.split(",");
        if (!name || !protocol || !host || !port) {
            throw new Error(`Invalid thing configuration: ${thingStr}`);
        }

        return {
            name,
            protocol: protocol as "http" | "mqtt" | "coap" | "modbus",
            host,
            port: parseInt(port),
            path: path || undefined,
        };
    });
}

function parseNotificationConfig(): NotificationConfig {
    if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS ||
        !process.env.NOTIFICATION_EMAIL
    ) {
        throw new Error(
            "Email notification configuration is required (SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFICATION_EMAIL)"
        );
    }

    return {
        email: {
            smtpHost: process.env.SMTP_HOST,
            smtpPort: parseInt(process.env.SMTP_PORT || "587"),
            smtpUser: process.env.SMTP_USER,
            smtpPass: process.env.SMTP_PASS,
            recipientEmail: process.env.NOTIFICATION_EMAIL,
        },
    };
}

async function main() {
    try {
        // Parse configuration
        const things = parseThingsConfig();
        const notifications = parseNotificationConfig();

        const config: MonitorConfig = {
            heartbeatInterval: parseInt(
                process.env.HEARTBEAT_INTERVAL || "30000"
            ),
            heartbeatTimeout: parseInt(process.env.HEARTBEAT_TIMEOUT || "5000"),
            retryCount: parseInt(process.env.RETRY_COUNT || "3"),
            things,
            notifications,
        };

        // Initialize and start the monitor
        const monitor = new ThingMonitor(config);
        await monitor.start();

        // Initialize and start the API
        const api = new MonitorApi(monitor);
        const port = parseInt(process.env.PORT || "3000");
        api.start(port);

        console.log("Thing Monitor service started successfully");
    } catch (error) {
        console.error("Failed to start Thing Monitor service:", error);
        process.exit(1);
    }
}

main();
