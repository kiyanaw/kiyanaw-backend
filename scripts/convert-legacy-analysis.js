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

// Get environment, optional AWS profile, and flags from command line arguments
const CLI_ARGS = process.argv.slice(2);

const environment = CLI_ARGS[0];
let awsProfile = undefined;
let isVerbose = false;

for (let i = 1; i < CLI_ARGS.length; i++) {
  const arg = CLI_ARGS[i];
  if (arg === '--verbose') {
    isVerbose = true;
  } else if (!awsProfile) {
    awsProfile = arg;
  }
}

if (!environment) {
  console.error('Error: Please provide an environment (staging, production)');
  console.error('Usage: node scripts/convert-legacy-analysis.js <environment> [aws-profile] [--verbose]');
  process.exit(1);
}

const logVerbose = (...args) => {
  if (isVerbose) {
    console.log(...args);
  }
};

// Table names for each environment
const TABLE_NAMES = {
  staging: 'Region-ez3ghbw5fjgqhdpfqehbce5jju-staging',
  production: 'Region-3ufecmha4nhidg7iexhboozdm4-production'
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
  const endpoints = {
    staging: 'https://0zwfjqbw8l.execute-api.us-east-1.amazonaws.com/staging',
    production: 'https://88g4s21ys7.execute-api.us-east-1.amazonaws.com/production'
  };
  
  const endpoint = endpoints[environment];
  if (!endpoint) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  const url = new URL(`${endpoint}/bulk-lookup`);
  
  const body = JSON.stringify({
    languageCode,
    words
  });
  
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
          logVerbose(`Spellchecker API response:`, result);
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

  // Convert to new format with analyses, filtering out words with no valid analyses
  return parsed
    .map(word => {
      const analyses = spellcheckResult[word] || [];
      
      // Filter out analyses containing "Err/Frag"
      const validAnalyses = analyses.filter(analysis => !analysis.includes('Err/Frag'));
      
      return {
        word: word,
        analysis: validAnalyses.length > 0 ? validAnalyses[0] : '',
        allAnalysis: validAnalyses
      };
    })
    .filter(item => item.allAnalysis.length > 0); // Only include words with valid analyses
}

/**
 * Get a specific region by ID from DynamoDB
 */
async function getRegionById(tableName, regionId) {
  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': regionId
    }
  });

  const result = await docClient.send(command);
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
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
 * Process a single region
 */
async function processRegion(region, tableName) {
  // Extract words from region text if no regionAnalysis exists or is empty
  let words = [];
  
  if (!region.regionAnalysis || (Array.isArray(region.regionAnalysis) && region.regionAnalysis.length === 0)) {
    // Check if region has regionText
    if (!region.regionText || typeof region.regionText !== 'string') {
      return { success: false, error: 'No regionText available' };
    }
    
    // Extract words from region text by splitting on whitespace
    words = region.regionText
      .replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '') // Remove punctuation
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
  } else {
    // Parse the current analysis
    let currentAnalysis;
    if (typeof region.regionAnalysis === 'string') {
      try {
        currentAnalysis = JSON.parse(region.regionAnalysis);
      } catch (e) {
        console.error(`❌ Invalid JSON in regionAnalysis for ${region.id}: ${e.message}`);
        return { success: false, error: 'Invalid JSON' };
      }
    } else {
      currentAnalysis = region.regionAnalysis;
    }

    // Extract words from current analysis
    if (Array.isArray(currentAnalysis)) {
      if (currentAnalysis.length > 0 && typeof currentAnalysis[0] === 'string') {
        // Legacy format (string array)
        words = currentAnalysis;
      } else if (currentAnalysis.length > 0 && typeof currentAnalysis[0] === 'object') {
        // New format (object array) - extract word field
        words = currentAnalysis.map(item => item.word).filter(word => word);
      }
    }
  }

  if (words.length === 0) {
    return { success: false, error: 'No words found' };
  }

  try {
    // Convert and analyze with spellchecker
    const converted = await convertAndAnalyze(words, 'crk', credentials);
    
    // Save the updated analysis
    await updateRegionAnalysis(tableName, region.id, converted);
    
    return { 
      success: true, 
      wordsProcessed: converted.length,
      originalWords: words.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Process regions with limited concurrency
 */
async function processRegionsWithConcurrency(regions, tableName, concurrencyLimit) {
  const results = new Array(regions.length);
  let index = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = index;
      index += 1;

      if (currentIndex >= regions.length) {
        break;
      }

      const region = regions[currentIndex];

      console.log(`Processing region ${currentIndex + 1}/${regions.length}: ${region.id}`);

      const result = await processRegion(region, tableName);

      if (result.success) {
        console.log(`✅ ${region.id}: ${result.wordsProcessed}/${result.originalWords} words analyzed`);
      } else {
        console.log(`❌ ${region.id}: ${result.error}`);
      }

      results[currentIndex] = {
        id: region.id,
        ...result
      };
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrencyLimit, regions.length) },
    () => worker()
  );

  await Promise.all(workers);

  return results;
}

/**
 * Main function
 */
async function main() {
  logVerbose(`\nProcessing all regions for environment: ${environment}`);
  logVerbose(`Table: ${TABLE_NAME}`);
  if (awsProfile) {
    logVerbose(`AWS Profile: ${awsProfile}`);
  }
  logVerbose('');

  try {
    logVerbose('Scanning all regions...\n');

    const regions = await scanAllRegions(TABLE_NAME);
    logVerbose(`Found ${regions.length} total regions\n`);

    const concurrencyFromEnv = Number(process.env.CONVERSION_CONCURRENCY);
    const concurrencyLimit = Number.isFinite(concurrencyFromEnv) && concurrencyFromEnv > 0
      ? Math.floor(concurrencyFromEnv)
      : 5;

    logVerbose(`Using concurrency limit: ${concurrencyLimit}\n`);

    const results = await processRegionsWithConcurrency(regions, TABLE_NAME, concurrencyLimit);

    const successCount = results.filter(result => result?.success).length;
    const errorEntries = results.filter(result => result && !result.success);

    console.log('\n' + '='.repeat(80));
    console.log('Processing complete!');
    console.log(`✅ Successfully processed: ${successCount} regions`);
    console.log(`❌ Errors: ${errorEntries.length} regions`);
    console.log(`📊 Total processed: ${results.length}/${regions.length} regions`);
    
    if (errorEntries.length > 0) {
      logVerbose('\nError details:');
      errorEntries.forEach(({ id, error }) => {
        logVerbose(`  ${id}: ${error}`);
      });
    }

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

