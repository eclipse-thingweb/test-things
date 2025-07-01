export type ThingProtocol = "http" | "mqtt" | "coap" | "modbus";

export interface ThingConfig {
    name: string;
    protocol: ThingProtocol;
    host: string;
    port: number;
    path?: string;
}

export interface ThingStatus {
    name: string;
    protocol: ThingProtocol;
    isUp: boolean;
    lastCheck: Date;
    lastError?: string;
    retryCount: number;
}

export interface NotificationConfig {
    email: {
        smtpHost: string;
        smtpPort: number;
        smtpUser: string;
        smtpPass: string;
        recipientEmail: string;
    };
}

export interface MonitorConfig {
    heartbeatInterval: number;
    heartbeatTimeout: number;
    retryCount: number;
    things: ThingConfig[];
    notifications: NotificationConfig;
}
