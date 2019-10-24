import elasticsearch from 'elasticsearch'

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

class Lex {
  getWordsNotKnown (words) {
    return words.filter(word => knownWords.indexOf(word) === -1).filter(word => unknownWords.indexOf(word) === -1)
  }

  async wordSearch (words, callback) {
    console.log(`Got search terms: ${words}`)
    const onlySearchFor = this.getWordsNotKnown(words)
    console.log(`Searching only for: ${onlySearchFor}`)

    if (onlySearchFor.length) {
      let query = {
        index: 'inflected',
        type: '_doc',
        body: { query: { bool: { filter: { terms: { inflected: onlySearchFor } } } } }
      }
      const raw = await client.search(query)
      const resultWords = raw.hits.hits.map(word => word._source.inflected)
      console.log(resultWords)
      knownWords = knownWords.concat(resultWords)

      // keep track of the stuff we don't need to search for again
      unknownWords = unknownWords.concat(words.filter(word => resultWords.indexOf(word) === -1))
    } else {
      console.log('Nothing to search for')
    }
    callback()
  }
  async getKnownWords () {
    return knownWords
  }
}

export default new Lex()
