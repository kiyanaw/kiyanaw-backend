#!/usr/bin/env node

/**
 * Script to analyze Region table and identify legacy vs new format regionAnalysis
 * 
 * Usage:
 *   node scripts/analyze-region-analysis-format.js <environment> [aws-profile]
 * 
 * Examples:
 *   node scripts/analyze-region-analysis-format.js staging
 *   node scripts/analyze-region-analysis-format.js staging my-aws-profile
 *   node scripts/analyze-region-analysis-format.js production
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment and AWS profile from command line arguments
const environment = process.argv[2];
const awsProfile = process.argv[3];

if (!environment) {
  console.error('Error: Please provide an environment (staging, production)');
  console.error('Usage: node scripts/analyze-region-analysis-format.js <environment> [aws-profile]');
  process.exit(1);
}

// Table names for each environment
const TABLE_NAMES = {
  staging: 'Region-ez3ghbw5fjgqhdpfqehbce5jju-staging',
  production: 'Region-<production-id>-production'
};

if (!TABLE_NAMES[environment]) {
  console.error(`Error: Unknown environment "${environment}"`);
  console.error(`Valid environments: ${Object.keys(TABLE_NAMES).join(', ')}`);
  process.exit(1);
}

const TABLE_NAME = TABLE_NAMES[environment];

// AWS Region
const AWS_REGION = 'us-east-1';

// Configure AWS client with optional profile
const clientConfig = {
  region: AWS_REGION
};

if (awsProfile) {
  clientConfig.credentials = fromIni({ profile: awsProfile });
}

// Initialize DynamoDB client
const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Check if regionAnalysis is in legacy format (string array)
 * @param {any} regionAnalysis - The regionAnalysis field from DynamoDB
 * @returns {boolean} - True if legacy format, false if new format
 */
function isLegacyFormat(regionAnalysis) {
  if (!regionAnalysis) {
    return false; // No analysis is not legacy
  }

  // Parse if it's a JSON string
  let parsed;
  if (typeof regionAnalysis === 'string') {
    try {
      parsed = JSON.parse(regionAnalysis);
    } catch (e) {
      console.warn('Failed to parse regionAnalysis as JSON:', e.message);
      return false;
    }
  } else {
    parsed = regionAnalysis;
  }

  // Check if it's an array
  if (!Array.isArray(parsed)) {
    return false;
  }

  // Check if all elements are strings (legacy format)
  if (parsed.length === 0) {
    return false; // Empty array is not legacy
  }

  // Legacy format: all elements are strings
  // New format: all elements are objects with 'word', 'analysis', 'allAnalysis'
  const allStrings = parsed.every(item => typeof item === 'string');
  
  return allStrings;
}

/**
 * Scan all regions from DynamoDB
 */
async function scanAllRegions(tableName) {
  const regions = [];
  let lastEvaluatedKey = undefined;

  do {
    const params = {
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey
    };

    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    if (result.Items) {
      regions.push(...result.Items);
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return regions;
}

/**
 * Main function
 */
async function main() {
  console.log(`\nAnalyzing Region table for environment: ${environment}`);
  console.log(`Table: ${TABLE_NAME}`);
  if (awsProfile) {
    console.log(`AWS Profile: ${awsProfile}`);
  }
  console.log();

  try {
    console.log('Scanning all regions...\n');

    // Scan all regions
    const regions = await scanAllRegions(TABLE_NAME);

    console.log(`Found ${regions.length} total regions\n`);

    // Analyze each region
    const legacyRegions = [];
    const newFormatRegions = [];
    const noAnalysisRegions = [];
    const errorRegions = [];

    for (const region of regions) {
      const regionId = region.id;
      const regionAnalysis = region.regionAnalysis;

      try {
        if (!regionAnalysis) {
          noAnalysisRegions.push(regionId);
        } else if (isLegacyFormat(regionAnalysis)) {
          legacyRegions.push({
            id: regionId,
            analysis: regionAnalysis
          });
        } else {
          newFormatRegions.push(regionId);
        }
      } catch (error) {
        errorRegions.push({
          id: regionId,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total regions:           ${regions.length}`);
    console.log(`Legacy format (string[]): ${legacyRegions.length} (${((legacyRegions.length / regions.length) * 100).toFixed(1)}%)`);
    console.log(`New format (object[]):    ${newFormatRegions.length} (${((newFormatRegions.length / regions.length) * 100).toFixed(1)}%)`);
    console.log(`No analysis:             ${noAnalysisRegions.length} (${((noAnalysisRegions.length / regions.length) * 100).toFixed(1)}%)`);
    console.log(`Errors:                  ${errorRegions.length}`);
    console.log('='.repeat(80));
    console.log('\nAnalysis complete!\n');

  } catch (error) {
    console.error('\nError:', error.message);
    if (error.name === 'ResourceNotFoundException') {
      console.error(`\nTip: The table "${TABLE_NAME}" was not found.`);
      console.error('   You may need to:');
      console.error('   1. Check the actual table name in AWS Console');
      console.error('   2. Update the table name in this script');
      console.error('   3. Ensure you have the correct AWS credentials configured');
    }
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

