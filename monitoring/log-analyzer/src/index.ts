import { Servient } from "@node-wot/core";
import { HttpClientFactory } from "@node-wot/binding-http";
import axios from "axios";

// --- Config ---
const LOKI_URL = process.env.LOKI_URL || "http://localhost:3100";
const LOG_TIME_RANGE = process.env.LOG_TIME_RANGE || "1h"; // e.g. '1h', '6h', '24h'

// --- WoT Discovery (HTTP only, but extensible) ---
async function discoverThings(tdUrls: string[]) {
  const servient = new Servient();
  servient.addClientFactory(new HttpClientFactory());
  const WoT = await servient.start();
  const things = [];
  for (const url of tdUrls) {
    try {
      const td = await (await fetch(url)).json();
      const thing = await WoT.consume(td as any);
      things.push({ td, thing });
    } catch (err) {
      console.error(`Failed to consume TD at ${url}:`, err);
    }
  }
  return things;
}

// --- Loki Log Fetching ---
interface LokiLogOptions {
  start?: string;
  end?: string;
  limit?: number;
}
async function fetchLokiLogs({ start = LOG_TIME_RANGE, end = "now", limit = 10000 }: LokiLogOptions = {}) {
  // Loki API: /loki/api/v1/query_range?query={...}&start=...&end=...
  // We'll fetch all logs for all things
  const query = `{thing!=""}`;
  const params = new URLSearchParams({
    query,
    limit: limit.toString(),
    direction: "BACKWARD",
    start: start === "now" ? Date.now().toString() : (Date.now() - parseDuration(start ?? "")).toString(),
    end: end === "now" ? Date.now().toString() : (Date.now() - parseDuration(end ?? "")).toString(),
  });
  const url = `${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`;
  const res = await axios.get(url);
  // Loki returns streams; flatten to log entries
  const streams = res.data.data.result || [];
  const logs = [];
  for (const stream of streams) {
    const values = Array.isArray(stream.values) ? stream.values : [];
    for (const [ts, line] of values) {
      logs.push({
        timestamp: new Date(Number(ts.slice(0, 13))).toISOString(),
        thing: stream.stream.thing || "unknown",
        line,
      });
    }
  }
  return logs;
}

function parseDuration(str: string): number {
  // e.g. '1h' => ms
  if (!str) return 0;
  const match = str.match(/(\d+)([smhd])/);
  if (!match) return 0;
  const n = parseInt(match[1] || '0', 10);
  switch (match[2]) {
    case "s": return n * 1000;
    case "m": return n * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    case "d": return n * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// --- Log Analysis ---
function analyzeLogs(logs: any[]) {
  const byThing: Record<string, any[]> = {};
  for (const log of logs) {
    byThing[log.thing] = byThing[log.thing] || [];
    (byThing[log.thing] as any[]).push(log);
  }
  const metrics = Object.entries(byThing).map(([thing, logs]) => {
    const safeLogs = Array.isArray(logs) ? logs : ((logs ?? []) as any[]);
    const errorLogs = safeLogs.filter((l: any) => l.line && l.line.toLowerCase().includes("error"));
    return {
      thing,
      total: safeLogs.length,
      errors: errorLogs.length,
      errorRate: safeLogs.length ? (errorLogs.length / safeLogs.length) * 100 : 0,
    };
  });
  return metrics;
}

// --- Reporting ---
function printReport(metrics: any[]) {
  console.log("\n=== SYSTEM LOG REPORT ===");
  for (const m of metrics) {
    console.log(`Thing: ${m.thing}\n  Total logs: ${m.total}\n  Errors: ${m.errors}\n  Error rate: ${m.errorRate.toFixed(2)}%\n`);
  }
}

// --- Main ---
(async () => {
  const tdUrls = process.argv.slice(2);
  const things = await discoverThings(tdUrls);
  const logs = await fetchLokiLogs();
  const metrics = analyzeLogs(logs);
  printReport(metrics);
})(); 