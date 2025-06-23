import { ThingMonitor } from './monitor';
import { MonitorConfig } from './types';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration
// All this is testing is whether the email configuration works. 
// For full testing, run the test-monitor.ts file in the project root.
const testConfig: MonitorConfig = {
    heartbeatInterval: parseInt(process.env.TEST_HEARTBEAT_INTERVAL || '5000'), // 5 seconds for testing
    heartbeatTimeout: parseInt(process.env.TEST_HEARTBEAT_TIMEOUT || '2000'),
    retryCount: parseInt(process.env.TEST_RETRY_COUNT || '2'),
    things: [
        {
            name: 'http-test-thing',
            protocol: 'http',
            host: 'plugfest.thingweb.io',
            port: 8080,
            path: '/things/counter'
        },
        {
            name: 'non-existent-thing',
            protocol: 'http',
            host: 'localhost',
            port: 9999,
            path: '/td'
        }
    ],
    notifications: {
        email: {
            smtpHost: process.env.SMTP_HOST || '',
            smtpPort: parseInt(process.env.SMTP_PORT || '587'),
            smtpUser: process.env.SMTP_USER || '',
            smtpPass: process.env.SMTP_PASS || '',
            recipientEmail: process.env.NOTIFICATION_EMAIL || ''
        }
    }
};

async function runTests() {
    console.log('Starting monitoring tests...');
    
    // Check if notification config is set, otherwise skip notification part of test
    const canTestNotifications = testConfig.notifications.email.smtpHost && testConfig.notifications.email.recipientEmail;
    if (!canTestNotifications) {
        console.warn('SMTP environment variables not set. Email notification tests will be skipped.');
    }
    
    try {
        // Initialize monitor
        const monitor = new ThingMonitor(testConfig);
        
        // Start monitoring
        await monitor.start();
        console.log('Monitor started successfully');

        // Let it run for a while to test notifications
        const monitoringDuration = parseInt(process.env.TEST_MONITORING_DURATION || '20000');
        console.log(`\nMonitoring for ${monitoringDuration / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, monitoringDuration));

        // Get final statuses
        console.log('\nFinal statuses after 20 seconds:');
        const finalStatuses = monitor.getThingStatuses();
        console.log(JSON.stringify(finalStatuses, null, 2));

        console.log('\nTest finished. The service will continue running. Press Ctrl+C to exit.');

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests().catch(console.error);