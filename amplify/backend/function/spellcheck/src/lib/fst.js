/**
 * FST file management - handles downloading and caching FST files from S3 to EFS
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { createWriteStream } = require('fs');
const { mkdir } = require('fs/promises');
const { join } = require('path');
const { pipeline } = require('stream/promises');

const FSTS_FOLDER = 'fsts';
const EFS_MOUNT_DIR = '/fsts';
const BUCKET_NAME = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME;
const REGION = process.env.REGION || 'us-east-1';

if (!BUCKET_NAME) {
  throw new Error('STORAGE_TRANSCRIPTIONS_BUCKETNAME environment variable is not set');
}

const s3Client = new S3Client({ region: REGION });

/**
 * Download FST file from S3 to EFS mount point (only if it doesn't already exist)
 * 
 * @param {string} fileName - Exact filename of the FST file (e.g., 'crk-strict-analyzer.hfstol')
 * @returns {Promise<string>} - Path to the local FST file
 */
async function downloadFstFromS3(fileName) {
  const s3Key = `${FSTS_FOLDER}/${fileName}`;
  const localPath = join(EFS_MOUNT_DIR, fileName);

  // Check if file already exists on EFS
  const fs = require('fs');
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // Ensure EFS directory exists
  await mkdir(EFS_MOUNT_DIR, { recursive: true });

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const response = await s3Client.send(command);
    const writeStream = createWriteStream(localPath);
    
    await pipeline(response.Body, writeStream);
    
    return localPath;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      throw new Error(`FST file not found: ${s3Key}`);
    }
    throw new Error(`Failed to download FST file ${s3Key}: ${error.message}`);
  }
}

module.exports = {
  downloadFstFromS3,
}

