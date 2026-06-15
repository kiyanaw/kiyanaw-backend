#!/usr/bin/env node

/**
 * Migration script to create Media records for legacy transcriptions that have a
 * `source` URL but no `mediaId`. Each created Media record is then linked back to
 * the Transcription row by setting its `mediaId` field.
 *
 * Usage:
 *   node scripts/create-media-for-transcriptions.js <environment> [aws-profile] [--dry-run] [--verbose]
 *
 * Examples:
 *   node scripts/create-media-for-transcriptions.js staging --dry-run
 *   node scripts/create-media-for-transcriptions.js staging kiyanaw-staging
 *   node scripts/create-media-for-transcriptions.js production kiyanaw-production --verbose
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import { randomUUID } from 'crypto';

const CLI_ARGS = process.argv.slice(2);

const environment = CLI_ARGS[0];
let awsProfile = undefined;
let isDryRun = false;
let isVerbose = false;

for (let i = 1; i < CLI_ARGS.length; i++) {
  const arg = CLI_ARGS[i];
  if (arg === '--dry-run') {
    isDryRun = true;
  } else if (arg === '--verbose') {
    isVerbose = true;
  } else if (!awsProfile) {
    awsProfile = arg;
  }
}

if (!environment) {
  console.error('Error: Please provide an environment (staging, production)');
  console.error('Usage: node scripts/create-media-for-transcriptions.js <environment> [aws-profile] [--dry-run] [--verbose]');
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

/**
 * Extract the S3 key from a legacy source URL.
 * e.g. "https://bucket.s3.amazonaws.com/public/1753823638851-filename.mp3"
 *   -> "public/1753823638851-filename.mp3"
 */
function extractKeyFromUrl(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    // pathname is "/public/1753823638851-filename.mp3" — decode so S3 gets
    // the literal key (spaces etc.) rather than the %20-encoded form
    return decodeURIComponent(url.pathname.slice(1));
  } catch {
    // Fallback: split on the domain part
    const parts = sourceUrl.split('amazonaws.com/');
    return parts.length > 1 ? decodeURIComponent(parts[1]) : sourceUrl;
  }
}

/**
 * Derive the original user-facing filename from a source URL.
 * Strips any leading timestamp prefix (e.g. "1753823638851-") from the filename.
 */
function extractOriginalName(sourceUrl) {
  try {
    const key = extractKeyFromUrl(sourceUrl);
    const filename = key.split('/').pop();
    const decoded = decodeURIComponent(filename);
    const match = decoded.match(/^\d+-(.+)$/);
    return match ? match[1] : decoded;
  } catch {
    return 'unknown';
  }
}

/**
 * Guess the MIME type from a file extension.
 */
function guessMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map = {
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  return map[ext] || 'application/octet-stream';
}

async function scanAllTranscriptions() {
  const items = [];
  let lastEvaluatedKey = undefined;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TRANSCRIPTION_TABLE,
      ExclusiveStartKey: lastEvaluatedKey,
    }));
    if (result.Items) items.push(...result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
}

async function createMediaRecord(mediaId, transcription, originalKey, originalName) {
  const owner = transcription.author;
  const pk = `USER#${owner}`;
  const sk = `MEDIA#0000-00-00#${mediaId}`;
  const now = Date.now();

  const item = {
    id: mediaId,
    pk,
    sk,
    owner,
    status: 'PENDING',
    originalKey,
    originalName,
    mimeType: guessMimeType(originalName),
    fileSize: 0,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    _version: 1,
    _lastChangedAt: now,
    _deleted: false,
    __typename: 'Media',
  };

  if (transcription.editors?.length) item.editors = transcription.editors;
  if (transcription.viewers?.length) item.viewers = transcription.viewers;
  if (transcription.editorGroups?.length) item.editorGroups = transcription.editorGroups;
  if (transcription.viewerGroups?.length) item.viewerGroups = transcription.viewerGroups;

  logVerbose('  Creating Media record:', JSON.stringify(item, null, 2));

  await docClient.send(new PutCommand({
    TableName: MEDIA_TABLE,
    Item: item,
    ConditionExpression: 'attribute_not_exists(id)',
  }));
}

async function linkTranscriptionToMedia(transcription, mediaId) {
  const version = transcription._version || 1;

  logVerbose(`  Updating Transcription ${transcription.id} -> mediaId: ${mediaId}`);

  await docClient.send(new UpdateCommand({
    TableName: TRANSCRIPTION_TABLE,
    Key: { id: transcription.id },
    UpdateExpression: 'SET mediaId = :mediaId, #ver = :newVersion, #lca = :now',
    ConditionExpression: 'attribute_not_exists(mediaId) OR mediaId = :null',
    ExpressionAttributeNames: {
      '#ver': '_version',
      '#lca': '_lastChangedAt',
    },
    ExpressionAttributeValues: {
      ':mediaId': mediaId,
      ':newVersion': version + 1,
      ':now': Date.now(),
      ':null': null,
    },
  }));
}

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes (Lambda max is 15min)

async function pollUntilReady(mediaId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastStatus = null;

  while (Date.now() < deadline) {
    const result = await docClient.send(new GetCommand({
      TableName: MEDIA_TABLE,
      Key: { id: mediaId },
    }));

    const status = result.Item?.status;
    if (status !== lastStatus) {
      process.stdout.write(`  Status: ${status}`);
      lastStatus = status;
    } else {
      process.stdout.write('.');
    }

    if (status === 'READY') {
      process.stdout.write('\n');
      return;
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

async function backfillMediaAcls(transcriptions) {
  const migrated = transcriptions.filter(t => t.mediaId && !t._deleted);
  console.log(`\nChecking ACLs on ${migrated.length} already-migrated Media records...`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const transcription of migrated) {
    const result = await docClient.send(new GetCommand({
      TableName: MEDIA_TABLE,
      Key: { id: transcription.mediaId },
      ConsistentRead: true,
    }));

    const media = result.Item;
    if (!media) {
      console.log(`  ⚠️  Media record not found for transcription ${transcription.id} (mediaId: ${transcription.mediaId})`);
      continue;
    }

    const normalizeAcl = (val) => (val?.length ? val : null);
    const needsUpdate =
      JSON.stringify(normalizeAcl(media.editors)) !== JSON.stringify(normalizeAcl(transcription.editors)) ||
      JSON.stringify(normalizeAcl(media.viewers)) !== JSON.stringify(normalizeAcl(transcription.viewers)) ||
      JSON.stringify(normalizeAcl(media.editorGroups)) !== JSON.stringify(normalizeAcl(transcription.editorGroups)) ||
      JSON.stringify(normalizeAcl(media.viewerGroups)) !== JSON.stringify(normalizeAcl(transcription.viewerGroups));

    if (!needsUpdate) {
      skippedCount++;
      logVerbose(`  ✓ ${transcription.id} ACLs already match`);
      continue;
    }

    logVerbose(`  Updating ACLs for Media ${transcription.mediaId} (transcription: ${transcription.id})`);

    if (!isDryRun) {
      const updateExprParts = ['#lca = :now', '#ver = :newVersion'];
      const exprNames = { '#lca': '_lastChangedAt', '#ver': '_version' };
      const exprValues = { ':now': Date.now(), ':newVersion': (media._version || 1) + 1 };

      const aclFields = ['editors', 'viewers', 'editorGroups', 'viewerGroups'];
      for (const field of aclFields) {
        const val = transcription[field];
        exprNames[`#${field}`] = field;
        if (val?.length) {
          updateExprParts.push(`#${field} = :${field}`);
          exprValues[`:${field}`] = val;
        } else {
          updateExprParts.push(`REMOVE #${field}`);
        }
      }

      // REMOVE expressions must be separated
      const setParts = updateExprParts.filter(p => !p.startsWith('REMOVE'));
      const removeParts = updateExprParts.filter(p => p.startsWith('REMOVE')).map(p => p.replace('REMOVE ', ''));

      let updateExpression = `SET ${setParts.join(', ')}`;
      if (removeParts.length) updateExpression += ` REMOVE ${removeParts.join(', ')}`;

      await docClient.send(new UpdateCommand({
        TableName: MEDIA_TABLE,
        Key: { id: transcription.mediaId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
      }));

      console.log(`  ✅ Updated ACLs for Media ${transcription.mediaId}`);
    } else {
      console.log(`  Would update ACLs for Media ${transcription.mediaId}`);
    }
    updatedCount++;
  }

  console.log(`ACL backfill complete: ${updatedCount} updated, ${skippedCount} already correct.`);
}

async function main() {
  console.log(`\nEnvironment: ${environment}`);
  console.log(`Transcription table: ${TRANSCRIPTION_TABLE}`);
  console.log(`Media table: ${MEDIA_TABLE}`);
  if (awsProfile) console.log(`AWS profile: ${awsProfile}`);
  if (isDryRun) console.log('\n⚠️  DRY RUN — no changes will be made\n');
  console.log('');

  const all = await scanAllTranscriptions();
  console.log(`Found ${all.length} total transcription records`);

  const legacy = all.filter(t => t.source && !t.mediaId && !t._deleted);
  console.log(`Found ${legacy.length} transcriptions with a source URL but no mediaId\n`);

  if (isDryRun) {
    console.log('Records that would be migrated:');
    for (const t of legacy) {
      const originalName = extractOriginalName(t.source);
      console.log(`  ${t.id}  "${t.title}"  ->  ${originalName}`);
    }
    console.log(`\nDry run complete. ${legacy.length} records would be migrated.`);
    await backfillMediaAcls(all);
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const transcription of legacy) {
    const originalKey = extractKeyFromUrl(transcription.source);
    const originalName = extractOriginalName(transcription.source);
    const mediaId = randomUUID();

    console.log(`Processing: ${transcription.id}  "${transcription.title}"  ->  ${originalName}`);

    await createMediaRecord(mediaId, transcription, originalKey, originalName);
    await pollUntilReady(mediaId);
    await linkTranscriptionToMedia(transcription, mediaId);
    console.log(`  ✅ Done (mediaId: ${mediaId})`);
    successCount++;
  }

  await backfillMediaAcls(all);

  console.log('\n' + '='.repeat(80));
  console.log('Migration complete!');
  console.log(`✅ Migrated: ${successCount}`);
  console.log(`📊 Total:    ${legacy.length}`);
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
