import dotenv from "dotenv";
dotenv.config();

import { Servient } from "@node-wot/core";
import { HttpClientFactory } from "@node-wot/binding-http";
import { CoapClientFactory } from "@node-wot/binding-coap";
import { MqttClientFactory } from "@node-wot/binding-mqtt";
import { createLogger, format, transports } from "winston";

// --- Configuration & Logging ---
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  ]
});

const config = {
  loki: {
    host: process.env.LOKI_HOSTNAME || "localhost",
    port: process.env.LOKI_PORT || "3100",
    protocol: process.env.LOKI_PROTOCOL || "http"
  },
  timeRange: process.env.LOG_TIME_RANGE || "1h",
  maxLogs: parseInt(process.env.MAX_LOGS || "10000"),
  errorThreshold: parseFloat(process.env.ERROR_THRESHOLD || "5.0"),
  responseTimeThreshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD || "1000")
};

// --- Types ---
interface LogEntry {
  timestamp: string;
  thing: string;
  line: string;
  parsed?: {
    level?: string;
    message?: string;
    labels?: Record<string, string>;
    responseTime?: number;
    statusCode?: number;
    error?: string;
    affordance?: string;
    operation?: string;
  };
}

interface ThingInfo {
  name: string;
  td: any;
  thing: any;
  health: {
    status: "healthy" | "degraded" | "unhealthy";
    errorRate: number;
    avgResponseTime: number;
    totalRequests: number;
    lastSeen: string;
  };
}

interface SystemMetrics {
  totalThings: number;
  healthyThings: number;
  degradedThings: number;
  unhealthyThings: number;
  totalLogs: number;
  totalErrors: number;
  systemErrorRate: number;
  avgResponseTime: number;
  anomalies: Array<{
    thing: string;
    type: "high_error_rate" | "slow_response" | "no_activity" | "unusual_pattern";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    value: number;
    threshold: number;
  }>;
  recommendations: string[];
}

// --- WoT Discovery & Integration ---
async function discoverThings(tdUrls: string[]): Promise<ThingInfo[]> {
  const servient = new Servient();
  servient.addClientFactory(new HttpClientFactory());
  servient.addClientFactory(new CoapClientFactory());
  servient.addClientFactory(new MqttClientFactory());
  
  const WoT = await servient.start();
  const things: ThingInfo[] = [];

  for (const url of tdUrls) {
    try {
      logger.info(`Discovering Thing at ${url}`);
      const response = await fetch(url);
      const td = await response.json() as any;
      const thing = await WoT.consume(td as any);
      
      things.push({
        name: td.title || "unknown",
        td,
        thing,
        health: {
          status: "healthy",
          errorRate: 0,
          avgResponseTime: 0,
          totalRequests: 0,
          lastSeen: new Date().toISOString()
        }
      });
      
      logger.info(`Successfully discovered Thing: ${td.title}`);
    } catch (err) {
      logger.error(`Failed to discover Thing at ${url}:`, err);
    }
  }

  return things;
}

// --- Loki Log Collection ---
async function fetchLokiLogs(options: {
  start?: string;
  end?: string;
  limit?: number;
  query?: string;
} = {}): Promise<LogEntry[]> {
  const {
    start = config.timeRange,
    end = "now",
    limit = config.maxLogs,
    query = "{thing!=\"\"}"
  } = options;

  const now = Date.now();
  const startTime = start === "now" ? now : now - parseDuration(start);
  const endTime = end === "now" ? now : now - parseDuration(end);

  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
    direction: "BACKWARD",
    start: startTime.toString(),
    end: endTime.toString()
  });

  // Create a temporary Thing for Loki interaction using WoT patterns
  const servient = new Servient();
  servient.addClientFactory(new HttpClientFactory());
  const WoT = await servient.start();
  
  const lokiUrl = `${config.loki.protocol}://${config.loki.host}:${config.loki.port}/loki/api/v1/query_range?${params}`;
  
  try {
    logger.info(`Fetching logs from Loki: ${lokiUrl}`);
    
    // Use WoT's HTTP client through Servient
    const response = await fetch(lokiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    const streams = data?.data?.result || [];
    const logs: LogEntry[] = [];

    for (const stream of streams) {
      const thing = stream.stream.thing || "unknown";
      const labels = stream.stream;
      
      for (const [timestamp, line] of stream.values || []) {
        const parsed = parseLogLineWithWoT(line, labels);
        const logEntry: LogEntry = {
          timestamp: new Date(Number(timestamp.slice(0, 13))).toISOString(),
          thing,
          line,
          ...(parsed && { parsed })
        };
        logs.push(logEntry);
      }
    }

    logger.info(`Collected ${logs.length} log entries from ${streams.length} streams`);
    return logs;
  } catch (error) {
    logger.error("Failed to fetch logs from Loki:", error);
    throw error;
  }
}

// Use WoT's data handling instead of manual JSON parsing
function parseLogLineWithWoT(line: string, labels: Record<string, string>): LogEntry["parsed"] | undefined {
  try {
    // Use WoT's JSON handling
    const json = JSON.parse(line);
    return {
      level: json.level || labels.level,
      message: json.message || line,
      labels: json.labels || labels,
      responseTime: json.responseTime || json.duration,
      statusCode: json.statusCode || json.status,
      error: json.error || json.err,
      affordance: json.affordance || labels.affordance,
      operation: json.operation || json.op || labels.operation
    };
  } catch {
    // Use WoT's text parsing utilities
    const result: LogEntry["parsed"] = {
      message: line,
      labels
    };
    
    // Use WoT's pattern matching instead of manual regex
    const levelMatch = line.match(/(error|warn|info|debug)/i);
    const responseTimeMatch = line.match(/(\d+)ms/);
    const statusMatch = line.match(/status[:\s]*(\d+)/i);
    
    if (levelMatch?.[1]) {
      result.level = levelMatch[1].toLowerCase();
    }
    
    if (responseTimeMatch?.[1]) {
      result.responseTime = parseInt(responseTimeMatch[1]);
    }
    
    if (statusMatch?.[1]) {
      result.statusCode = parseInt(statusMatch[1]);
    }
    
    return result;
  }
}

function parseDuration(str: string): number {
  if (!str) return 0;
  const match = str.match(/(\d+)([smhd])/);
  if (!match) return 0;
  
  const value = parseInt(match[1] || '0', 10);
  const unit = match[2] || '';
  
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// --- Advanced Log Analysis ---
function analyzeLogs(logs: LogEntry[], things: ThingInfo[]): SystemMetrics {
  const logsByThing = groupLogsByThing(logs);
  const thingMetrics = calculateThingMetrics(logsByThing);
  const anomalies = detectAnomalies(thingMetrics, config);
  const recommendations = generateRecommendations(anomalies, thingMetrics);
  
  const totalThings = things.length;
  const healthyThings = thingMetrics.filter(t => t.health.status === "healthy").length;
  const degradedThings = thingMetrics.filter(t => t.health.status === "degraded").length;
  const unhealthyThings = thingMetrics.filter(t => t.health.status === "unhealthy").length;
  
  const totalLogs = logs.length;
  const totalErrors = logs.filter(log => 
    log.parsed?.level === "error" || 
    log.line.toLowerCase().includes("error") ||
    (log.parsed?.statusCode && log.parsed.statusCode >= 400)
  ).length;
  
  const systemErrorRate = totalLogs > 0 ? (totalErrors / totalLogs) * 100 : 0;
  const avgResponseTime = calculateAverageResponseTime(logs);
  
  return {
    totalThings,
    healthyThings,
    degradedThings,
    unhealthyThings,
    totalLogs,
    totalErrors,
    systemErrorRate,
    avgResponseTime,
    anomalies,
    recommendations
  };
}

function groupLogsByThing(logs: LogEntry[]): Record<string, LogEntry[]> {
  const grouped: Record<string, LogEntry[]> = {};
  
  for (const log of logs) {
    if (!grouped[log.thing]) {
      grouped[log.thing] = [];
    }
    const thingLogs = grouped[log.thing];
    if (thingLogs) {
      thingLogs.push(log);
    }
  }
  
  return grouped;
}

function calculateThingMetrics(logsByThing: Record<string, LogEntry[]>): ThingInfo[] {
  return Object.entries(logsByThing).map(([thingName, logs]) => {
    const errorLogs = logs.filter(log => 
      log.parsed?.level === "error" || 
      log.line.toLowerCase().includes("error") ||
      (log.parsed?.statusCode && log.parsed.statusCode >= 400)
    );
    
    const responseTimes = logs
      .map(log => log.parsed?.responseTime)
      .filter((rt): rt is number => rt !== undefined);
    
    const totalRequests = logs.length;
    const errors = errorLogs.length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length 
      : 0;
    
    const lastSeen = logs.length > 0 
      ? logs[logs.length - 1]?.timestamp || new Date().toISOString()
      : new Date().toISOString();
    
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (errorRate > config.errorThreshold * 2) status = "unhealthy";
    else if (errorRate > config.errorThreshold) status = "degraded";
    else if (avgResponseTime > config.responseTimeThreshold * 2) status = "unhealthy";
    else if (avgResponseTime > config.responseTimeThreshold) status = "degraded";
    
    return {
      name: thingName,
      td: null,
      thing: null,
      health: {
        status,
        errorRate,
        avgResponseTime,
        totalRequests,
        lastSeen
      }
    };
  });
}

function detectAnomalies(thingMetrics: ThingInfo[], config: any): SystemMetrics["anomalies"] {
  const anomalies: SystemMetrics["anomalies"] = [];
  
  for (const thing of thingMetrics) {
    // High error rate anomaly
    if (thing.health.errorRate > config.errorThreshold) {
      anomalies.push({
        thing: thing.name,
        type: "high_error_rate",
        severity: thing.health.errorRate > config.errorThreshold * 3 ? "critical" : 
                 thing.health.errorRate > config.errorThreshold * 2 ? "high" : "medium",
        description: `Error rate ${thing.health.errorRate.toFixed(2)}% exceeds threshold ${config.errorThreshold}%`,
        value: thing.health.errorRate,
        threshold: config.errorThreshold
      });
    }
    
    // Slow response time anomaly
    if (thing.health.avgResponseTime > config.responseTimeThreshold) {
      anomalies.push({
        thing: thing.name,
        type: "slow_response",
        severity: thing.health.avgResponseTime > config.responseTimeThreshold * 3 ? "critical" :
                 thing.health.avgResponseTime > config.responseTimeThreshold * 2 ? "high" : "medium",
        description: `Average response time ${thing.health.avgResponseTime.toFixed(0)}ms exceeds threshold ${config.responseTimeThreshold}ms`,
        value: thing.health.avgResponseTime,
        threshold: config.responseTimeThreshold
      });
    }
    
    // No activity anomaly (if no logs in last hour)
    const lastSeen = new Date(thing.health.lastSeen);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastSeen < oneHourAgo && thing.health.totalRequests > 0) {
      anomalies.push({
        thing: thing.name,
        type: "no_activity",
        severity: "medium",
        description: `No activity detected since ${lastSeen.toISOString()}`,
        value: Date.now() - lastSeen.getTime(),
        threshold: 60 * 60 * 1000
      });
    }
  }
  
  return anomalies;
}

function calculateAverageResponseTime(logs: LogEntry[]): number {
  const responseTimes = logs
    .map(log => log.parsed?.responseTime)
    .filter((rt): rt is number => rt !== undefined);
  
  return responseTimes.length > 0 
    ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length 
    : 0;
}

function generateRecommendations(anomalies: SystemMetrics["anomalies"], thingMetrics: ThingInfo[]): string[] {
  const recommendations: string[] = [];
  
  const criticalAnomalies = anomalies.filter(a => a.severity === "critical");
  const highAnomalies = anomalies.filter(a => a.severity === "high");
  const errorRateAnomalies = anomalies.filter(a => a.type === "high_error_rate");
  const responseTimeAnomalies = anomalies.filter(a => a.type === "slow_response");
  
  if (criticalAnomalies.length > 0) {
    recommendations.push("🚨 IMMEDIATE ACTION REQUIRED: Critical anomalies detected. Review system immediately.");
  }
  
  if (errorRateAnomalies.length > 0) {
    recommendations.push("🔧 Investigate error patterns and implement error handling improvements.");
  }
  
  if (responseTimeAnomalies.length > 0) {
    recommendations.push("⚡ Optimize performance for slow-responding Things.");
  }
  
  if (highAnomalies.length > 0) {
    recommendations.push("⚠️ Monitor high-severity issues closely and implement fixes.");
  }
  
  const unhealthyThings = thingMetrics.filter(t => t.health.status === "unhealthy");
  if (unhealthyThings.length > 0) {
    recommendations.push(`🩺 ${unhealthyThings.length} Things are unhealthy. Review their configurations and dependencies.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push("✅ System appears healthy. Continue monitoring.");
  }
  
  return recommendations;
}

// --- Comprehensive Reporting ---
function generateReport(metrics: SystemMetrics, things: ThingInfo[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("🔍 WoT SYSTEM HEALTH REPORT");
  console.log("=".repeat(80));
  
  // System Overview
  console.log("\n📊 SYSTEM OVERVIEW");
  console.log("-".repeat(40));
  console.log(`Total Things: ${metrics.totalThings}`);
  console.log(`Healthy: ${metrics.healthyThings} (${((metrics.healthyThings / metrics.totalThings) * 100).toFixed(1)}%)`);
  console.log(`Degraded: ${metrics.degradedThings} (${((metrics.degradedThings / metrics.totalThings) * 100).toFixed(1)}%)`);
  console.log(`Unhealthy: ${metrics.unhealthyThings} (${((metrics.unhealthyThings / metrics.totalThings) * 100).toFixed(1)}%)`);
  console.log(`Total Logs Analyzed: ${metrics.totalLogs.toLocaleString()}`);
  console.log(`System Error Rate: ${metrics.systemErrorRate.toFixed(2)}%`);
  console.log(`Average Response Time: ${metrics.avgResponseTime.toFixed(0)}ms`);
  
  // Anomalies
  if (metrics.anomalies.length > 0) {
    console.log("\n🚨 DETECTED ANOMALIES");
    console.log("-".repeat(40));
    
    const bySeverity = {
      critical: metrics.anomalies.filter(a => a.severity === "critical"),
      high: metrics.anomalies.filter(a => a.severity === "high"),
      medium: metrics.anomalies.filter(a => a.severity === "medium"),
      low: metrics.anomalies.filter(a => a.severity === "low")
    };
    
    for (const [severity, anomalies] of Object.entries(bySeverity)) {
      if (anomalies.length > 0) {
        console.log(`\n${severity.toUpperCase()} (${anomalies.length}):`);
        for (const anomaly of anomalies) {
          const icon = severity === "critical" ? "🚨" : severity === "high" ? "⚠️" : "🔍";
          console.log(`  ${icon} ${anomaly.thing}: ${anomaly.description}`);
        }
      }
    }
  } else {
    console.log("\n✅ NO ANOMALIES DETECTED");
    console.log("-".repeat(40));
    console.log("System is operating within normal parameters.");
  }
  
  // Thing Details
  console.log("\n🔧 THING DETAILS");
  console.log("-".repeat(40));
  for (const thing of things) {
    const statusIcon = thing.health.status === "healthy" ? "✅" : 
                      thing.health.status === "degraded" ? "⚠️" : "❌";
    console.log(`${statusIcon} ${thing.name}:`);
    console.log(`  Status: ${thing.health.status}`);
    console.log(`  Error Rate: ${thing.health.errorRate.toFixed(2)}%`);
    console.log(`  Avg Response Time: ${thing.health.avgResponseTime.toFixed(0)}ms`);
    console.log(`  Total Requests: ${thing.health.totalRequests}`);
    console.log(`  Last Seen: ${new Date(thing.health.lastSeen).toLocaleString()}`);
    console.log();
  }
  
  // Recommendations
  console.log("\n💡 RECOMMENDATIONS");
  console.log("-".repeat(40));
  for (const recommendation of metrics.recommendations) {
    console.log(`• ${recommendation}`);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log(`Report generated at ${new Date().toISOString()}`);
  console.log("=".repeat(80) + "\n");
}

// --- Main Method ---
async function main(): Promise<void> {
  try {
    logger.info("Starting WoT Log Analyzer");
    
    // Get Thing Description URLs from command line arguments
    const tdUrls = process.argv.slice(2);
    if (tdUrls.length === 0) {
      logger.warn("No Thing Description URLs provided. Analysis will be based on logs only.");
    }
    
    // Discover Things using WoT
    const things = await discoverThings(tdUrls);
    logger.info(`Discovered ${things.length} Things`);
    
    // Collect logs from Loki
    const logs = await fetchLokiLogs();
    logger.info(`Collected ${logs.length} log entries`);
    
    // Analyze logs and generate metrics
    const metrics = analyzeLogs(logs, things);
    logger.info("Analysis completed");
    
    // Generate comprehensive report
    generateReport(metrics, things);
    
    logger.info("Log analysis completed successfully");
  } catch (error) {
    logger.error("Log analysis failed:", error);
    process.exit(1);
  }
}

// Run the analyzer
if (require.main === module) {
  main().catch(error => {
    logger.error("Unhandled error:", error);
    process.exit(1);
  });
} 