const dynamo = require('./lib/dynamo')
const search = require('./lib/search')

const { okResponse } = require('./utils')

exports.handler = async (event) => {
  const record = event.Records[0]
  console.log('record', JSON.stringify(record))

  // select the db
  let tables = dynamo.config.prod
  const transcriptionTable = tables.transcriptionTable
  const regionTable = tables.regionTable

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

  // TODO: test this
  if (!transcription) {
    console.warn('Transcription not found', region.transcriptionId)
    return okResponse()
  }

  transcription = transcription.Item
  console.log('transcription', transcription)

  if (transcription.isPrivate || transcription.disableAnalyzer) {
    console.log('Not processing transcription')
    return okResponse()
  }

  /**
   * Delete words for region
   */
  const deleted = await search.clearKnownWordsForRegion(region.id)
  console.log('Deleted', deleted)

  /**
   * Parse known words from region
   */
  const indexedWords = await search.indexKnownWords(region, transcription)
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
