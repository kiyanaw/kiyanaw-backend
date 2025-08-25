const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const fs = require('fs')

const s3Client = new S3Client({ region: process.env.REGION })
const efsPath = '/mnt/temp'

/**
 * Download a file from S3 to EFS
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @param {string} filename - Local filename to save as
 * @returns {Promise<object>} - File stream object
 */
const getS3File = async (bucket, key, filename) => {
  return new Promise(async (resolve, reject) => {
    const params = {
      Bucket: bucket,
      Key: key
    }
    
    try {
      const file = fs.createWriteStream(`${efsPath}/${filename}`)
      
      file.on("close", function() {
        resolve(file)
      })
      
      file.on("error", function(error) {
        reject(error)
      })
      
      const data = await s3Client.send(new GetObjectCommand(params))
      data.Body.pipe(file)
    } catch (error) {
      console.log('Error getting file from S3:', error)
      reject(error)
    }
  })
}

/**
 * Upload a file to S3
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @param {string} body - File content
 * @returns {Promise<object>} - Upload response
 */
const putS3File = async (bucket, key, body) => {
  console.log(`Putting object to S3, bucket: ${bucket}, key: ${key}`)
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    CacheControl: 'max-age=0',
    ContentType: 'application/json'
  }
  return await s3Client.send(new PutObjectCommand(params))
}

/**
 * Check if a file exists in S3
 * @param {string} bucket - S3 bucket name
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} - True if file exists, false otherwise
 */
const fileExists = async (bucket, key) => {
  try {
    await s3Client.send(new HeadObjectCommand({ Key: key, Bucket: bucket }))
    return true
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

module.exports = {
  getS3File,
  putS3File,
  fileExists,
  efsPath
}
