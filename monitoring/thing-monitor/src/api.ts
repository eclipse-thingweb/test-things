import express from 'express';
import cors from 'cors';
import { ThingMonitor } from './monitor';
import { createLogger, format, transports } from 'winston';
import LokiTransport from 'winston-loki';
import fetch from 'node-fetch';

const logger = createLogger({
    transports: [
        new LokiTransport({
            host: `http://${process.env.LOKI_HOSTNAME}:${process.env.LOKI_PORT}`,
            labels: { service: 'thing-monitor-api' },
            json: true,
            format: format.json(),
            replaceTimestamp: true,
            onConnectionError: (err) => console.error(err),
        }),
        new transports.Console({
            format: format.combine(format.simple(), format.colorize()),
        }),
    ],
});

export class MonitorApi {
    private app: express.Application;

    constructor(private monitor: ThingMonitor) {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(cors());
        this.app.use(express.json());
    }

    private setupRoutes(): void {
        // Get all thing statuses
        this.app.get('/api/things', (req, res) => {
            try {
                const statuses = this.monitor.getThingStatuses();
                res.json(statuses);
            } catch (error) {
                logger.error('Failed to get thing statuses:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get status for a specific thing
        this.app.get('/api/things/:name', (req, res) => {
            try {
                const status = this.monitor.getThingStatus(req.params.name);
                if (!status) {
                    res.status(404).json({ error: 'Thing not found' });
                    return;
                }
                res.json(status);
            } catch (error) {
                logger.error(`Failed to get status for ${req.params.name}:`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get Loki logs for a specific thing
        this.app.get('/api/things/:name/logs', async (req, res) => {
            try {
                const { name } = req.params;
                const { start, end, limit = '100' } = req.query;
                
                const query = `{service="thing-monitor",thing="${name}"}`;
                
                const lokiUrl = new URL(`http://${process.env.LOKI_HOSTNAME}:${process.env.LOKI_PORT}/loki/api/v1/query_range`);
                lokiUrl.searchParams.append('query', query);
                
                if (start) {
                    lokiUrl.searchParams.append('start', new Date(start as string).toISOString());
                } else {
                    lokiUrl.searchParams.append('start', new Date(Date.now() - 3600 * 1000).toISOString());
                }

                if (end) {
                     lokiUrl.searchParams.append('end', new Date(end as string).toISOString());
                }

                lokiUrl.searchParams.append('limit', limit as string);
                lokiUrl.searchParams.append('direction', 'backward');

                const response = await fetch(lokiUrl.toString());
                if (!response.ok) {
                    throw new Error(`Loki API returned an error: ${response.statusText} - ${await response.text()}`);
                }
                const logs = await response.json();
                res.json(logs);
            } catch (error) {
                logger.error(`Failed to get logs for ${req.params.name}:`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }

    start(port: number): void {
        this.app.listen(port, () => {
            logger.info(`Monitor API listening on port ${port}`);
        });
    }
}