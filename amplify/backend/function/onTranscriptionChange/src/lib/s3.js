const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3')

const s3Client = new S3Client({ region: process.env.REGION })

/**
 * Extract S3 key from full S3 URL
 * @param {string} s3Url - Full S3 URL like https://bucket.s3.amazonaws.com/path/file.mp4
 * @returns {string|null} - S3 key or null if invalid URL
 */
const extractS3Key = (s3Url) => {
  if (!s3Url || typeof s3Url !== 'string') {
    return null
  }

  try {
    const url = new URL(s3Url)
    // Remove leading slash from pathname
    return url.pathname.substring(1)
  } catch (error) {
    console.error('Invalid S3 URL:', s3Url, error)
    return null
  }
}

/**
 * Delete an S3 object. Exported separately so tests can stub it at the module level.
 * @param {{ Bucket: string, Key: string }} params
 * @returns {Promise<object>}
 */
const deleteObject = async (params) => {
  return s3Client.send(new DeleteObjectCommand(params))
}

/**
 * Delete a file from S3
 * @param {string} bucketName - S3 bucket name
 * @param {string} key - S3 object key
 * @returns {Promise<object>} - Deletion response
 */
const deleteFile = async (bucketName, key) => {
  const params = {
    Bucket: bucketName,
    Key: key
  }

  console.log(`Deleting S3 object: s3://${bucketName}/${key}`)

  try {
    // Call through module.exports so sinon stubs applied to the export are honoured
    const result = await module.exports.deleteObject(params)
    console.log(`Successfully deleted: s3://${bucketName}/${key}`)
    return result
  } catch (error) {
    console.error(`Error deleting s3://${bucketName}/${key}:`, error.message)
    throw error
  }
}

/**
 * Delete transcription files from S3 (media file and associated JSON)
 * @param {string} sourceUrl - The source URL from transcription.source
 * @returns {Promise<object[]>} - Array of deletion results
 */
const deleteTranscriptionFiles = async (sourceUrl) => {
  const bucketName = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME

  if (!bucketName) {
    throw new Error('STORAGE_TRANSCRIPTIONS_BUCKETNAME environment variable not set')
  }

  if (!sourceUrl) {
    console.log('No source URL provided, skipping S3 deletion')
    return []
  }

  const key = extractS3Key(sourceUrl)
  if (!key) {
    console.warn('Could not extract S3 key from source URL:', sourceUrl)
    return []
  }

  const deletionPromises = []

  // Delete the main media file
  deletionPromises.push(deleteFile(bucketName, key))

  // Delete the associated JSON file (e.g., foo.mp4 -> foo.mp4.json)
  const jsonKey = `${key}.json`
  deletionPromises.push(deleteFile(bucketName, jsonKey))

  try {
    const results = await Promise.allSettled(deletionPromises)

    // Log results
    results.forEach((result, index) => {
      const fileType = index === 0 ? 'media' : 'JSON'
      if (result.status === 'fulfilled') {
        console.log(`${fileType} file deletion successful`)
      } else {
        console.error(`${fileType} file deletion failed:`, result.reason.message)
      }
    })

    return results
  } catch (error) {
    console.error('Unexpected error during S3 deletion:', error)
    throw error
  }
}

module.exports = {
  deleteTranscriptionFiles,
  deleteFile,
  deleteObject,
  extractS3Key
}
