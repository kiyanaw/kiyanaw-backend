import elasticsearch from 'elasticsearch'
import preverbs from './preverbs'

const client = new elasticsearch.Client({
  // host: 'http://localhost:9200/'
  host: 'https://search-kiyanaw-dev-grohpnfdchux2gvdyytpdpqr5m.us-east-1.es.amazonaws.com'
})

class Inflection {
  constructor (item) {
    // this.data = item._source
    this._id = item._id
    this.type = item.type
    this.sro = item.sro
    this.actor = item.actor
    this.goal = item.goal
    this.mode = item.mode
    this.tempus = item.tempus
    this.english = item.english
  }
}

// Words we have found previously
let knownWords = []
// Words we searched for but didn't find
let unknownWords = []
// words we've pulled preverbs out of but need to keep track of
let strippedWordMap = {}

class Lex {
  getWordsNotKnown (words) {
    return words.filter(word => knownWords.indexOf(word) === -1).filter(word => unknownWords.indexOf(word) === -1)
  }

  stripWords (words) {
    const strippedWords = []
    for (let word of words) {
      if (word.indexOf('-') > -1) {
        const stripped = word.split('-').filter(bit => preverbs.indexOf(bit) === -1).join('-')
        // console.log(`word ${word} -> ${stripped}`)
        // keep track of how stripped words map bac
        strippedWordMap[stripped] = word
        strippedWords.push(stripped)
      } else {
        strippedWords.push(word)
      }
    }
    return strippedWords
  }

  /**
   * Search the index for matches to the given words, keeping track of the matched and unmatched.
   */
  async wordSearch (words, callback) {
    console.log(`Got search terms: ${words}`)
    const strippedWords = this.stripWords(words)
    // console.log(`Stripped words: ${strippedWords}`)
    const onlySearchFor = this.getWordsNotKnown(strippedWords)
    // console.log(`Searching only for: ${onlySearchFor}`)

    if (onlySearchFor.length) {
      let query = {
        index: 'inflected',
        type: '_doc',
        body: { query: { bool: { filter: { terms: { inflected: onlySearchFor } } } } }
      }
      const raw = await client.search(query)
      const resultWords = raw.hits.hits.map(word => word._source.inflected)
      // loop through the stripped word map and match any results
      const matchedStrippedWords = resultWords.map(result => strippedWordMap[result])
      knownWords = knownWords.concat(resultWords)
      knownWords = knownWords.concat(matchedStrippedWords)

      console.log(`Known words: ${knownWords}`)

      // keep track of the stuff we don't need to search for again
      // unknownWords = unknownWords.concat(words.filter(word => resultWords.indexOf(word) === -1))
    } else {
      console.log('Nothing to search for')
    }
    callback()
  }
  /**
   * Allow modules to report words that are known already (probably from saved data)
   */
  async addKnownWords (words) {
    knownWords = knownWords.concat(words)
  }
  /**
   * Return the list of known words
   */
  async getKnownWords () {
    return knownWords
  }
}

export default new Lex()
