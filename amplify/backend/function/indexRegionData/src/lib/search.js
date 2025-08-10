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
  // Skip indexing if transcription has no language index set
  // Check both 'lang' (new field) and 'index' (deprecated field) for backward compatibility
  const languageCode = transcription.lang || transcription.index
  if (!languageCode) {
    console.log('⚠️ Skipping indexing - no language index set on transcription')
    return
  }

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

  for (const word of words) {
    let surface = utils.toCircumflex(word)
    // strip out any goofy characters
    surface = surface.replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '').trim()
    
    if (!surface) {
      console.log('Skipping empty word after normalization')
      continue
    }
    
    console.log('Normalized word:', surface)
    
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
      console.log('toIndex', toIndex)

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
      console.log('result', success.result)
      assert.ok(['noop', 'created'].includes(success.result))
    }
  }
}

module.exports = {
  clearKnownWordsForRegion,
  // client,
  indexRegionAnalysis,
}
