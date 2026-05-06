const s3 = require('./s3')
const audio = require('./audio')
const { parseS3Url } = require('../utils')

/**
 * Process a media file to generate peaks data
 * @param {string} url - S3 URL of the media file
 * @returns {Promise<object>} - Processing result
 */
const processPeaksFile = async (url) => {
  console.log(`Processing peaks for URL: ${url}`)
  
  // Parse the S3 URL
  const { bucket, key, filename, filebits } = parseS3Url(url)
  
  // Check if peaks file already exists
  const jsonKey = `${key}.json`
  const peaksExist = await s3.fileExists(bucket, jsonKey)
  if (peaksExist) {
    console.log('Peaks file already exists, skipping processing')
    return { success: true, message: 'Peaks file already exists' }
  }
  
  // Download the file from S3
  let file
  try {
    file = await s3.getS3File(bucket, key, filename)
  } catch (error) {
    console.log('Could not get file from S3:', error)
    throw new Error(`Failed to download file from S3: ${error.message}`)
  }
  
  const originalPath = file.path
  let pathToAudio = originalPath
  const filesToCleanup = [originalPath]
  
  try {
    console.log(`Path to downloaded file: ${pathToAudio}`)
    
    // Extract audio if it's a video file
    if (audio.isVideoFormat(filebits[1])) {
      const newFileName = `${s3.efsPath}/audio-${Date.now()}.mp3`
      pathToAudio = await audio.extractAudioFromVideo(pathToAudio, newFileName)
      filesToCleanup.push(pathToAudio)
    }
    
    // Generate waveform data
    const jsonPath = await audio.generateWaveform(pathToAudio)
    filesToCleanup.push(jsonPath)
    filesToCleanup.push(`${pathToAudio}.dat`)
    
    // Process the peaks data
    const processedPeaks = await audio.processPeaksData(jsonPath)
    
    // Upload the processed peaks to S3
    const result = await s3.putS3File(bucket, jsonKey, JSON.stringify(processedPeaks))
    console.log('Peaks file uploaded successfully:', result)
    
    return { success: true, result }
    
  } catch (error) {
    console.error('Error processing peaks:', error)
    
    // Upload error information to S3
    const errorPayload = {
      error: error.message,
      timestamp: new Date().toISOString(),
      url: url
    }
    
    try {
      await s3.putS3File(bucket, jsonKey, JSON.stringify(errorPayload))
    } catch (uploadError) {
      console.error('Failed to upload error payload:', uploadError)
    }
    
    throw error
  } finally {
    // Clean up temporary files
    await audio.cleanupFiles(filesToCleanup)
  }
}

/**
 * Extract URL from DynamoDB or SQS record
 * @param {object} record - DynamoDB or SQS record
 * @returns {string|null} - Extracted URL or null
 */
const extractUrlFromRecord = (record) => {
  if (record.dynamodb) {
    // DynamoDB record
    if (record.dynamodb.NewImage) {
      return record.dynamodb.NewImage.source?.S ?? null
    } else if (record.dynamodb.OldImage) {
      return record.dynamodb.OldImage.source?.S ?? null
    }
  } else {
    // SQS record
    return record.body
  }
  
  return null
}

module.exports = {
  processPeaksFile,
  extractUrlFromRecord
}
