// Pure helpers for the single-region clip resolver — no I/O, unit-tested in
// test/clip-auth.test.js.

// The caller's Cognito identifier from an AppSync resolver `identity`. Transcription
// `author` stores the Cognito userId (username == sub in this user pool), so we accept
// either sub or username.
function callerId(identity) {
  if (!identity) return null
  return (
    identity.sub ||
    (identity.claims && (identity.claims.sub || identity.claims['cognito:username'])) ||
    identity.username ||
    null
  )
}

// Owner-or-public gate: the caller may clip a region if they authored the parent
// transcription, OR the transcription is public (isPrivate === false).
function canClip(transcription, identity) {
  if (!transcription) return false
  if (transcription.isPrivate === false) return true
  const caller = callerId(identity)
  return !!caller && !!transcription.author && transcription.author === caller
}

// Turn free text into a safe, readable filename stem (keeps letters/numbers/space/dash,
// collapses whitespace to single dashes, trims, caps length).
function sanitizeStem(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

// Friendly download filename for a single clip: derived from the region text when
// present, else the region's start time. Always ends in .mp3.
function clipDownloadName(region) {
  const stem = sanitizeStem(region && region.regionText)
  const safe = stem.length > 0 ? stem : `region-${Math.max(0, Math.round((region && region.start) || 0))}s`
  return `${safe}.mp3`
}

// Content-Disposition for a download, per RFC 6266 / 5987. S3 rejects a presigned
// response-content-disposition that isn't ISO-8859-1, so the real (UTF-8) name goes in
// filename* percent-encoded, and filename="" gets an ASCII-only fallback for old clients.
function attachmentDisposition(downloadName, asciiFallback) {
  const ascii = String(downloadName)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._ -]/g, '')
    .replace(/\s+/g, '-')
  const stem = ascii.replace(/\.mp3$/, '').replace(/[-_.]/g, '')
  const fallback = stem.length > 0 ? ascii : asciiFallback
  const encoded = encodeURIComponent(downloadName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

// The disposition for a region clip: real name from the region text, and the
// start-time name as the ASCII fallback when the text has no Latin letters (e.g. syllabics).
function clipDisposition(region) {
  const start = Math.max(0, Math.round((region && region.start) || 0))
  return attachmentDisposition(clipDownloadName(region), `region-${start}s.mp3`)
}

module.exports = { callerId, canClip, sanitizeStem, clipDownloadName, attachmentDisposition, clipDisposition }
