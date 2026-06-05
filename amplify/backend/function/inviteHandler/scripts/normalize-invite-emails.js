#!/usr/bin/env node
/**
 * One-time migration script: normalize invite emails to lowercase.
 *
 * Run once per environment after deploying the email case-insensitivity fix.
 *
 * Usage:
 *   API_KIYANAW_INVITETABLE_NAME=<table-name> REGION=<region> node normalize-invite-emails.js
 *
 * The table name can be found in the AWS console (DynamoDB > Tables) or from
 * amplify/backend/amplify-meta.json under api.kiyanaw.output.API_KIYANAW_INVITETABLE_NAME.
 *
 * This script is idempotent: running it twice changes nothing the second time.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.API_KIYANAW_INVITETABLE_NAME;
const REGION = process.env.REGION || 'ca-central-1';

if (!TABLE_NAME) {
  console.error('ERROR: API_KIYANAW_INVITETABLE_NAME environment variable is required');
  process.exit(1);
}

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function migrate() {
  console.log(`Scanning table: ${TABLE_NAME} in region: ${REGION}`);

  let lastEvaluatedKey;
  let totalScanned = 0;
  let totalFixed = 0;

  do {
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    const items = scanResult.Items || [];
    totalScanned += items.length;

    for (const item of items) {
      const normalized = item.email?.toLowerCase();
      if (normalized && normalized !== item.email) {
        console.log(`  Fixing: ${item.id}  "${item.email}" → "${normalized}"`);

        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...item,
            email: normalized,
            updatedAt: new Date().toISOString(),
            _version: (item._version || 0) + 1,
            _lastChangedAt: Date.now(),
          },
        }));

        totalFixed++;
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`\nDone. Scanned: ${totalScanned}, Fixed: ${totalFixed}`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
