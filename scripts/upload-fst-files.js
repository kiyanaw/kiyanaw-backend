#!/usr/bin/env node

/**
 * Script to upload hfstol files to S3 fsts folder
 * 
 * Usage:
 *   node scripts/upload-fst-files.js <environment> [aws-profile] [--verbose] [--update]
 * 
 * Examples:
 *   node scripts/upload-fst-files.js staging
 *   node scripts/upload-fst-files.js staging kiyanaw-staging
 *   node scripts/upload-fst-files.js staging kiyanaw-staging --verbose
 *   node scripts/upload-fst-files.js staging kiyanaw-staging --update
 * 
 * Flags:
 *   --verbose  Show detailed logging
 *   --update   Re-upload existing files (by default, existing files are skipped)
 */

import { S3Client, ListObjectsV2Command, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get environment, optional AWS profile, and flags from command line arguments
const CLI_ARGS = process.argv.slice(2);

const environment = CLI_ARGS[0];
let awsProfile = undefined;
let isVerbose = false;
let shouldUpdate = false;

for (let i = 1; i < CLI_ARGS.length; i++) {
  const arg = CLI_ARGS[i];
  if (arg === '--verbose') {
    isVerbose = true;
  } else if (arg === '--update') {
    shouldUpdate = true;
  } else if (!awsProfile) {
    awsProfile = arg;
  }
}

if (!environment) {
  console.error('Error: Please provide an environment (staging, production)');
  console.error('Usage: node scripts/upload-fst-files.js <environment> [aws-profile] [--verbose] [--update]');
  process.exit(1);
}

const logVerbose = (...args) => {
  if (isVerbose) {
    console.log(...args);
  }
};

// Bucket names for each environment
const BUCKET_NAMES = {
  staging: 'kiyanaw-20250708160100-transcriptionsbucket-staging',
  production: 'kiyanaw-20250811160100-transcriptionsbucket-production'
};

if (!BUCKET_NAMES[environment]) {
  console.error(`Error: Unknown environment "${environment}"`);
  console.error(`Valid environments: ${Object.keys(BUCKET_NAMES).join(', ')}`);
  process.exit(1);
}

const BUCKET_NAME = BUCKET_NAMES[environment];
const FSTS_FOLDER = 'fsts';
const LOCAL_FST_FOLDER = join(__dirname, 'fsts-to-upload');

// AWS Region
const AWS_REGION = 'us-east-1';

// Configure AWS client with optional profile
const clientConfig = {
  region: AWS_REGION
};

if (awsProfile) {
  clientConfig.credentials = fromIni({ profile: awsProfile });
}

// Initialize S3 client
const s3Client = new S3Client(clientConfig);

/**
 * Check if fsts folder exists in S3 bucket
 */
async function checkFstsFolderExists(bucketName) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `${FSTS_FOLDER}/`,
      MaxKeys: 1
    });

    const result = await s3Client.send(command);
    return result.KeyCount !== undefined && result.KeyCount > 0;
  } catch (error) {
    if (error.name === 'NoSuchBucket') {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }
    throw error;
  }
}

/**
 * Create fsts folder in S3 (by uploading an empty marker object)
 */
async function createFstsFolder(bucketName) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `${FSTS_FOLDER}/.keep`,
      Body: Buffer.from('')
    });

    await s3Client.send(command);
    logVerbose(`Created ${FSTS_FOLDER} folder in bucket ${bucketName}`);
    return true;
  } catch (error) {
    throw new Error(`Failed to create ${FSTS_FOLDER} folder: ${error.message}`);
  }
}

/**
 * Check if a file exists in S3
 */
async function fileExistsInS3(bucketName, key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Upload a file to S3
 */
async function uploadFileToS3(bucketName, key, filePath) {
  try {
    const fileContent = await readFile(filePath);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileContent
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    throw new Error(`Failed to upload ${key}: ${error.message}`);
  }
}

/**
 * Get all hfstol files from local folder
 */
async function getLocalHfstolFiles(folderPath) {
  if (!existsSync(folderPath)) {
    throw new Error(`Local folder does not exist: ${folderPath}`);
  }

  const files = await readdir(folderPath);
  const hfstolFiles = files.filter(file => file.endsWith('.hfstol'));

  return hfstolFiles.map(file => ({
    filename: file,
    localPath: join(folderPath, file),
    s3Key: `${FSTS_FOLDER}/${file}`
  }));
}

/**
 * Process a single file (check if exists, then upload or replace)
 */
async function processFile(fileInfo, bucketName, shouldUpdate) {
  const { filename, localPath, s3Key } = fileInfo;

  const exists = await fileExistsInS3(bucketName, s3Key);
  
  // Skip existing files unless --update flag is provided
  if (exists && !shouldUpdate) {
    return {
      filename,
      action: 'skipped',
      success: true
    };
  }

  const action = exists ? 'Replacing' : 'Uploading';
  console.log(`${action} ${filename}...`);

  await uploadFileToS3(bucketName, s3Key, localPath);

  return {
    filename,
    action: exists ? 'replaced' : 'uploaded',
    success: true
  };
}

/**
 * Main function
 */
async function main() {
  logVerbose(`\nProcessing FST files for environment: ${environment}`);
  logVerbose(`Bucket: ${BUCKET_NAME}`);
  logVerbose(`Local folder: ${LOCAL_FST_FOLDER}`);
  if (awsProfile) {
    logVerbose(`AWS Profile: ${awsProfile}`);
  }
  if (shouldUpdate) {
    logVerbose(`Update mode: ON (will replace existing files)`);
  } else {
    logVerbose(`Update mode: OFF (will skip existing files)`);
  }
  logVerbose('');

  try {
    // Check if fsts folder exists, create if not
    logVerbose(`Checking for ${FSTS_FOLDER} folder in bucket...`);
    const fstsExists = await checkFstsFolderExists(BUCKET_NAME);
    
    if (!fstsExists) {
      console.log(`Creating ${FSTS_FOLDER} folder in bucket...`);
      await createFstsFolder(BUCKET_NAME);
      console.log(`✅ Created ${FSTS_FOLDER} folder`);
    } else {
      logVerbose(`✅ ${FSTS_FOLDER} folder already exists`);
    }

    console.log('');

    // Get all local hfstol files
    console.log(`Scanning local folder: ${LOCAL_FST_FOLDER}`);
    const localFiles = await getLocalHfstolFiles(LOCAL_FST_FOLDER);
    
    if (localFiles.length === 0) {
      console.log(`No .hfstol files found in ${LOCAL_FST_FOLDER}`);
      return;
    }

    console.log(`Found ${localFiles.length} .hfstol file(s) to process\n`);

    // Process each file
    const results = [];
    for (const fileInfo of localFiles) {
      try {
        const result = await processFile(fileInfo, BUCKET_NAME, shouldUpdate);
        results.push(result);
        if (result.action === 'skipped') {
          console.log(`⏭️  ${result.filename}: skipped (already exists, use --update to replace)`);
        } else {
          console.log(`✅ ${result.filename}: ${result.action}`);
        }
      } catch (error) {
        results.push({
          filename: fileInfo.filename,
          action: 'error',
          success: false,
          error: error.message
        });
        console.log(`❌ ${fileInfo.filename}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('Processing complete!');
    
    const successCount = results.filter(r => r.success).length;
    const replacedCount = results.filter(r => r.success && r.action === 'replaced').length;
    const uploadedCount = results.filter(r => r.success && r.action === 'uploaded').length;
    const skippedCount = results.filter(r => r.success && r.action === 'skipped').length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`✅ Successfully processed: ${successCount} file(s)`);
    if (uploadedCount > 0) {
      console.log(`   - Uploaded: ${uploadedCount} file(s)`);
    }
    if (replacedCount > 0) {
      console.log(`   - Replaced: ${replacedCount} file(s)`);
    }
    if (skippedCount > 0) {
      console.log(`   - Skipped: ${skippedCount} file(s) (already exist, use --update to replace)`);
    }
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} file(s)`);
      logVerbose('\nError details:');
      results.filter(r => !r.success).forEach(r => {
        logVerbose(`  ${r.filename}: ${r.error}`);
      });
    }

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

