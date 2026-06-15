const path = require('path')
const fs = require('fs')
const { getS3File, putS3File, efsPath } = require('./s3')
const { runCommand, generateWaveform, processPeaksData } = require('./audio')
const { updateMediaStatus } = require('./dynamo')
const { escapeShellArg } = require('../utils')

const bucket = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME

// TODO: Large videos that exceed this threshold are extracted to audio-only
// to avoid Lambda's 15-minute timeout. The proper fix is to offload
// transcoding for large files to a Fargate task so they get a proper
// compressed video rendition.
const LARGE_VIDEO_BYTES = 200 * 1024 * 1024 // 200 MB

const VIDEO_MIME_PREFIXES = ['video/']
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'wmv']

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
  const peaksKey = `public/peaks/${id}.json`

  try {
    // 1. Download original
    await getS3File(bucket, originalKey, `${id}-orig.${ext}`)

    const fileSizeBytes = fs.statSync(origLocalPath).size
    const isLargeVideo = video && fileSizeBytes > LARGE_VIDEO_BYTES

    // Large videos are extracted to audio-only to stay within Lambda's timeout.
    // Normal videos transcode to mp4; audio and large-video fallbacks go to mp3.
    const audioOnly = !video || isLargeVideo
    const renditionExt = audioOnly ? 'mp3' : 'mp4'
    const renditionMimeType = audioOnly ? 'audio/mpeg' : 'video/mp4'
    const renditionLocalPath = `${efsPath}/${id}-rendition.${renditionExt}`
    const renditionKey = `public/renditions/${id}.${renditionExt}`
    const thumbLocalPath = audioOnly ? null : `${efsPath}/${id}-thumb.jpg`
    const thumbnailKey = audioOnly ? null : `public/thumbnails/${id}.jpg`

    // 2. Transcode
    if (isLargeVideo) {
      console.log(`Media ${id} is a large video (${(fileSizeBytes / 1024 / 1024).toFixed(0)} MB) — extracting audio only`)
      await runCommand(
        `ffmpeg -y -i ${escapeShellArg(origLocalPath)} -vn -c:a libmp3lame -b:a 192k ${escapeShellArg(renditionLocalPath)}`
      )
    } else if (video) {
      await runCommand(
        `ffmpeg -y -i ${escapeShellArg(origLocalPath)} -vf scale=-2:720 -c:v libx264 -b:v 1500k -preset veryfast -c:a aac -b:a 128k ${escapeShellArg(renditionLocalPath)}`
      )
    } else {
      await runCommand(
        `ffmpeg -y -i ${escapeShellArg(origLocalPath)} -vn -c:a libmp3lame -b:a 192k ${escapeShellArg(renditionLocalPath)}`
      )
    }

    // 3. Thumbnail (video renditions only)
    if (!audioOnly) {
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
    await putS3File(bucket, renditionKey, fs.readFileSync(renditionLocalPath), renditionMimeType)

    // 7. Upload peaks
    await putS3File(bucket, peaksKey, JSON.stringify(peaksData), 'application/json')

    // 8. Upload thumbnail
    if (video && thumbLocalPath) {
      const thumbBody = fs.readFileSync(thumbLocalPath)
      await putS3File(bucket, thumbnailKey, thumbBody, 'image/jpeg')
    }

    // 9. Mark READY
    const updates = { renditionKey, peaksKey, duration, audioOnly: isLargeVideo }
    if (thumbnailKey) updates.thumbnailKey = thumbnailKey
    await updateMediaStatus(id, 'READY', updates)

    console.log(`Media ${id} processed successfully`)
  } catch (error) {
    console.error(`Error processing media ${id}:`, error)
    await updateMediaStatus(id, 'ERROR', {}).catch(e => console.error('Failed to set ERROR status:', e))
    throw error
  } finally {
    const tmpDir = efsPath
    const prefix = `${tmpDir}/${id}-`
    for (const p of fs.readdirSync(tmpDir).filter(f => f.startsWith(`${id}-`)).map(f => `${tmpDir}/${f}`)) {
      try { fs.unlinkSync(p) } catch (_) {}
    }
  }
}

module.exports = { run }
