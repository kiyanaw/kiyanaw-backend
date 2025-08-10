const assert = require('assert')

const sapir = require('./sapir')
const utils = require('../utils')

const { client } = require('./es')

const clearKnownWordsForRegion = async (regionId) => {
  const indexName = `knownwords-${process.env.ENV}`
  console.log('Clearing out region items for ', regionId, 'in index', indexName)
  const deleted = await client.deleteByQuery({
    index: indexName,
    body: {
      query: {
        match: { regionId: regionId },
      },
    },
  })
  return deleted
}

const indexRegionAnalysis = async (region, transcription) => {
  // Skip indexing if transcription has no language set
  if (!transcription.lang) {
    console.log('⚠️ Skipping indexing - no lang set on transcription')
    return
  }
  const languageCode = transcription.lang

  // Use regionAnalysis array instead of parsing regionText for known words
  const words = region.regionAnalysis || []
  console.log('Words to index from regionAnalysis:', words)

  if (words.length === 0) {
    console.log('No words in regionAnalysis to index')
    return
  }

  // Get full region text for context (if available)
  let sentence = ''
  if (region.regionText) {
    // regionText is now stored as plain text
    sentence = region.regionText
  }

  // Process words in parallel using Promise.allSettled for better performance
  const wordProcessingPromises = words.map(async (word) => {
    let surface = utils.toCircumflex(word)
    // strip out any goofy characters
    surface = surface.replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '').trim()
    
    if (!surface) {
      console.log('Skipping empty word after normalization:', word)
      return { status: 'skipped', word, reason: 'empty after normalization' }
    }
    
    console.log('Processing word:', surface)
    
    try {
      // TODO: check for IPC
      // TODO: pull only wolvengrey
      // TODO: exact-match results
      const raw = await sapir.clickInText(surface)
      const results = raw.data.results

      if (results.length) {
        const lemma = results[0].lemma_wordform.text
        const wordType = results[0].lemma_wordform.pos
        const wordClass = results[0].lemma_wordform.wordclass
        console.log(`Got lemma for surface form '${surface}': ${lemma}`)

        const toIndex = {
          lang: languageCode, // Use transcription language
          lemma,
          surface,
          transcriptionId: region.transcriptionId,
          regionId: region.id,
          regionText: utils.toCircumflex(sentence),
          wordType,
          wordClass,
          transcriptionName: transcription.title,
          timestamp: `${region.start}:${region.end}`,
        }

        const indexName = `knownwords-${process.env.ENV}`
        const success = await client.update({
          index: indexName,
          id: `${toIndex.regionId}-${surface}`,
          body: {
            // put the partial document under the `doc` key
            doc: toIndex,
            doc_as_upsert: true,
          },
        })
        
        // OpenSearch client response structure - check for successful indexing
        const isSuccessful = success.body?._shards?.successful > 0 || 
                           success.statusCode === 200 || 
                           success.statusCode === 201
        
        return { 
          status: 'indexed', 
          word: surface, 
          lemma,
          successful: isSuccessful,
          response: success.body?.result || 'success'
        }
      } else {
        console.log(`No results found for word: ${surface}`)
        return { status: 'no_results', word: surface }
      }
    } catch (error) {
      console.error(`Error processing word "${surface}":`, error.message)
      return { status: 'error', word: surface, error: error.message }
    }
  })

  // Wait for all word processing to complete
  const results = await Promise.allSettled(wordProcessingPromises)
  
  // Log summary of results
  const summary = {
    total: words.length,
    indexed: 0,
    failed: 0,
    skipped: 0,
    no_results: 0
  }
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const wordResult = result.value
      summary[wordResult.status] = (summary[wordResult.status] || 0) + 1
      
      if (wordResult.status === 'error') {
        console.error(`Word processing failed:`, wordResult)
      }
    } else {
      summary.failed++
      console.error(`Promise rejected for word ${words[index]}:`, result.reason)
    }
  })
  
  console.log('Word processing summary:', summary)
}

module.exports = {
  clearKnownWordsForRegion,
  // client,
  indexRegionAnalysis,
}
