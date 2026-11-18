// Decides whether a verified caller may get a signed URL for a key.
// Rules mirror the getTranscription / getMedia response resolvers
// (amplify/backend/api/kiyanaw/resolvers/Query.get{Transcription,Media}.res.vtl), plus Admins.
const { classifyKey } = require('./keys')

const ADMIN_GROUP = 'Admins'

const has = (list, value) => Array.isArray(list) && list.includes(value)
const intersects = (list, groups) => Array.isArray(list) && list.some((g) => groups.includes(g))

/** Grants that need only the caller's sub. */
function grantsBySub(record, sub) {
  return record.author === sub || record.owner === sub || has(record.editors, sub) || has(record.viewers, sub)
}

/** Grants that need the caller's Cognito groups. */
function grantsByGroups(record, groups) {
  return groups.includes(ADMIN_GROUP) || intersects(record.editorGroups, groups) || intersects(record.viewerGroups, groups)
}

/**
 * @param {ReturnType<import('./records').createRecords>} records
 */
function createAuthorizer(records) {
  /**
   * @param {{rawKey: unknown, sub: string}} req
   * @returns {Promise<{allowed: boolean, reason: string, objectKey: string|null}>}
   */
  return async function authorize({ rawKey, sub }) {
    const target = classifyKey(rawKey)
    if (!target) return { allowed: false, reason: 'unknown-key', objectKey: null }
    const { objectKey } = target

    // Transcriptions: a non-private one is readable by any signed-in user.
    // Media records have no isPrivate flag, so they always need an ACL match.
    let transcriptions = []
    let mediaRecords = []
    if (target.kind === 'media') {
      const media = await records.getMedia(target.mediaId)
      const keys = media ? [media.originalKey, media.renditionKey, media.peaksKey, media.thumbnailKey] : []
      if (!keys.includes(objectKey)) return { allowed: false, reason: 'no-record', objectKey }
      mediaRecords = [media]
      transcriptions = await records.transcriptionsByMedia(target.mediaId)
    } else if (target.kind === 'export') {
      const t = await records.getTranscription(target.transcriptionId)
      transcriptions = t ? [t] : []
    } else {
      transcriptions = await records.transcriptionsBySourceKeys(target.sourceKeys)
    }

    if (mediaRecords.length === 0 && transcriptions.length === 0) {
      return { allowed: false, reason: 'no-record', objectKey }
    }
    if (transcriptions.some((t) => t.isPrivate !== true)) return { allowed: true, reason: 'public', objectKey }

    const all = [...transcriptions, ...mediaRecords]
    if (all.some((r) => grantsBySub(r, sub))) return { allowed: true, reason: 'acl', objectKey }

    const groups = await records.groupsForUser(sub)
    if (all.some((r) => grantsByGroups(r, groups))) return { allowed: true, reason: 'group', objectKey }

    return { allowed: false, reason: 'private', objectKey }
  }
}

module.exports = { createAuthorizer }
