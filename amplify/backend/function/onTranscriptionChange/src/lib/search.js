const { client } = require('./es')

/**
 * Delete all known words for a specific transcription from OpenSearch
 * @param {string} transcriptionId - The transcription ID to delete
 * @returns {Promise<object>} - The deletion response
 */
const clearKnownWordsForTranscription = async (transcriptionId) => {
  const indexName = `knownwords-${process.env.ENV}`
  console.log('Clearing out transcription items for', transcriptionId, 'in index', indexName)
  
  try {
    const deleted = await client.deleteByQuery({
      index: indexName,
      body: {
        query: {
          match: { transcriptionId: transcriptionId },
        },
      },
    })
    
    return deleted
  } catch (error) {
    // Handle index not found error gracefully - this happens on first run
    if (error.meta?.statusCode === 404 && error.meta?.body?.error?.type === 'index_not_found_exception') {
      console.log(`ℹ️ Index ${indexName} doesn't exist yet - will be created on first indexing operation`)
      return { deleted: 0 }
    }
    // Re-throw other errors
    throw error
  }
}

/**
 * Delete all issues for a specific transcription from OpenSearch
 * @param {string} transcriptionId - The transcription ID to delete
 * @returns {Promise<object>} - The deletion response
 */
const clearIssuesForTranscription = async (transcriptionId) => {
  const indexName = `issues-${process.env.ENV}`
  console.log('Clearing out issue items for', transcriptionId, 'in index', indexName)
  
  try {
    const deleted = await client.deleteByQuery({
      index: indexName,
      body: {
        query: {
          match: { transcriptionId: transcriptionId },
        },
      },
    })
    
    return deleted
  } catch (error) {
    // Handle index not found error gracefully - this happens on first run
    if (error.meta?.statusCode === 404 && error.meta?.body?.error?.type === 'index_not_found_exception') {
      console.log(`ℹ️ Index ${indexName} doesn't exist yet - will be created on first indexing operation`)
      return { deleted: 0 }
    }
    // Re-throw other errors
    throw error
  }
}

module.exports = {
  clearKnownWordsForTranscription,
  clearIssuesForTranscription,
}