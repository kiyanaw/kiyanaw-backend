const path = require('path')
const fs = require('fs')
const { getS3FileSize, getS3File, putS3File, efsPath } = require('./s3')
const { runCommand, generateWaveform, processPeaksData } = require('./audio')
const { updateMediaStatus } = require('./dynamo')
const { escapeShellArg } = require('../utils')

const bucket = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME

// TODO: Long videos that exceed this threshold are extracted to audio-only to
// avoid Lambda's 15-minute timeout. The proper fix is to offload transcoding
// for these to a Fargate task so they get a proper compressed video rendition.
//
// Gated on source duration rather than file size — processing time tracks
// video runtime far more closely than bytes on disk. A long, low-bitrate
// recording has many more frames to decode/encode than a short, high-bitrate
// file of the same size, so file size alone is a poor predictor of risk.
const LARGE_VIDEO_DURATION_SECONDS = 30 * 60 // 30 minutes

// Above this, even the audio-only fallback can't download from S3 to EFS within
// Lambda's 15-minute timeout, so we reject without attempting the download at all.
// A production survey of uploaded originals found a handful of legitimate files
// in the 1-5GB range (S3-to-Lambda transfer is fast enough that size alone isn't
// the bottleneck there) alongside a few multi-GB raw camera dumps that are never
// going to work regardless of cap — 5GB draws the line between them.
const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB

const VIDEO_MIME_PREFIXES = ['video/']
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'wmv']

function isVideo(mimeType, ext) {
  if (mimeType && VIDEO_MIME_PREFIXES.some(p => mimeType.startsWith(p))) return true
  return VIDEO_EXTENSIONS.includes(ext.toLowerCase())
}

// Codecs that ffmpeg cannot decode (e.g. Apple spatial audio in iPhone MOVs).
const UNDECODABLE_AUDIO_CODECS = new Set(['apac', 'none'])

// Returns the audio-relative index of the first decodable audio stream, or null
// if the file has no audio or only undecodable streams. Used to build an explicit
// -map flag so ffmpeg doesn't auto-select a high-channel-count undecodable track.
async function selectAudioStream(filePath) {
  return new Promise((resolve) => {
    const { exec } = require('child_process')
    exec(
      `ffprobe -v error -select_streams a -show_entries stream=codec_name -of json ${escapeShellArg(filePath)}`,
      { maxBuffer: 1024 * 64 },
      (error, stdout) => {
        if (error) { resolve(null); return }
        try {
          const { streams } = JSON.parse(stdout)
          if (!streams || streams.length === 0) { resolve(null); return }
          const idx = streams.findIndex(s => s.codec_name && !UNDECODABLE_AUDIO_CODECS.has(s.codec_name))
          resolve(idx >= 0 ? idx : null)
        } catch {
          resolve(null)
        }
      }
    )
  })
}

// Some mp4/m4v uploads are audio-only exports (voice memos, audio-only DaVinci
// Resolve renders) despite the video-looking extension/mimeType. Confirm a video
// stream actually exists before mapping it with -map 0:v:0, which otherwise fails
// outright with "Stream map '0:v:0' matches no streams."
async function hasVideoStream(filePath) {
  return new Promise((resolve) => {
    const { exec } = require('child_process')
    exec(
      `ffprobe -v error -select_streams v -show_entries stream=codec_name -of json ${escapeShellArg(filePath)}`,
      { maxBuffer: 1024 * 64 },
      (error, stdout) => {
        if (error) { resolve(false); return }
        try {
          const { streams } = JSON.parse(stdout)
          resolve(Boolean(streams && streams.length > 0))
        } catch {
          resolve(false)
        }
      }
    )
  })
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
    // 0. Reject outright if the original is too large to download within the
    // Lambda timeout, before spending any time/EFS space on it.
    const remoteSizeBytes = await getS3FileSize(bucket, originalKey)
    if (remoteSizeBytes > MAX_DOWNLOAD_BYTES) {
      throw new Error(
        `Media ${id} originalKey is ${(remoteSizeBytes / 1024 / 1024 / 1024).toFixed(1)} GB, exceeding the ${(MAX_DOWNLOAD_BYTES / 1024 / 1024 / 1024).toFixed(1)} GB download cap`
      )
    }

    // 1. Download original
    await getS3File(bucket, originalKey, `${id}-orig.${ext}`)

    // Probe audio streams before transcoding. iPhones embed an undecodable Apple
    // spatial-audio (apac) track alongside the standard AAC; without an explicit
    // map, ffmpeg auto-selects the highest-channel-count stream and fails.
    const audioIdx = await selectAudioStream(origLocalPath)
    const aMap = audioIdx !== null ? `-map 0:a:${audioIdx}` : ''

    // Confirm the file actually has a video stream before trusting the
    // mimeType/extension — some "video" uploads are audio-only.
    const hasVideo = video && (await hasVideoStream(origLocalPath))
    const sourceDurationSeconds = hasVideo ? await getDuration(origLocalPath) : 0
    const isLargeVideo = hasVideo && sourceDurationSeconds > LARGE_VIDEO_DURATION_SECONDS

    // Large videos are extracted to audio-only to stay within Lambda's timeout.
    // Normal videos transcode to mp4; audio and large-video fallbacks go to mp3.
    const audioOnly = !hasVideo || isLargeVideo
    const renditionExt = audioOnly ? 'mp3' : 'mp4'
    const renditionMimeType = audioOnly ? 'audio/mpeg' : 'video/mp4'
    const renditionLocalPath = `${efsPath}/${id}-rendition.${renditionExt}`
    const renditionKey = `public/renditions/${id}.${renditionExt}`
    const thumbLocalPath = audioOnly ? null : `${efsPath}/${id}-thumb.jpg`
    const thumbnailKey = audioOnly ? null : `public/thumbnails/${id}.jpg`

    // 2. Transcode
    if (isLargeVideo) {
      console.log(`Media ${id} is a long video (${(sourceDurationSeconds / 60).toFixed(0)} min) — extracting audio only`)
      await runCommand(
        `ffmpeg -y -i ${escapeShellArg(origLocalPath)} ${aMap} -vn -c:a libmp3lame -b:a 192k ${escapeShellArg(renditionLocalPath)}`
      )
    } else if (hasVideo) {
      const aCodec = aMap ? '-c:a aac -b:a 128k' : ''
      // superfast trades a bit of compression efficiency for a meaningful speed
      // gain over veryfast, buying more headroom under Lambda's 15-minute timeout.
      // max_muxing_queue_size guards against "Too many packets buffered for
      // output stream" on long, low-bitrate videos where erratic input
      // timestamps make ffmpeg's default interleaving buffer overflow.
      await runCommand(
        `ffmpeg -y -i ${escapeShellArg(origLocalPath)} -map 0:v:0 ${aMap} -dn -c:v libx264 -b:v 1500k -preset superfast -vf scale=-2:720 ${aCodec} -max_muxing_queue_size 9999 ${escapeShellArg(renditionLocalPath)}`
      )
    } else {
      await runCommand(
        `ffmpeg -y -i ${escapeShellArg(origLocalPath)} ${aMap} -vn -c:a libmp3lame -b:a 192k ${escapeShellArg(renditionLocalPath)}`
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
    const updates = { renditionKey, peaksKey, duration, audioOnly: isLargeVideo || (video && !hasVideo) }
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
