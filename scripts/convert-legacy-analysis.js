#!/usr/bin/env node

/**
 * Script to convert legacy regionAnalysis (string[]) to new format (object[])
 * 
 * Usage:
 *   node scripts/convert-legacy-analysis.js <environment> [aws-profile]
 * 
 * Examples:
 *   node scripts/convert-legacy-analysis.js staging
 *   node scripts/convert-legacy-analysis.js staging kiyanaw-staging
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment and AWS profile from command line arguments
const environment = process.argv[2];
const awsProfile = process.argv[3];

if (!environment) {
  console.error('Error: Please provide an environment (staging, production)');
  console.error('Usage: node scripts/convert-legacy-analysis.js <environment> [aws-profile]');
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

// Get credentials for API signing
let credentials;
if (awsProfile) {
  credentials = await fromIni({ profile: awsProfile })();
} else {
  // Use default credentials
  const { defaultProvider } = await import('@aws-sdk/credential-providers');
  credentials = await defaultProvider()();
}

/**
 * Check if regionAnalysis is in legacy format (string array)
 */
function isLegacyFormat(regionAnalysis) {
  if (!regionAnalysis) {
    return false;
  }

  let parsed;
  if (typeof regionAnalysis === 'string') {
    try {
      parsed = JSON.parse(regionAnalysis);
    } catch (e) {
      return false;
    }
  } else {
    parsed = regionAnalysis;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return false;
  }

  const allStrings = parsed.every(item => typeof item === 'string');
  return allStrings;
}

/**
 * Convert legacy string array to new object array format
 */
function convertLegacyAnalysis(legacyAnalysis) {
  let parsed;
  if (typeof legacyAnalysis === 'string') {
    parsed = JSON.parse(legacyAnalysis);
  } else {
    parsed = legacyAnalysis;
  }

  return parsed.map(word => ({
    word: word,
    analysis: '',
    allAnalysis: []
  }));
}

/**
 * Call the spellchecker API to get word analyses
 */
async function spellcheckWords(words, languageCode = 'crk', credentials) {
  const endpoint = 'https://0zwfjqbw8l.execute-api.us-east-1.amazonaws.com/staging';
  const url = new URL(`${endpoint}/${languageCode}/bulk-lookup`);
  
  const body = JSON.stringify(words);
  
  // Create signed request
  const signer = new SignatureV4({
    credentials,
    region: 'us-east-1',
    service: 'execute-api',
    sha256: Sha256
  });

  const request = {
    method: 'POST',
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(body)),
      'Host': url.hostname
    },
    body
  };

  const signedRequest = await signer.sign(request, {
    unsignableHeaders: new Set(['Content-Length'])
  });

  // Convert headers to simple key-value pairs, ensuring all values are strings
  const headers = {};
  for (const [key, value] of Object.entries(signedRequest.headers)) {
    if (Array.isArray(value)) {
      headers[key] = value[0];
    } else if (typeof value === 'string') {
      headers[key] = value;
    } else {
      headers[key] = String(value);
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request({
      ...signedRequest,
      headers
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`Spellchecker API response:`, result);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Convert legacy analysis and populate with spellchecker results
 */
async function convertAndAnalyze(legacyAnalysis, languageCode, credentials) {
  let parsed;
  if (typeof legacyAnalysis === 'string') {
    parsed = JSON.parse(legacyAnalysis);
  } else {
    parsed = legacyAnalysis;
  }

  // Call spellchecker API
  const spellcheckResult = await spellcheckWords(parsed, languageCode, credentials);

  // Convert to new format with analyses
  return parsed.map(word => {
    const analyses = spellcheckResult[word] || [];
    
    // Filter out analyses containing "Err/Frag"
    const validAnalyses = analyses.filter(analysis => !analysis.includes('Err/Frag'));
    
    return {
      word: word,
      analysis: validAnalyses.length > 0 ? validAnalyses[0] : '',
      allAnalysis: validAnalyses
    };
  });
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
 * Update a region's analysis in DynamoDB
 */
async function updateRegionAnalysis(tableName, regionId, newAnalysis) {
  const command = new UpdateCommand({
    TableName: tableName,
    Key: { id: regionId },
    UpdateExpression: 'SET regionAnalysis = :analysis',
    ExpressionAttributeValues: {
      ':analysis': newAnalysis
    }
  });

  await docClient.send(command);
}

/**
 * Main function
 */
async function main() {
  console.log(`\nConverting legacy regionAnalysis for environment: ${environment}`);
  console.log(`Table: ${TABLE_NAME}`);
  if (awsProfile) {
    console.log(`AWS Profile: ${awsProfile}`);
  }
  console.log();

  try {
    console.log('Scanning all regions...\n');

    const regions = await scanAllRegions(TABLE_NAME);
    console.log(`Found ${regions.length} total regions\n`);

    // Find legacy regions
    const legacyRegions = [];

    for (const region of regions) {
      const regionAnalysis = region.regionAnalysis;

      if (regionAnalysis && isLegacyFormat(regionAnalysis)) {
        legacyRegions.push({
          id: region.id,
          transcriptionId: region.transcriptionId,
          regionText: region.regionText,
          analysis: regionAnalysis
        });
      }
    }

    console.log(`Found ${legacyRegions.length} legacy regions to convert\n`);

    // Convert and show 10 regions with spellchecker (TEST)
    console.log('='.repeat(80));
    console.log('TESTING SPELLCHECKER ON 10 REGIONS');
    console.log('='.repeat(80));

    const numToProcess = Math.min(10, legacyRegions.length);
    
    for (let i = 0; i < numToProcess; i++) {
      const region = legacyRegions[i];
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`\nRegion ${i + 1}/${numToProcess}`);
      console.log(`Region ID: ${region.id}`);
      console.log(`Transcription: ${region.transcriptionId}`);
      console.log(`Text: "${region.regionText}"`);
      console.log(`Legacy format: ${JSON.stringify(region.analysis)}`);
      console.log(`\nCalling spellchecker...`);
      
      const converted = await convertAndAnalyze(region.analysis, 'crk', credentials);
      
      console.log(`\nNew format with analyses:`);
      converted.forEach((item, idx) => {
        console.log(`\n[${idx}] word: "${item.word}"`);
        console.log(`    analysis: "${item.analysis}"`);
        console.log(`    allAnalysis: ${JSON.stringify(item.allAnalysis)}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('\nConversion complete!');
    console.log(`Total legacy regions: ${legacyRegions.length}`);
    console.log('\nNOTE: No changes have been saved to DynamoDB yet.\n');

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

