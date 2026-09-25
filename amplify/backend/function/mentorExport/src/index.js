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
const { okResponse } = require('./utils')

/**
 * DynamoDB-stream handler on the Export table. A new PENDING row (created by the
 * frontend "Export to Mentor" action) fires this Lambda, which clips every region
 * of the transcription to MP3, bundles them with an import.csv into a zip, uploads
 * the zip to S3, and flips the row to READY (or ERROR).
 *
 * @type {import('@types/aws-lambda').DynamoDBStreamHandler}
 */
exports.handler = async (event) => {
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
