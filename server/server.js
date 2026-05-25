#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import { SQSClient } from "@aws-sdk/client-sqs";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import {
  parseTime,
  buildClientConfig,
  queueNameFromAny,
  getLive,
  getMetric,
} from "./sqs.js";

const PORT = Number(process.env.PORT || 3000);
const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url)));

const clientPair = (args) => {
  const cfg = buildClientConfig(args);
  return {
    sqs: new SQSClient({ ...cfg, useQueueUrlAsEndpoint: false }),
    cw: new CloudWatchClient(cfg),
  };
};

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

async function handleLive(params) {
  const { sqs } = clientPair(params);
  const { url, attrs } = await getLive(sqs, params.queue);
  return {
    queue: queueNameFromAny(url),
    url,
    visible: Number(attrs.ApproximateNumberOfMessages),
    inFlight: Number(attrs.ApproximateNumberOfMessagesNotVisible),
    delayed: Number(attrs.ApproximateNumberOfMessagesDelayed),
  };
}

async function handleMetric(params) {
  const { cw } = clientPair(params);
  const metric = params.metric || "NumberOfMessagesReceived";
  const stat = params.stat || "Sum";
  const period = Number(params.period || 300);
  const end = parseTime(params.end, 0);
  const start = parseTime(params.start, -3600e3);
  const queueName = queueNameFromAny(params.queue);
  const points = await getMetric(cw, queueName, metric, start, end, period, stat);
  const series = points.map(p => ({ t: p.Timestamp.toISOString(), v: p[stat] }));
  const values = series.map(p => p.v);
  const summary = values.length ? {
    points: values.length,
    sum: values.reduce((a, b) => a + b, 0),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
  } : { points: 0 };
  return {
    queue: queueName, metric, stat, period,
    start: start.toISOString(), end: end.toISOString(),
    series, summary,
  };
}

async function handleCompare(params) {
  const queues = (params.queues || "").split(",").filter(Boolean);
  if (queues.length < 2) throw new Error("queues requires at least 2");

  const metric = params.metric || "NumberOfMessagesReceived";
  const stat = params.stat || "Sum";
  const period = Number(params.period || 300);
  const end = parseTime(params.end, 0);
  const start = parseTime(params.start, -3600e3);

  const { cw } = clientPair(params);

  const series = await Promise.all(queues.map(async (queue) => {
    const queueName = queueNameFromAny(queue);
    const points = await getMetric(cw, queueName, metric, start, end, period, stat);
    const pSeries = points.map(p => ({ t: p.Timestamp.toISOString(), v: p[stat] }));
    const values = pSeries.map(p => p.v);
    const summary = values.length ? {
      points: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      max: Math.max(...values),
      min: Math.min(...values),
    } : { points: 0 };
    return { queue: queueName, points: pSeries, summary };
  }));

  return {
    metric, stat, period,
    start: start.toISOString(), end: end.toISOString(),
    series,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type",
    });
    return res.end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/") {
      return send(res, 200, { name: "sqs-api-server", version: pkg.version });
    }
    if (req.method === "GET" && url.pathname === "/api/live") {
      const p = Object.fromEntries(url.searchParams);
      if (!p.queue) return send(res, 400, { error: "queue required" });
      return send(res, 200, await handleLive(p));
    }
    if (req.method === "GET" && url.pathname === "/api/metric") {
      const p = Object.fromEntries(url.searchParams);
      if (!p.queue) return send(res, 400, { error: "queue required" });
      return send(res, 200, await handleMetric(p));
    }
    if (req.method === "GET" && url.pathname === "/api/compare") {
      const p = Object.fromEntries(url.searchParams);
      if (!p.queues) return send(res, 400, { error: "queues required" });
      return send(res, 200, await handleCompare(p));
    }
    send(res, 404, { error: "not found" });
  } catch (err) {
    const status = (err.message.includes("required") || err.message.includes("at least 2")) ? 400 : 500;
    send(res, status, { error: err.message, name: err.name });
  }
});

server.listen(PORT, () => {
  console.log(`sqs-api-server: http://localhost:${PORT}`);
});
