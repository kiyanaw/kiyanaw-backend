/* Amplify Params - DO NOT EDIT
	API_KIYANAW_GRAPHQLAPIENDPOINTOUTPUT
	API_KIYANAW_GRAPHQLAPIIDOUTPUT
	API_KIYANAW_EXPORTTABLE_ARN
	API_KIYANAW_EXPORTTABLE_NAME
	API_KIYANAW_REGIONTABLE_NAME
	API_KIYANAW_TRANSCRIPTIONTABLE_NAME
	API_KIYANAW_MEDIATABLE_NAME
	ENV
	REGION
	STORAGE_TRANSCRIPTIONS_BUCKETNAME
Amplify Params - DO NOT EDIT */

// ffmpeg lives on the same layer used by processMedia (/opt/nodejs/bin).
process.env.PATH = process.env.PATH + ':' + '/opt/nodejs/bin'

const { run } = require('./lib/export')
const { clipOne } = require('./lib/clip-one')
const { okResponse } = require('./utils')

/**
 * This Lambda serves two callers:
 *
 * 1. **AppSync @function resolver** for `Query.regionClipUrl(regionId)` — clips a single
 *    region on demand and returns a short-lived presigned MP3 URL (returns the string
 *    directly; throws on auth failure so AppSync surfaces a GraphQL error).
 * 2. **DynamoDB-stream handler** on the Export table — a new PENDING row (the "Export to
 *    Mentor" action) fires the full-bundle flow (clip every region → import.csv → zip).
 *
 * @type {import('@types/aws-lambda').Handler}
 */
exports.handler = async (event) => {
  // 1. AppSync single-region clip resolver.
  if (event && event.fieldName === 'regionClipUrl') {
    return clipOne({
      regionId: event.arguments && event.arguments.regionId,
      identity: event.identity,
    })
  }

  // 2. DynamoDB-stream Mentor bundle export.
  console.log(`EVENT: ${JSON.stringify(event)}`)

  for (const record of event.Records) {
    if (record.eventName === 'REMOVE') {
      continue
    }

    const image = record.dynamodb && record.dynamodb.NewImage
    if (!image) {
      console.warn('No NewImage in record, skipping')
      continue
    }

    const id = image.id && image.id.S
    const transcriptionId = image.transcriptionId && image.transcriptionId.S
    const status = image.status && image.status.S
    const speaker = (image.speaker && image.speaker.S) || ''

    if (!id || !transcriptionId) {
      console.warn('Missing id or transcriptionId, skipping')
      continue
    }

    // Only act on freshly-created PENDING rows. Our own PROCESSING/READY/ERROR
    // updates re-enter the stream and must be ignored.
    if (status !== 'PENDING') {
      console.log(`Skipping export ${id} with status ${status}`)
      continue
    }

    try {
      await run({ id, transcriptionId, speaker })
    } catch (error) {
      console.error(`Failed to process export ${id}:`, error)
    }
  }

  return okResponse()
}
