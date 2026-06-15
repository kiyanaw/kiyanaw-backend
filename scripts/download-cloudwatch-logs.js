#!/usr/bin/env node

/**
 * Downloads recent CloudWatch log events from a log group to a local file.
 *
 * Usage:
 *   node scripts/download-cloudwatch-logs.js <log-group> [aws-profile] [options]
 *
 * Options:
 *   --hours <n>      How many hours back to fetch (default: 3)
 *   --output <file>  Output file path (default: /tmp/cwlogs-<sanitized-group>.log)
 *   --region <r>     AWS region (default: us-east-1)
 *
 * Examples:
 *   node scripts/download-cloudwatch-logs.js /aws/lambda/processMedia-staging kiyanaw-staging
 *   node scripts/download-cloudwatch-logs.js /aws/lambda/spellcheck-staging kiyanaw-staging --hours 1
 */

import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { fromIni } from '@aws-sdk/credential-providers';
import { writeFileSync } from 'fs';

const CLI_ARGS = process.argv.slice(2);

const logGroup = CLI_ARGS[0];
let awsProfile = undefined;
let hoursBack = 3;
let outputFile = undefined;
let region = 'us-east-1';

for (let i = 1; i < CLI_ARGS.length; i++) {
  const arg = CLI_ARGS[i];
  if (arg === '--hours') {
    hoursBack = parseFloat(CLI_ARGS[++i]);
  } else if (arg === '--output') {
    outputFile = CLI_ARGS[++i];
  } else if (arg === '--region') {
    region = CLI_ARGS[++i];
  } else if (!awsProfile) {
    awsProfile = arg;
  }
}

if (!logGroup) {
  console.error('Usage: node scripts/download-cloudwatch-logs.js <log-group> [aws-profile] [--hours <n>] [--output <file>] [--region <r>]');
  process.exit(1);
}

if (!outputFile) {
  const sanitized = logGroup.replace(/[^a-zA-Z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  outputFile = `/tmp/cwlogs-${sanitized}.log`;
}

const clientConfig = { region };
if (awsProfile) {
  clientConfig.credentials = fromIni({ profile: awsProfile });
}

const client = new CloudWatchLogsClient(clientConfig);

const startTime = Date.now() - hoursBack * 60 * 60 * 1000;

async function fetchStreams() {
  const streams = [];
  let nextToken = undefined;

  do {
    const result = await client.send(new DescribeLogStreamsCommand({
      logGroupName: logGroup,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 50,
      nextToken,
    }));
    for (const s of result.logStreams || []) {
      if ((s.lastEventTimestamp || 0) >= startTime) {
        streams.push(s.logStreamName);
      }
    }
    // Stop paging once streams are older than our window
    const oldest = result.logStreams?.at(-1);
    if (!oldest || (oldest.lastEventTimestamp || 0) < startTime) break;
    nextToken = result.nextToken;
  } while (nextToken);

  return streams;
}

async function fetchEvents(streamName) {
  const events = [];
  let nextForwardToken = undefined;

  do {
    const result = await client.send(new GetLogEventsCommand({
      logGroupName: logGroup,
      logStreamName: streamName,
      startTime,
      startFromHead: true,
      nextToken: nextForwardToken,
    }));
    events.push(...(result.events || []));
    // GetLogEvents returns the same token when exhausted
    if (result.nextForwardToken === nextForwardToken) break;
    nextForwardToken = result.nextForwardToken;
  } while (true);

  return events;
}

async function main() {
  console.log(`Log group : ${logGroup}`);
  console.log(`Window    : last ${hoursBack}h (since ${new Date(startTime).toISOString()})`);
  if (awsProfile) console.log(`Profile   : ${awsProfile}`);
  console.log(`Output    : ${outputFile}`);
  console.log('');

  console.log('Fetching log streams...');
  const streams = await fetchStreams();
  console.log(`Found ${streams.length} active stream(s)`);

  const allEvents = [];

  for (const stream of streams) {
    process.stdout.write(`  ${stream} ... `);
    const events = await fetchEvents(stream);
    process.stdout.write(`${events.length} events\n`);
    for (const e of events) {
      allEvents.push({ timestamp: e.timestamp, stream, message: e.message });
    }
  }

  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  const lines = allEvents.map(e => {
    const ts = new Date(e.timestamp).toISOString();
    return `[${ts}] [${e.stream}] ${e.message}`;
  });

  writeFileSync(outputFile, lines.join(''), 'utf8');
  console.log(`\nWrote ${allEvents.length} events to ${outputFile}`);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
