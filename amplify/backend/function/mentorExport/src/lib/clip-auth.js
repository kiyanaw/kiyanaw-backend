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

module.exports = { callerId, canClip, sanitizeStem, clipDownloadName }
