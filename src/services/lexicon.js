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

  replaceMacrons (word) {
    word = word.replace(/ā/g, 'â')
      .replace(/ē/g, 'ê')
      .replace(/ī/g, 'î')
      .replace(/ō/g, 'ô')
    return word
  }

  fixKaKi (word) {
    word = word.replace('kâ-')
  }

  stripWords (words) {
    let strippedWords = []
    for (let word of words) {
      let stripped
      if (word.indexOf('-') > -1) {
        stripped = word.split('-').filter(bit => preverbs.indexOf(bit) === -1).join('-')
      }
      stripped = this.replaceMacrons(word)

      if (word.indexOf('kâ-kî-') > -1) {
        stripped = word.replace('kâ-kî-', 'kâ-ki-')
      }

      strippedWordMap[stripped] = word
      strippedWords.push(stripped)
    }
    // remove any puntuation
    strippedWords = strippedWords.map(item => item.replace(/[.,]/g, ''))
    console.log(strippedWordMap)
    return strippedWords
  }

  /**
   * Search the index for matches to the given words, keeping track of the matched and unmatched.
   * TODO: test this!!
   */
  async wordSearch (words, callback) {
    console.log(`Got search terms: ${words}`)
    // pull preverbs and macrons out of the search terms
    const strippedWords = this.stripWords(words)
    // remove any words we already "know"
    const onlySearchFor = this.getWordsNotKnown(strippedWords)
    console.log(`searching for: ${onlySearchFor}`)
    // build the query
    if (onlySearchFor.length) {
      let query = {
        index: 'inflected',
        type: '_doc',
        body: { query: { bool: { filter: { terms: { inflected: onlySearchFor } } } } }
      }
      console.log(JSON.stringify(query))
      const raw = await client.search(query)
      const resultWords = raw.hits.hits.map(word => word._source.inflected)
      console.log(`got results: ${resultWords}`)
      // loop through the stripped word map and match any results
      const matchedStrippedWords = resultWords.map(result => strippedWordMap[result])
      knownWords = knownWords.concat(resultWords)
      knownWords = knownWords.concat(matchedStrippedWords)
      // keep track of the stuff we don't need to search for again
      // unknownWords = unknownWords.concat(words.filter(word => resultWords.indexOf(word) === -1))
    } else {
      console.log('Nothing to search for.')
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
    return knownWords.filter(item => item && item.length)
  }
}

export default new Lex()
