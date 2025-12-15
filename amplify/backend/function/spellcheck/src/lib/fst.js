/**
 * FST file management - handles downloading and caching FST files from S3 to EFS
 * 
 * Files are cached on EFS, but we check S3 ETag to detect when files have been updated
 * and need to be re-downloaded.
 */

const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { createWriteStream, readFileSync, writeFileSync, unlinkSync } = require('fs');
const { mkdir } = require('fs/promises');
const { join } = require('path');
const { pipeline } = require('stream/promises');

const FSTS_FOLDER = 'fsts';
const EFS_MOUNT_DIR = '/mnt/fsts';
const BUCKET_NAME = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME;
const REGION = process.env.REGION || 'us-east-1';

if (!BUCKET_NAME) {
  throw new Error('STORAGE_TRANSCRIPTIONS_BUCKETNAME environment variable is not set');
}

const s3Client = new S3Client({ region: REGION });

/**
 * Get the path to the ETag metadata file for a given FST file
 * 
 * @param {string} fileName - FST filename
 * @returns {string} - Path to the .etag file
 */
function getEtagPath(fileName) {
  return join(EFS_MOUNT_DIR, `${fileName}.etag`);
}

/**
 * Read the stored ETag for a file from EFS
 * 
 * @param {string} fileName - FST filename
 * @returns {string|null} - Stored ETag or null if not found
 */
function readStoredEtag(fileName) {
  try {
    const etagPath = getEtagPath(fileName);
    const fs = require('fs');
    if (fs.existsSync(etagPath)) {
      return readFileSync(etagPath, 'utf8').trim();
    }
  } catch (error) {
    console.warn(`Failed to read ETag for ${fileName}:`, error.message);
  }
  return null;
}

/**
 * Store the ETag for a file on EFS
 * 
 * @param {string} fileName - FST filename
 * @param {string} etag - ETag value to store
 */
function storeEtag(fileName, etag) {
  try {
    const etagPath = getEtagPath(fileName);
    writeFileSync(etagPath, etag, 'utf8');
  } catch (error) {
    console.warn(`Failed to store ETag for ${fileName}:`, error.message);
  }
}

/**
 * Get the ETag of an S3 object
 * 
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string|null>} - ETag or null if object doesn't exist
 */
async function getS3Etag(s3Key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });
    
    const response = await s3Client.send(command);
    // ETag may be wrapped in quotes, so we remove them
    return response.ETag ? response.ETag.replace(/"/g, '') : null;
  } catch (error) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Download FST file from S3 to EFS mount point
 * 
 * Checks S3 ETag against stored ETag to detect file updates.
 * Re-downloads if the file doesn't exist locally or if the S3 version is newer.
 * 
 * @param {string} fileName - Exact filename of the FST file (e.g., 'crk-strict-analyzer.hfstol')
 * @returns {Promise<string>} - Path to the local FST file
 */
async function downloadFstFromS3(fileName) {
  const s3Key = `${FSTS_FOLDER}/${fileName}`;
  const localPath = join(EFS_MOUNT_DIR, fileName);
  const fs = require('fs');

  // Ensure EFS directory exists
  await mkdir(EFS_MOUNT_DIR, { recursive: true });

  // Get ETag from S3
  const s3Etag = await getS3Etag(s3Key);
  if (!s3Etag) {
    throw new Error(`FST file not found in S3: ${s3Key}`);
  }

  // Check if file exists locally and compare ETags
  const storedEtag = readStoredEtag(fileName);
  const fileExists = fs.existsSync(localPath);

  // If no stored ETag exists, we need to re-download to create it
  // This handles existing files that were downloaded before ETag tracking was added
  if (!storedEtag) {
    if (fileExists) {
      console.log(`FST file ${fileName} exists but has no ETag. Re-downloading to create ETag...`);
      // Remove old file
      try {
        unlinkSync(localPath);
      } catch (error) {
        console.warn(`Failed to remove old file ${fileName}:`, error.message);
      }
    }
  } else if (fileExists && storedEtag === s3Etag) {
    // File exists and ETags match - use cached version
    return localPath;
  } else if (fileExists && storedEtag !== s3Etag) {
    // File exists but ETag differs - need to update
    console.log(`FST file ${fileName} has been updated in S3 (ETag changed). Re-downloading...`);
    // Remove old file and ETag
    try {
      unlinkSync(localPath);
      const etagPath = getEtagPath(fileName);
      if (fs.existsSync(etagPath)) {
        unlinkSync(etagPath);
      }
    } catch (error) {
      console.warn(`Failed to remove old file ${fileName}:`, error.message);
    }
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const response = await s3Client.send(command);
    const writeStream = createWriteStream(localPath);
    
    await pipeline(response.Body, writeStream);
    
    // Store the ETag for future comparisons
    storeEtag(fileName, s3Etag);
    
    console.log(`Downloaded FST file ${fileName} from S3`);
    return localPath;
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
      throw new Error(`FST file not found: ${s3Key}`);
    }
    throw new Error(`Failed to download FST file ${s3Key}: ${error.message}`);
  }
}

module.exports = {
  downloadFstFromS3,
}

