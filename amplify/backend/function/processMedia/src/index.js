/* Amplify Params - DO NOT EDIT
	API_KIYANAW_GRAPHQLAPIENDPOINTOUTPUT
	API_KIYANAW_GRAPHQLAPIIDOUTPUT
	API_KIYANAW_MEDIATABLE_ARN
	API_KIYANAW_MEDIATABLE_NAME
	ENV
	REGION
	STORAGE_TRANSCRIPTIONS_BUCKETNAME
Amplify Params - DO NOT EDIT */

process.env.PATH = process.env.PATH + ':' + '/opt/nodejs/bin'

const { run } = require('./lib/media')
const { okResponse } = require('./utils')

/**
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
    const status = image.status && image.status.S
    const originalKey = image.originalKey && image.originalKey.S
    const mimeType = (image.mimeType && image.mimeType.S) || ''

    if (!id || !originalKey) {
      console.warn('Missing id or originalKey, skipping')
      continue
    }

    if (status !== 'PENDING') {
      console.log(`Skipping record ${id} with status ${status}`)
      continue
    }

    try {
      await run({ id, originalKey, mimeType })
    } catch (error) {
      console.error(`Failed to process media ${id}:`, error)
    }
  }

  return okResponse()
}
