import nodemailer from 'nodemailer';
import { NotificationConfig, ThingStatus } from './types';
import { createLogger, format, transports } from 'winston';
import LokiTransport from 'winston-loki';

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
        labels: { service: 'thing-monitor-notifications' },
        json: true,
        format: format.json(),
        replaceTimestamp: true,
        onConnectionError: (err) => console.error(err),
    }));
}

export class NotificationService {
    private emailTransporter: nodemailer.Transporter;

    constructor(private config: NotificationConfig) {
        this.emailTransporter = nodemailer.createTransport({
            host: config.email.smtpHost,
            port: config.email.smtpPort,
            secure: config.email.smtpPort === 465, // True for 465, false for other ports
            auth: {
                user: config.email.smtpUser,
                pass: config.email.smtpPass,
            },
        });
    }

    async sendThingDownNotification(thing: ThingStatus): Promise<void> {
        const message = this.formatThingDownMessage(thing);
        // A pre-built link to Grafana, shows then user clicks on the email link 
        const grafanaUrl = `http://${process.env.GRAFANA_HOSTNAME}/explore?orgId=1&left=%7B"datasource":"Loki","queries":%5B%7B"refId":"A","expr":"{service%3D%5C"thing-monitor%5C",thing%3D%5C"${thing.name}%5C"}"%7D%5D,"range":%7B"from":"now-1h","to":"now"%7D%7D`;

        try {
            await this.emailTransporter.sendMail({
                from: `"Thing Monitor" <${this.config.email.smtpUser}>`,
                to: this.config.email.recipientEmail,
                subject: `[ALERT] Thing '${thing.name}' is DOWN`,
                html: `${message}<br><br>View logs in Grafana: <a href="${grafanaUrl}">Click Here</a>`,
            });
            logger.info(`Sent email notification for ${thing.name} being down.`);
        } catch (error) {
            logger.error(`Failed to send email notification for ${thing.name}. Error: ${error}`);
        }
    }

    async sendThingUpNotification(thing: ThingStatus): Promise<void> {
        const message = this.formatThingUpMessage(thing);

        try {
            await this.emailTransporter.sendMail({
                from: `"Thing Monitor" <${this.config.email.smtpUser}>`,
                to: this.config.email.recipientEmail,
                subject: `[RECOVERY] Thing '${thing.name}' is back UP`,
                html: message,
            });
            logger.info(`Sent email recovery notification for ${thing.name}.`);
        } catch (error) {
            logger.error(`Failed to send recovery notification for ${thing.name}: ${error}`);
        }
    }

    private formatThingDownMessage(thing: ThingStatus): string {
        return `
            <b>Thing Status Alert</b>
            <br><br>
            <b>Thing:</b> ${thing.name}
            <br>
            <b>Protocol:</b> ${thing.protocol}
            <br>
            <b>Status:</b> DOWN
            <br>
            <b>Last Check:</b> ${thing.lastCheck.toISOString()}
            <br>
            <b>Error:</b> ${thing.lastError || 'Unknown error'}
            <br>
            <b>Retry Count:</b> ${thing.retryCount}
        `;
    }

    private formatThingUpMessage(thing: ThingStatus): string {
        return `
            <b>Thing Status Recovery</b>
            <br><br>
            <b>Thing:</b> ${thing.name}
            <br>
            <b>Protocol:</b> ${thing.protocol}
            <br>
            <b>Status:</b> UP
            <br>
            <b>Last Check:</b> ${thing.lastCheck.toISOString()}
        `;
    }
}