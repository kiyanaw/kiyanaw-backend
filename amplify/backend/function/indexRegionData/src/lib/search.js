const assert = require('assert')

const sapir = require('./sapir')
const utils = require('../utils')

const { client } = require('./es')

const clearKnownWordsForRegion = async (regionId) => {
  console.log('Clearing out region contents for ', regionId)
  const deleted = await client.deleteByQuery({
    index: 'knownwords',
    type: '_doc',
    body: {
      query: {
        match: { regionId: regionId },
      },
    },
  })
  return deleted
}

const indexKnownWords = async (region, transcription) => {
  const text = JSON.parse(region.text)
  const words = text
    .filter((item) => item.attributes && item.attributes['known-word'])
    .map((item) => item.insert)
  console.log('Words to index', words)

  const sentence = text.map((item) => item.insert).join('')

  for (const word of words) {
    let surface = utils.toCircumflex(word)
    // strip out any goofy characters
    surface = surface.replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '').trim()
    console.log('Normalized: ', surface)
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

      // TODO: index transcription name
      // TODO: index start/end time
      const toIndex = {
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

      const success = await client.update({
        index: 'knownwords',
        type: '_doc',
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
  indexKnownWords,
}
