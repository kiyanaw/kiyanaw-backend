const path = require('path')
const fs = require('fs')
const { getS3File, putS3File, efsPath } = require('./s3')
const { runCommand, generateWaveform, processPeaksData } = require('./audio')
const { updateMediaStatus } = require('./dynamo')
const { escapeShellArg } = require('../utils')

const bucket = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME

const VIDEO_MIME_PREFIXES = ['video/']
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm']

function isVideo(mimeType, ext) {
  if (mimeType && VIDEO_MIME_PREFIXES.some(p => mimeType.startsWith(p))) return true
  return VIDEO_EXTENSIONS.includes(ext.toLowerCase())
}

async function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process')
    exec(
      `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 ${escapeShellArg(filePath)}`,
      (error, stdout) => {
        if (error) return reject(error)
        resolve(parseFloat(stdout.trim()) || 0)
      }
    )
  })
}

async function run({ id, originalKey, mimeType }) {
  // Atomic dedupe: skip if another invocation already claimed this record
  try {
    await updateMediaStatus(id, 'PROCESSING', { conditionStatus: 'PENDING' })
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log(`Media ${id} already being processed, skipping`)
      return
    }
    throw error
  }

  const ext = path.extname(originalKey).slice(1).toLowerCase()
  const video = isVideo(mimeType, ext)
  const origLocalPath = `${efsPath}/${id}-orig.${ext}`
  const renditionExt = video ? 'mp4' : 'mp3'
  const renditionLocalPath = `${efsPath}/${id}-rendition.${renditionExt}`
  const thumbLocalPath = video ? `${efsPath}/${id}-thumb.jpg` : null

  // Derive S3 key layout: originals/<userId>/<mediaId>.<ext> → renditions/...
  const keyParts = originalKey.split('/')
  const userId = keyParts[1] || 'unknown'
  const renditionKey = `renditions/${userId}/${id}.${renditionExt}`
  const peaksKey = `peaks/${userId}/${id}.json`
  const thumbnailKey = video ? `thumbnails/${userId}/${id}.jpg` : null

  try {
    // 1. Download original
    await getS3File(bucket, originalKey, `${id}-orig.${ext}`)

    // 2. Transcode
    if (video) {
      await runCommand(
        `ffmpeg -y -i ${escapeShellArg(origLocalPath)} -vf scale=-2:720 -c:v libx264 -b:v 1500k -preset medium -c:a aac -b:a 128k ${escapeShellArg(renditionLocalPath)}`
      )
    } else {
      await runCommand(
        `ffmpeg -y -i ${escapeShellArg(origLocalPath)} -vn -c:a libmp3lame -b:a 192k ${escapeShellArg(renditionLocalPath)}`
      )
    }

    // 3. Thumbnail (video only)
    if (video) {
      const duration = await getDuration(renditionLocalPath)
      const seekTime = duration >= 1 ? '00:00:01' : '00:00:00'
      await runCommand(
        `ffmpeg -y -ss ${seekTime} -i ${escapeShellArg(renditionLocalPath)} -frames:v 1 -q:v 5 ${escapeShellArg(thumbLocalPath)}`
      )
    }

    // 4. Peaks
    const peaksJsonPath = await generateWaveform(renditionLocalPath)
    const peaksData = await processPeaksData(peaksJsonPath)

    // 5. Duration
    const duration = await getDuration(renditionLocalPath)

    // 6. Upload rendition
    const renditionBody = fs.readFileSync(renditionLocalPath)
    await putS3File(bucket, renditionKey, renditionBody, video ? 'video/mp4' : 'audio/mpeg')

    // 7. Upload peaks
    await putS3File(bucket, peaksKey, JSON.stringify(peaksData), 'application/json')

    // 8. Upload thumbnail
    if (video && thumbLocalPath) {
      const thumbBody = fs.readFileSync(thumbLocalPath)
      await putS3File(bucket, thumbnailKey, thumbBody, 'image/jpeg')
    }

    // 9. Mark READY
    const updates = { renditionKey, peaksKey, duration }
    if (thumbnailKey) updates.thumbnailKey = thumbnailKey
    await updateMediaStatus(id, 'READY', updates)

    console.log(`Media ${id} processed successfully`)
  } catch (error) {
    console.error(`Error processing media ${id}:`, error)
    await updateMediaStatus(id, 'ERROR', {}).catch(e => console.error('Failed to set ERROR status:', e))
    throw error
  } finally {
    // Clean up temp files
    for (const p of [origLocalPath, renditionLocalPath, thumbLocalPath, `${renditionLocalPath}.wav`, `${renditionLocalPath}.json`]) {
      if (p && fs.existsSync(p)) {
        try { fs.unlinkSync(p) } catch (_) {}
      }
    }
  }
}

module.exports = { run }
