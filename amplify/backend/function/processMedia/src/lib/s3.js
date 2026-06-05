const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3')
const fs = require('fs')

const s3Client = new S3Client({ region: process.env.REGION })
const efsPath = '/mnt/temp'

const getS3File = async (bucket, key, filename) => {
  return new Promise(async (resolve, reject) => {
    const params = { Bucket: bucket, Key: key }
    try {
      const file = fs.createWriteStream(`${efsPath}/${filename}`)
      file.on('close', () => resolve(file))
      file.on('error', reject)
      const data = await s3Client.send(new GetObjectCommand(params))
      data.Body.pipe(file)
    } catch (error) {
      console.log('Error getting file from S3:', error)
      reject(error)
    }
  })
}

const putS3File = async (bucket, key, body, contentType = 'application/octet-stream') => {
  console.log(`Putting object to S3, bucket: ${bucket}, key: ${key}`)
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    CacheControl: 'max-age=0',
    ContentType: contentType,
  }
  return s3Client.send(new PutObjectCommand(params))
}

module.exports = { getS3File, putS3File, efsPath }
