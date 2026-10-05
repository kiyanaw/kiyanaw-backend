const path = require('path')
const fs = require('fs')
const { getS3File, putS3File, presignGetUrl, efsPath } = require('./s3')
const { clipRegion } = require('./ffmpeg')
const { getRegion, getTranscription, getMedia } = require('./dynamo')
const { canClip, clipDownloadName } = require('./clip-auth')

const bucket = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME

// Presigned URL lifetime. The clip object is also swept by an S3 lifecycle rule on the
// public/region-clips/ prefix, so nothing accumulates.
const CLIP_URL_TTL_SECONDS = 3600

/**
 * Resolver for Query.regionClipUrl(regionId): authorize (owner-or-public), clip the one
 * region from the rendition, upload it, and return a short-lived presigned MP3 URL.
 * Throws on missing data / auth failure so AppSync returns a GraphQL error.
 */
async function clipOne({ regionId, identity }) {
  if (!regionId) throw new Error('regionId is required')

  const region = await getRegion(regionId)
  if (!region) throw new Error('Region not found')

  const transcription = await getTranscription(region.transcriptionId)
  if (!transcription) throw new Error('Transcription not found')

  if (!canClip(transcription, identity)) {
    throw new Error('Unauthorized')
  }

  if (!transcription.mediaId) throw new Error('Transcription has no media')
  const media = await getMedia(transcription.mediaId)
  if (!media || !media.renditionKey) throw new Error('Media rendition not ready')

  const ext = path.extname(media.renditionKey) || '.bin'
  // Key the cached rendition by mediaId so repeated snips on a warm container reuse it.
  const renditionPath = `${efsPath}/rendition-${transcription.mediaId}${ext}`
  const clipPath = `${efsPath}/clip-${regionId}.mp3`
  const clipKey = `public/region-clips/${transcription.id}/${regionId}.mp3`

  try {
    if (!fs.existsSync(renditionPath)) {
      await getS3File(bucket, media.renditionKey, renditionPath)
    }
    await clipRegion(renditionPath, region.start, region.end, clipPath)
    await putS3File(bucket, clipKey, fs.readFileSync(clipPath), 'audio/mpeg')
    return presignGetUrl(bucket, clipKey, clipDownloadName(region), CLIP_URL_TTL_SECONDS)
  } finally {
    // Remove the per-clip file; keep the cached rendition for warm reuse.
    try { fs.unlinkSync(clipPath) } catch (_) {}
  }
}

module.exports = { clipOne }
