#!/usr/bin/env node

/**
 * Regenerates the rendition, peaks, and thumbnail for a transcription's media by
 * sending its Media record back through processMedia. Use after a processMedia fix
 * to repair a transcription that was processed with the old behavior.
 *
 * The transcription is resolved to its Media record, which is flipped from READY
 * back to PENDING. That change arrives on the Media table's DynamoDB stream and
 * triggers processMedia, which re-transcodes `originalKey` and overwrites the same
 * rendition/peaks/thumbnail keys. The script then waits for the record to reach
 * READY again.
 *
 * Only transcriptions that already have a `mediaId` are supported. Legacy
 * transcriptions (a `source` URL but no `mediaId`) go through
 * create-media-for-transcriptions.js instead.
 *
 * Usage:
 *   node scripts/reprocess-media.js <environment> <transcription-id> [aws-profile] [--dry-run] [--verbose]
 *
 * Examples:
 *   node scripts/reprocess-media.js staging 1a2b3c4d-... --dry-run
 *   node scripts/reprocess-media.js staging 1a2b3c4d-... kiyanaw-staging
 *   node scripts/reprocess-media.js production 1a2b3c4d-... kiyanaw-production --verbose
 *
 * Note: the browser or CloudFront may keep serving the old rendition and peaks
 * (same keys) for a while. If the user still sees the old waveform after READY,
 * have them hard-refresh or invalidate the CDN cache.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';

const CLI_ARGS = process.argv.slice(2);

const environment = CLI_ARGS[0];
const transcriptionId = CLI_ARGS[1];
let awsProfile = undefined;
let isDryRun = false;
let isVerbose = false;

for (let i = 2; i < CLI_ARGS.length; i++) {
  const arg = CLI_ARGS[i];
  if (arg === '--dry-run') {
    isDryRun = true;
  } else if (arg === '--verbose') {
    isVerbose = true;
  } else if (!awsProfile) {
    awsProfile = arg;
  }
}

const USAGE = 'Usage: node scripts/reprocess-media.js <environment> <transcription-id> [aws-profile] [--dry-run] [--verbose]';

if (!environment || !transcriptionId) {
  console.error('Error: Please provide an environment (staging, production) and a transcription id');
  console.error(USAGE);
  process.exit(1);
}

const logVerbose = (...args) => {
  if (isVerbose) console.log(...args);
};

// Table names follow the Amplify convention: {Model}-{AppSyncApiId}-{environment}
// These IDs are shared across all models in the same environment.
const TRANSCRIPTION_TABLE_NAMES = {
  staging: 'Transcription-ez3ghbw5fjgqhdpfqehbce5jju-staging',
  production: 'Transcription-3ufecmha4nhidg7iexhboozdm4-production',
};

const MEDIA_TABLE_NAMES = {
  staging: 'Media-ez3ghbw5fjgqhdpfqehbce5jju-staging',
  production: 'Media-3ufecmha4nhidg7iexhboozdm4-production',
};

if (!TRANSCRIPTION_TABLE_NAMES[environment]) {
  console.error(`Error: Unknown environment "${environment}"`);
  console.error(`Valid environments: ${Object.keys(TRANSCRIPTION_TABLE_NAMES).join(', ')}`);
  process.exit(1);
}

const TRANSCRIPTION_TABLE = TRANSCRIPTION_TABLE_NAMES[environment];
const MEDIA_TABLE = MEDIA_TABLE_NAMES[environment];
const AWS_REGION = 'us-east-1';

const clientConfig = { region: AWS_REGION };
if (awsProfile) {
  clientConfig.credentials = fromIni({ profile: awsProfile });
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes (Lambda max is 15min)

async function getTranscription(id) {
  const result = await docClient.send(new GetCommand({
    TableName: TRANSCRIPTION_TABLE,
    Key: { id },
  }));
  return result.Item;
}

async function getMedia(id) {
  const result = await docClient.send(new GetCommand({
    TableName: MEDIA_TABLE,
    Key: { id },
  }));
  return result.Item;
}

/**
 * Flip READY -> PENDING to trigger processMedia. The condition makes this fail if
 * the record is already being (re)processed or changed state since we read it, so
 * two runs can't queue the same media twice.
 */
async function markPending(mediaId) {
  await docClient.send(new UpdateCommand({
    TableName: MEDIA_TABLE,
    Key: { id: mediaId },
    UpdateExpression: 'SET #status = :pending, #updatedAt = :now',
    ConditionExpression: '#status = :ready',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':pending': 'PENDING',
      ':ready': 'READY',
      ':now': new Date().toISOString(),
    },
  }));
}

async function pollUntilReady(mediaId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastStatus = null;

  while (Date.now() < deadline) {
    const media = await getMedia(mediaId);
    const status = media?.status;

    if (status !== lastStatus) {
      process.stdout.write(`  Status: ${status}`);
      lastStatus = status;
    } else {
      process.stdout.write('.');
    }

    if (status === 'READY') {
      process.stdout.write('\n');
      return media;
    }
    if (status === 'ERROR') {
      process.stdout.write('\n');
      throw new Error(`processMedia set status to ERROR for mediaId ${mediaId}`);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  process.stdout.write('\n');
  throw new Error(`Timed out waiting for mediaId ${mediaId} to become READY (last status: ${lastStatus})`);
}

async function main() {
  console.log(`Environment: ${environment}${isDryRun ? ' (dry run)' : ''}`);

  const transcription = await getTranscription(transcriptionId);
  if (!transcription || transcription._deleted) {
    throw new Error(`Transcription ${transcriptionId} not found in ${TRANSCRIPTION_TABLE}`);
  }
  if (!transcription.mediaId) {
    throw new Error(
      `Transcription ${transcriptionId} has no mediaId (legacy source-only transcription). ` +
      'Run scripts/create-media-for-transcriptions.js instead.'
    );
  }
  console.log(`Transcription ${transcriptionId} -> mediaId ${transcription.mediaId}`);

  const media = await getMedia(transcription.mediaId);
  if (!media || media._deleted) {
    throw new Error(`Media ${transcription.mediaId} not found in ${MEDIA_TABLE}`);
  }
  if (media.status !== 'READY') {
    throw new Error(`Media ${media.id} is ${media.status}, expected READY. Not reprocessing.`);
  }
  if (!media.originalKey) {
    throw new Error(`Media ${media.id} has no originalKey, nothing to reprocess from`);
  }

  console.log(`  originalKey:  ${media.originalKey}`);
  console.log(`  renditionKey: ${media.renditionKey}`);
  console.log(`  duration:     ${media.duration}`);
  logVerbose('  Media record:', JSON.stringify(media, null, 2));

  if (isDryRun) {
    console.log('\nDry run: would set status READY -> PENDING to trigger processMedia. No changes made.');
    return;
  }

  console.log('\nSetting status to PENDING to trigger processMedia...');
  await markPending(media.id);

  const updated = await pollUntilReady(media.id);
  console.log(`\nDone. New duration: ${updated.duration} (was ${media.duration})`);
  console.log('If the old waveform still shows, hard-refresh the page or invalidate the CDN cache.');
}

main().catch(error => {
  console.error(`\nError: ${error.message}`);
  process.exit(1);
});
