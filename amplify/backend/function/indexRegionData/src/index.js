/* Amplify Params - DO NOT EDIT
	API_KIYANAW_GRAPHQLAPIIDOUTPUT
	API_KIYANAW_REGIONTABLE_ARN
	API_KIYANAW_REGIONTABLE_NAME
	API_KIYANAW_TRANSCRIPTIONTABLE_ARN
	API_KIYANAW_TRANSCRIPTIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

const dynamo = require('./lib/dynamo')
const search = require('./lib/search')

const { okResponse } = require('./utils')

exports.handler = async (event) => {
  const record = event.Records[0]
  console.log('record', JSON.stringify(record))

  // Get table names from environment variables
  const transcriptionTable = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME
  const regionTable = process.env.API_KIYANAW_REGIONTABLE_NAME

  if (!transcriptionTable || !regionTable) {
    console.error('Missing table name environment variables')
    return okResponse()
  }

  if (!(record && record.body)) {
    return okResponse()
  }

  const regionId = record.body
  console.log('Processing region', regionId)

  let region
  try {
    region = await dynamo.getDoc({
      TableName: regionTable,
      Key: {
        id: regionId,
      },
    })
  } catch (err) {
    console.error('Error getting region', err)
    return okResponse()
  }

  // TODO: test this
  if (!region) {
    console.warn('Region not found', regionId)
    return okResponse()
  }

  region = region.Item
  console.log('Got region', region)

  // get transcription
  let transcription
  try {
    // work around the Lambda syntax error
    transcription = await dynamo.getDoc({
      TableName: transcriptionTable,
      Key: {
        id: region.transcriptionId,
      },
    })
  } catch (err) {
    console.error('Error getting transcription', err)
    return okResponse()
  }

  if (!transcription) {
    console.warn('Transcription not found', region.transcriptionId)
    return okResponse()
  }

  transcription = transcription.Item
  console.log('transcription', transcription)

  if (transcription.isPrivate) {
    console.log('Not processing transcription, isPrivate = true')
    return okResponse()
  }

  if (!transcription.lang) {
    console.log('Not processing transcription, no lang')
    return okResponse()
  }

  /**
   * Delete words for region
   */
  const deleted = await search.clearKnownWordsForRegion(region.id)
  console.log('Deleted', deleted)

  /**
   * Index region analysis words
   */
  const indexedWords = await search.indexRegionAnalysis(region, transcription)
  console.log('Indexed', indexedWords)

  /**
   * Process issues
   */
  // TODO

  /**
   * Notify of region changes
   */
  // TODO

  return okResponse()
}
