// Classifies a requested S3 key into the record that owns it.
//
// Keys the app asks mediaAccess to sign (src/services/transcriptionService.ts, exportService.ts):
//   originals/<mediaId>.<ext>        Media.originalKey, uploads before identity folders (portal still writes these)
//   originals/<identityId>/<mediaId>.<ext>  Media.originalKey, uploader's Cognito identity folder
//   renditions/<mediaId>.<mp3|mp4>   Media.renditionKey (editor playback)
//   peaks/<mediaId>.json             Media.peaksKey     (editor waveform)
//   thumbnails/<mediaId>.jpg         Media.thumbnailKey
//   exports/<transcriptionId>.zip    Mentor export zip  (Export.downloadKey)
//   <legacy key>[.json]              Transcription.source (pre-Media uploads) and its peaks file
// Keys may arrive with or without the leading "public/" and percent-encoded.

const MEDIA_PREFIXES = ['originals', 'renditions', 'peaks', 'thumbnails']
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
// Cognito identity-pool id, e.g. us-east-1:0f1e2d3c-...; the S3 folder the uploader's IAM policy is scoped to.
const IDENTITY_ID = `[a-z]{2}(?:-[a-z]+)+-[0-9]:${UUID}`
const MEDIA_RE = new RegExp(`^(${MEDIA_PREFIXES.join('|')})/(${UUID})\\.[A-Za-z0-9]+$`)
const NESTED_ORIGINAL_RE = new RegExp(`^originals/${IDENTITY_ID}/(${UUID})\\.[A-Za-z0-9]+$`)
const EXPORT_RE = new RegExp(`^exports/(${UUID})\\.zip$`)

/**
 * Decodes each path segment once. Returns null for malformed encoding.
 * @param {string} key
 * @returns {string|null}
 */
function decodeKey(key) {
  try {
    return key.split('/').map((segment) => decodeURIComponent(segment)).join('/')
  } catch {
    return null
  }
}

/**
 * @param {unknown} rawKey - the s3Key from the request body
 * @returns {{kind: 'media', mediaId: string, objectKey: string}
 *   | {kind: 'export', transcriptionId: string, objectKey: string}
 *   | {kind: 'legacy', objectKey: string, sourceKeys: string[]}
 *   | null} null when the key can never be signed
 */
function classifyKey(rawKey) {
  if (typeof rawKey !== 'string' || rawKey.length === 0 || rawKey.length > 1024) return null

  const decoded = decodeKey(rawKey)
  if (decoded === null) return null

  const relative = decoded.startsWith('public/') ? decoded.slice('public/'.length) : decoded
  const segments = relative.split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null

  const objectKey = `public/${relative}`

  const media = MEDIA_RE.exec(relative)
  if (media) return { kind: 'media', mediaId: media[2], objectKey }

  // The caller still only gets a URL when objectKey === Media.originalKey (see access.js).
  const nested = NESTED_ORIGINAL_RE.exec(relative)
  if (nested) return { kind: 'media', mediaId: nested[1], objectKey }

  const exp = EXPORT_RE.exec(relative)
  if (exp) return { kind: 'export', transcriptionId: exp[1], objectKey }

  // Known prefixes that never fall back to legacy lookup (region clips are signed by mentorExport).
  if ([...MEDIA_PREFIXES, 'exports', 'region-clips'].includes(segments[0])) return null

  // Legacy transcription: the key is the object named by Transcription.source,
  // or its peaks file `<source key>.json`.
  const sourceKeys = relative.endsWith('.json') ? [relative, relative.slice(0, -'.json'.length)] : [relative]
  return { kind: 'legacy', objectKey, sourceKeys }
}

/**
 * Extracts the decoded key (relative to public/) from a legacy Transcription.source URL.
 * @param {unknown} source - e.g. https://bucket.s3.amazonaws.com/public/1600000000-file.mp3
 * @returns {string|null}
 */
function sourceUrlToKey(source) {
  if (typeof source !== 'string') return null
  const marker = '/public/'
  const idx = source.indexOf(marker)
  if (idx === -1) return null
  const tail = source.slice(idx + marker.length).split(/[?#]/)[0]
  return decodeKey(tail)
}

module.exports = { classifyKey, sourceUrlToKey }
