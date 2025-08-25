/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_TRANSCRIPTIONS_BUCKETNAME
Amplify Params - DO NOT EDIT */

process.env.PATH = process.env.PATH + ':' + '/opt/nodejs/bin'

const peaks = require('./lib/peaks')
const { okResponse } = require('./utils')

/**
 * @type {import('@types/aws-lambda').DynamoDBStreamHandler | import('@types/aws-lambda').SQSEventHandler}
 */
exports.handler = async (event, context) => {
  console.log(`EVENT: ${JSON.stringify(event)}`)
  
  for (const record of event.Records) {
    console.log('Processing record:', record.eventID || record.messageId)
    console.log('Event name:', record.eventName)
    
    // Handle REMOVE events (deletions)
    if (record.eventName === 'REMOVE') {
      console.log('Record deleted, skipping processing')
      continue
    }
    
    // Extract URL from the record
    const url = peaks.extractUrlFromRecord(record)
    if (!url) {
      console.warn('No URL found in record, skipping')
      continue
    }
    
    console.log(`Processing URL: ${url}`)
    
    try {
      const result = await peaks.processPeaksFile(url)
      console.log('Peaks processing completed:', result)
    } catch (error) {
      console.error('Error processing peaks:', error)
      // Continue processing other records even if one fails
    }
  }
  
  return okResponse()
}
