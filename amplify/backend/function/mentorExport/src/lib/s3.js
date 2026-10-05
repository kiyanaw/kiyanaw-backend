const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const fs = require('fs')

const s3Client = new S3Client({ region: process.env.REGION })

// Lambda ephemeral storage (sized to 10 GB in the CFN template). Unlike processMedia
// we don't mount EFS — one rendition + its clips + the zip fit comfortably in /tmp.
const efsPath = '/tmp'

const getS3File = async (bucket, key, localPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const file = fs.createWriteStream(localPath)
      file.on('close', () => resolve(localPath))
      file.on('error', reject)
      const data = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      data.Body.pipe(file)
    } catch (error) {
      console.log('Error getting file from S3:', error)
      reject(error)
    }
  })
}

const putS3File = async (bucket, key, body, contentType = 'application/octet-stream') => {
  console.log(`Putting object to S3, bucket: ${bucket}, key: ${key}`)
  return s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    CacheControl: 'max-age=0',
    ContentType: contentType,
  }))
}

/**
 * Presigned GET URL for a clip, forcing a download with a friendly filename via
 * Content-Disposition. Short TTL — the object is also swept by an S3 lifecycle rule.
 */
const presignGetUrl = async (bucket, key, downloadName, expiresSeconds = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${downloadName}"`,
    ResponseContentType: 'audio/mpeg',
  })
  return getSignedUrl(s3Client, command, { expiresIn: expiresSeconds })
}

module.exports = { getS3File, putS3File, presignGetUrl, efsPath }
