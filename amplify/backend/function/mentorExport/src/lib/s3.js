const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
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

module.exports = { getS3File, putS3File, efsPath }
