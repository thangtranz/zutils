import { SQSClient, GetQueueUrlCommand, GetQueueAttributesCommand } from "@aws-sdk/client-sqs";
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { fromIni } from "@aws-sdk/credential-providers";

export { parseTime, buildClientConfig, isUrl, resolveQueueUrl, queueNameFromAny, getLive, getMetric };

function parseTime(s, fallbackMsOffset) {
  if (!s) return new Date(Date.now() + fallbackMsOffset);
  const m = /^-(\d+)([smhd])$/.exec(s);
  if (m) {
    const mult = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 }[m[2]];
    return new Date(Date.now() - Number(m[1]) * mult);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid time: ${s}`);
  return d;
}

function buildClientConfig(args) {
  const cfg = { region: args.region || process.env.AWS_REGION || "ap-southeast-1" };
  if (args.profile) cfg.credentials = fromIni({ profile: args.profile });
  return cfg;
}

function isUrl(s) {
  return s.includes("://");
}

async function resolveQueueUrl(sqs, queue) {
  if (isUrl(queue)) return queue;
  const r = await sqs.send(new GetQueueUrlCommand({ QueueName: queue }));
  return r.QueueUrl;
}

function queueNameFromAny(queue) {
  return isUrl(queue) ? queue.split("/").pop() : queue;
}

async function getLive(sqs, queue) {
  const url = await resolveQueueUrl(sqs, queue);
  const r = await sqs.send(new GetQueueAttributesCommand({
    QueueUrl: url,
    AttributeNames: [
      "ApproximateNumberOfMessages",
      "ApproximateNumberOfMessagesNotVisible",
      "ApproximateNumberOfMessagesDelayed",
    ],
  }));
  return { url, attrs: r.Attributes };
}

async function getMetric(cw, queueName, metric, start, end, period, stat) {
  const r = await cw.send(new GetMetricStatisticsCommand({
    Namespace: "AWS/SQS",
    MetricName: metric,
    Dimensions: [{ Name: "QueueName", Value: queueName }],
    StartTime: start,
    EndTime: end,
    Period: period,
    Statistics: [stat],
  }));
  return (r.Datapoints || []).sort((a, b) => a.Timestamp - b.Timestamp);
}
