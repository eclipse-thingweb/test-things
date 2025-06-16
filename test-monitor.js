const fetch = require('node-fetch');
const mqtt = require('mqtt');

// Configuration for testing
const config = {
    heartbeatTimeout: 5000,
    retryCount: 3
};

// Define the things to monitor based on your running services and correct configuration
const thingsToMonitor = [
    {
        name: 'http-express-calculator-simple',
        protocol: 'http',
        host: 'localhost',
        port: 80,
        path: '/http-express-calculator-simple'
    },
    {
        name: 'http-express-calculator-content-negotiation',
        protocol: 'http',
        host: 'localhost',
        port: 80,
        path: '/http-express-calculator-content-negotiation'
    },
    {
        name: 'http-flask-calculator',
        protocol: 'http',
        host: 'localhost',
        port: 80,
        path: '/http-flask-calculator'
    },
    {
        name: 'http-advanced-coffee-machine',
        protocol: 'http',
        host: 'localhost',
        port: 80,
        path: '/http-advanced-coffee-machine'
    },
    {
        name: 'http-data-schema-thing',
        protocol: 'http',
        host: 'localhost',
        port: 80,
        path: '/http-data-schema-thing'
    },
    {
        name: 'mqtt-calculator',
        protocol: 'mqtt',
        host: 'localhost',
        port: 1883
    },
    {
        name: 'mqtt-broker',
        protocol: 'mqtt',
        host: 'localhost',
        port: 1883
    }
];

class SimpleThingMonitor {
    constructor() {
        this.thingStatuses = new Map();
        
        // Initialize status for all things
        thingsToMonitor.forEach(thing => {
            this.thingStatuses.set(thing.name, {
                name: thing.name,
                protocol: thing.protocol,
                isUp: false,
                lastCheck: new Date(),
                retryCount: 0,
                lastError: undefined
            });
        });
    }

    async checkAllThings() {
        console.log('\n🔍 Starting monitoring check...');
        console.log('='.repeat(60));
        
        const checkPromises = thingsToMonitor.map(thing => this.checkThing(thing));
        await Promise.all(checkPromises);
        
        this.printStatus();
    }

    async checkThing(thing) {
        const currentStatus = this.thingStatuses.get(thing.name);
        const wasUp = currentStatus.isUp;

        try {
            switch (thing.protocol) {
                case 'http':
                    await this.checkHttpThing(thing, currentStatus);
                    break;
                case 'mqtt':
                    await this.checkMqttThing(thing, currentStatus);
                    break;
                default:
                    throw new Error(`Unsupported protocol: ${thing.protocol}`);
            }

            // Thing is UP
            if (!wasUp) {
                console.log(`✅ ${thing.name} is back up!`);
            }
            currentStatus.isUp = true;
            currentStatus.lastCheck = new Date();
            currentStatus.lastError = undefined;
            currentStatus.retryCount = 0;

        } catch (error) {
            // Thing is DOWN
            const errorMessage = error.message;
            
            if (wasUp || currentStatus.lastError !== errorMessage) {
                console.log(`❌ ${thing.name} has failed: ${errorMessage}`);
            }

            currentStatus.isUp = false;
            currentStatus.lastCheck = new Date();
            currentStatus.lastError = errorMessage;
            currentStatus.retryCount++;
        }
    }

    async checkHttpThing(thing, currentStatus) {
        // For HTTP things, we need to test if the service is responding
        // Since they're behind Traefik, we'll test if we get any response (even 404)
        // which indicates the service is running
        try {
            const thingUrl = `http://${thing.host}:${thing.port}${thing.path}`;
            console.log(`  Testing: ${thingUrl}`);
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timed out')), config.heartbeatTimeout)
            );

            const fetchPromise = fetch(thingUrl);
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            // If we get any response (even 404), the service is running
            if (response.status === 404) {
                console.log(`  ✅ Service responding (404 expected for root path)`);
                return;
            } else if (response.ok) {
                console.log(`  ✅ Service responding (${response.status})`);
                return;
            } else {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            throw new Error(`${error.message}`);
        }
    }

    async checkMqttThing(thing, currentStatus) {
        return new Promise((resolve, reject) => {
            const client = mqtt.connect(`mqtt://${thing.host}:${thing.port}`, {
                clientId: `monitor-test-${Date.now()}`,
                clean: true,
                connectTimeout: config.heartbeatTimeout,
                rejectUnauthorized: false
            });

            const timeout = setTimeout(() => {
                client.end();
                reject(new Error('MQTT connection timed out'));
            }, config.heartbeatTimeout);

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

    printStatus() {
        console.log('\n📊 Current Status Report:');
        console.log('='.repeat(60));
        
        let upCount = 0;
        let downCount = 0;
        
        this.thingStatuses.forEach((status, name) => {
            const statusIcon = status.isUp ? '✅' : '❌';
            const statusText = status.isUp ? 'UP' : 'DOWN';
            const errorText = status.lastError ? ` (${status.lastError})` : '';
            
            console.log(`${statusIcon} ${name}: ${statusText}${errorText}`);
            
            if (status.isUp) upCount++;
            else downCount++;
        });
        
        console.log('\n📈 Summary:');
        console.log(`✅ UP: ${upCount} services`);
        console.log(`❌ DOWN: ${downCount} services`);
        console.log(`📊 Total: ${upCount + downCount} services`);
    }

    getThingStatuses() {
        return Array.from(this.thingStatuses.values());
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting Thing Monitor Test');
    console.log('Monitoring the following services:');
    thingsToMonitor.forEach(thing => {
        console.log(`  - ${thing.name} (${thing.protocol}) at ${thing.host}:${thing.port}${thing.path || ''}`);
    });
    
    const monitor = new SimpleThingMonitor();
    
    // Initial check
    await monitor.checkAllThings();
    
    // Set up periodic monitoring
    console.log('\n⏰ Setting up periodic monitoring (every 30 seconds)...');
    setInterval(async () => {
        await monitor.checkAllThings();
    }, 30000);
    
    // Keep the process running
    process.on('SIGINT', () => {
        console.log('\n👋 Stopping monitor...');
        process.exit(0);
    });
}

// Run the monitor
main().catch(error => {
    console.error('❌ Monitor failed:', error);
    process.exit(1);
}); 