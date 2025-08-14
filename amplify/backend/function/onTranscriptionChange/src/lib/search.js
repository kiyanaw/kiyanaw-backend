const { client } = require('./es')

/**
 * Delete all known words for a specific transcription from OpenSearch
 * @param {string} transcriptionId - The transcription ID to delete
 * @returns {Promise<object>} - The deletion response
 */
const clearKnownWordsForTranscription = async (transcriptionId) => {
  const indexName = `knownwords-${process.env.ENV}`
  console.log('Clearing out transcription items for', transcriptionId, 'in index', indexName)
  
  const deleted = await client.deleteByQuery({
    index: indexName,
    body: {
      query: {
        match: { transcriptionId: transcriptionId },
      },
    },
  })
  
  return deleted
}

/**
 * Delete all issues for a specific transcription from OpenSearch
 * @param {string} transcriptionId - The transcription ID to delete
 * @returns {Promise<object>} - The deletion response
 */
const clearIssuesForTranscription = async (transcriptionId) => {
  const indexName = `issues-${process.env.ENV}`
  console.log('Clearing out issue items for', transcriptionId, 'in index', indexName)
  
  const deleted = await client.deleteByQuery({
    index: indexName,
    body: {
      query: {
        match: { transcriptionId: transcriptionId },
      },
    },
  })
  
  return deleted
}

module.exports = {
  clearKnownWordsForTranscription,
  clearIssuesForTranscription,
}