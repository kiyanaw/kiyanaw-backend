const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const { getS3File, putS3File, efsPath } = require('./s3')
const { clipRegion } = require('./ffmpeg')
const { selectExportRegions, buildImportCsv, clipFileName } = require('./csv')
const {
  updateExportStatus,
  getTranscription,
  getMedia,
  getRegionsByTranscription,
} = require('./dynamo')

const bucket = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME

// Update the record's progress at most this often to avoid hammering DynamoDB /
// the stream while clipping hundreds of regions.
const PROGRESS_UPDATE_EVERY = 10

// Resolve the S3 key of the playable rendition for a transcription (audio MP3 or
// video MP4 — both carry an audio track we can clip).
async function resolveRenditionKey(transcriptionId) {
  const transcription = await getTranscription(transcriptionId)
  if (!transcription) {
    throw new Error(`Transcription not found: ${transcriptionId}`)
  }
  if (!transcription.mediaId) {
    throw new Error(`Transcription ${transcriptionId} has no mediaId (legacy source not supported)`)
  }
  const media = await getMedia(transcription.mediaId)
  if (!media || !media.renditionKey) {
    throw new Error(`Media rendition not ready for transcription ${transcriptionId}`)
  }
  return media.renditionKey
}

// Zip the import.csv + clip files into a single archive on EFS.
async function buildZip(zipPath, csvText, clips) {
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', resolve)
    archive.on('error', reject)
    archive.pipe(output)

    archive.append(csvText, { name: 'import.csv' })
    for (const clip of clips) {
      archive.file(clip.localPath, { name: `audio/${clip.fileName}` })
    }
    archive.finalize()
  })
  return zipPath
}

async function run({ id, transcriptionId, speaker }) {
  // Atomic dedupe: only the invocation that flips PENDING -> PROCESSING proceeds.
  try {
    await updateExportStatus(id, 'PROCESSING', { conditionStatus: 'PENDING' })
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log(`Export ${id} already being processed, skipping`)
      return
    }
    throw error
  }

  const zipLocalPath = `${efsPath}/${id}-export.zip`
  const downloadKey = `public/exports/${transcriptionId}.zip`

  try {
    // 1. Resolve + download the rendition once.
    const renditionKey = await resolveRenditionKey(transcriptionId)
    const renditionPath = `${efsPath}/${id}-rendition${path.extname(renditionKey) || '.bin'}`
    await getS3File(bucket, renditionKey, renditionPath)

    // 2. Select the regions we will clip.
    const allRegions = await getRegionsByTranscription(transcriptionId)
    const regions = selectExportRegions(allRegions)
    if (regions.length === 0) {
      throw new Error(`No exportable regions for transcription ${transcriptionId}`)
    }
    await updateExportStatus(id, 'PROCESSING', { total: regions.length, progress: 0 })

    // 3. Clip each region to its own MP3.
    const clips = []
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i]
      const fileName = clipFileName(transcriptionId, i + 1)
      const localPath = `${efsPath}/${id}-clip-${region.id}.mp3`
      await clipRegion(renditionPath, region.start, region.end, localPath)
      clips.push({ fileName, localPath })

      if ((i + 1) % PROGRESS_UPDATE_EVERY === 0) {
        await updateExportStatus(id, 'PROCESSING', { progress: i + 1 }).catch(() => {})
      }
    }

    // 4. Build import.csv + zip.
    const csvText = buildImportCsv(regions, transcriptionId, speaker)
    await buildZip(zipLocalPath, csvText, clips)

    // 5. Upload the zip and mark READY.
    await putS3File(bucket, downloadKey, fs.readFileSync(zipLocalPath), 'application/zip')
    await updateExportStatus(id, 'READY', { downloadKey, progress: regions.length, total: regions.length })

    console.log(`Export ${id} completed: ${regions.length} clips -> ${downloadKey}`)
  } catch (error) {
    console.error(`Error building export ${id}:`, error)
    await updateExportStatus(id, 'ERROR', { error: String(error && error.message ? error.message : error) })
      .catch(e => console.error('Failed to set ERROR status:', e))
    throw error
  } finally {
    // Clean every EFS file this invocation created.
    const prefix = `${id}-`
    for (const f of fs.readdirSync(efsPath).filter(name => name.startsWith(prefix))) {
      try { fs.unlinkSync(`${efsPath}/${f}`) } catch (_) {}
    }
  }
}

module.exports = { run, resolveRenditionKey, buildZip }
