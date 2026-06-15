#!/usr/bin/env node

/**
 * Cleanup script for stuck/errored media records.
 *
 * Does three things in order:
 *   1. Finds Media records stuck in PROCESSING for more than 15 minutes and sets
 *      them to ERROR (covers Lambda timeouts that can't set their own error state).
 *   2. Finds Transcriptions that have both a `source` URL and a `mediaId` where
 *      the linked Media record is in ERROR — unlinks them so the migration script
 *      will retry them on the next run and the app falls back to the legacy source.
 *   3. Finds orphaned Media records in ERROR state with no Transcription pointing
 *      at them — deletes any partial S3 files they produced and removes the record.
 *
 * Usage:
 *   node scripts/cleanup-media-records.js <environment> [aws-profile] [--dry-run] [--verbose]
 *
 * Examples:
 *   node scripts/cleanup-media-records.js staging --dry-run
 *   node scripts/cleanup-media-records.js staging kiyanaw-staging
 *   node scripts/cleanup-media-records.js production kiyanaw-production --verbose
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';

const CLI_ARGS = process.argv.slice(2);

const environment = CLI_ARGS[0];
let awsProfile = undefined;
let isDryRun = false;
let isVerbose = false;

for (let i = 1; i < CLI_ARGS.length; i++) {
  const arg = CLI_ARGS[i];
  if (arg === '--dry-run') isDryRun = true;
  else if (arg === '--verbose') isVerbose = true;
  else if (!awsProfile) awsProfile = arg;
}

if (!environment) {
  console.error('Usage: node scripts/cleanup-media-records.js <environment> [aws-profile] [--dry-run] [--verbose]');
  process.exit(1);
}

const TRANSCRIPTION_TABLE_NAMES = {
  staging: 'Transcription-ez3ghbw5fjgqhdpfqehbce5jju-staging',
  production: 'Transcription-3ufecmha4nhidg7iexhboozdm4-production',
};

const MEDIA_TABLE_NAMES = {
  staging: 'Media-ez3ghbw5fjgqhdpfqehbce5jju-staging',
  production: 'Media-3ufecmha4nhidg7iexhboozdm4-production',
};

const BUCKET_NAMES = {
  staging: 'kiyanaw-20250708160100-transcriptionsbucket-staging',
  production: 'kiyanaw-20250811160100-transcriptionsbucket-production',
};

if (!TRANSCRIPTION_TABLE_NAMES[environment]) {
  console.error(`Error: Unknown environment "${environment}"`);
  process.exit(1);
}

const TRANSCRIPTION_TABLE = TRANSCRIPTION_TABLE_NAMES[environment];
const MEDIA_TABLE = MEDIA_TABLE_NAMES[environment];
const BUCKET = BUCKET_NAMES[environment];
const AWS_REGION = 'us-east-1';
const STUCK_PROCESSING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes = Lambda max timeout

const clientConfig = { region: AWS_REGION };
if (awsProfile) clientConfig.credentials = fromIni({ profile: awsProfile });

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);
const s3 = new S3Client(clientConfig);

const logVerbose = (...args) => { if (isVerbose) console.log(...args); };

async function scanAll(tableName) {
  const items = [];
  let lastEvaluatedKey = undefined;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    }));
    if (result.Items) items.push(...result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
}

async function getMedia(mediaId) {
  const result = await docClient.send(new GetCommand({
    TableName: MEDIA_TABLE,
    Key: { id: mediaId },
  }));
  return result.Item;
}

async function setMediaError(media) {
  logVerbose(`  Setting Media ${media.id} (${media.originalName}) to ERROR`);
  const version = media._version || 1;
  await docClient.send(new UpdateCommand({
    TableName: MEDIA_TABLE,
    Key: { id: media.id },
    UpdateExpression: 'SET #status = :error, #ver = :newVersion, #lca = :now',
    ConditionExpression: '#status = :processing',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#ver': '_version',
      '#lca': '_lastChangedAt',
    },
    ExpressionAttributeValues: {
      ':error': 'ERROR',
      ':processing': 'PROCESSING',
      ':newVersion': version + 1,
      ':now': Date.now(),
    },
  }));
}

async function unlinkTranscription(transcription) {
  logVerbose(`  Unlinking Transcription ${transcription.id} ("${transcription.title}") from mediaId ${transcription.mediaId}`);
  const version = transcription._version || 1;
  await docClient.send(new UpdateCommand({
    TableName: TRANSCRIPTION_TABLE,
    Key: { id: transcription.id },
    UpdateExpression: 'REMOVE mediaId SET #ver = :newVersion, #lca = :now',
    ExpressionAttributeNames: {
      '#ver': '_version',
      '#lca': '_lastChangedAt',
    },
    ExpressionAttributeValues: {
      ':newVersion': version + 1,
      ':now': Date.now(),
    },
  }));
}

async function deleteS3Key(key) {
  logVerbose(`    Deleting s3://${BUCKET}/${key}`);
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

async function deleteOrphanedMedia(media) {
  // Delete any processed output files — but never the originalKey, which is
  // the user's uploaded file and may still be referenced by the legacy source URL.
  const keysToDelete = [media.renditionKey, media.peaksKey, media.thumbnailKey].filter(Boolean);

  for (const key of keysToDelete) {
    try {
      await deleteS3Key(key);
    } catch (error) {
      // Missing objects are fine — partial processing may never have created them
      if (error.name !== 'NoSuchKey') throw error;
    }
  }

  logVerbose(`  Deleting Media record ${media.id} ("${media.originalName}")`);
  await docClient.send(new DeleteCommand({
    TableName: MEDIA_TABLE,
    Key: { id: media.id },
  }));
}

async function main() {
  console.log(`\nEnvironment: ${environment}`);
  console.log(`Transcription table: ${TRANSCRIPTION_TABLE}`);
  console.log(`Media table: ${MEDIA_TABLE}`);
  if (awsProfile) console.log(`AWS profile: ${awsProfile}`);
  if (isDryRun) console.log('\n⚠️  DRY RUN — no changes will be made\n');
  console.log('');

  const stuckThreshold = new Date(Date.now() - STUCK_PROCESSING_THRESHOLD_MS).toISOString();

  // ─── Phase 1: stuck PROCESSING → ERROR ───────────────────────────────────────

  console.log('Phase 1: scanning for Media records stuck in PROCESSING...');
  const allMedia = await scanAll(MEDIA_TABLE);

  const stuckRecords = allMedia.filter(m =>
    m.status === 'PROCESSING' &&
    !m._deleted &&
    m.updatedAt < stuckThreshold
  );

  console.log(`Found ${stuckRecords.length} Media record(s) stuck in PROCESSING for more than 15 minutes`);

  if (stuckRecords.length > 0) {
    if (isDryRun) {
      for (const m of stuckRecords) {
        console.log(`  Would set ERROR: ${m.id}  "${m.originalName}"  (stuck since ${m.updatedAt})`);
      }
    } else {
      for (const m of stuckRecords) {
        console.log(`  Setting ERROR: ${m.id}  "${m.originalName}"  (stuck since ${m.updatedAt})`);
        try {
          await setMediaError(m);
          console.log(`    ✅ Done`);
        } catch (error) {
          if (error.name === 'ConditionalCheckFailedException') {
            console.log(`    ⚠️  Status changed before we could update, skipping`);
          } else {
            throw error;
          }
        }
      }
    }
  }

  // ─── Phase 2: unlink Transcriptions whose Media is ERROR ─────────────────────

  console.log('\nPhase 2: scanning for Transcriptions linked to errored Media...');
  const allTranscriptions = await scanAll(TRANSCRIPTION_TABLE);

  // Only consider transcriptions that have a fallback source — if there's no
  // source we have nothing to fall back to and shouldn't unlink
  const linkedWithSource = allTranscriptions.filter(t =>
    t.mediaId && t.source && !t._deleted
  );

  console.log(`Found ${linkedWithSource.length} transcription(s) with both source and mediaId`);

  const toUnlink = [];
  for (const t of linkedWithSource) {
    const media = await getMedia(t.mediaId);
    if (!media) {
      logVerbose(`  ${t.id}: media record ${t.mediaId} not found, skipping`);
      continue;
    }
    if (media.status === 'ERROR') {
      toUnlink.push(t);
    }
  }

  console.log(`Found ${toUnlink.length} transcription(s) to unlink (media in ERROR state)`);

  if (toUnlink.length > 0) {
    if (isDryRun) {
      for (const t of toUnlink) {
        console.log(`  Would unlink: ${t.id}  "${t.title}"  (mediaId: ${t.mediaId})`);
      }
    } else {
      for (const t of toUnlink) {
        console.log(`  Unlinking: ${t.id}  "${t.title}"`);
        await unlinkTranscription(t);
        console.log(`    ✅ Done`);
      }
    }
  }

  // ─── Phase 3: delete orphaned ERROR Media records ────────────────────────────

  console.log('\nPhase 3: scanning for orphaned ERROR Media records...');

  // Re-fetch transcriptions so we see the unlinks from Phase 2
  const linkedMediaIds = new Set(
    (await scanAll(TRANSCRIPTION_TABLE))
      .filter(t => t.mediaId && !t._deleted)
      .map(t => t.mediaId)
  );

  // Re-fetch media so we see the ERROR updates from Phase 1
  const currentMedia = await scanAll(MEDIA_TABLE);
  const orphans = currentMedia.filter(m =>
    m.status === 'ERROR' &&
    !m._deleted &&
    !linkedMediaIds.has(m.id)
  );

  console.log(`Found ${orphans.length} orphaned Media record(s) in ERROR state with no linked transcription`);

  if (orphans.length > 0) {
    if (isDryRun) {
      for (const m of orphans) {
        const s3Keys = [m.renditionKey, m.peaksKey, m.thumbnailKey].filter(Boolean);
        console.log(`  Would delete: ${m.id}  "${m.originalName}"  (${s3Keys.length} S3 file(s))`);
      }
    } else {
      for (const m of orphans) {
        const s3Keys = [m.renditionKey, m.peaksKey, m.thumbnailKey].filter(Boolean);
        console.log(`  Deleting: ${m.id}  "${m.originalName}"  (${s3Keys.length} S3 file(s))`);
        await deleteOrphanedMedia(m);
        console.log(`    ✅ Done`);
      }
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log('\n' + '='.repeat(80));
  if (isDryRun) {
    console.log('Dry run complete.');
    console.log(`  Would set ERROR:  ${stuckRecords.length} Media record(s)`);
    console.log(`  Would unlink:     ${toUnlink.length} Transcription(s)`);
    console.log(`  Would delete:     ${orphans.length} orphaned Media record(s)`);
  } else {
    console.log('Cleanup complete.');
    console.log(`  Set to ERROR: ${stuckRecords.length} Media record(s)`);
    console.log(`  Unlinked:     ${toUnlink.length} Transcription(s)`);
    console.log(`  Deleted:      ${orphans.length} orphaned Media record(s)`);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
