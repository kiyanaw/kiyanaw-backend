import Timeout from 'smart-timeout'

import logging from '../logging'

const logger = new logging.Logger('Lexicon')

class Client {
  constructor(endpoint) {
    this.endpoint = endpoint
  }

  async search(data) {
    const url = `${this.endpoint}/bulk-lookup`
    // const response = await axios({ url, data })
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      body: JSON.stringify(data),
    })
    const result = await response.json()
    return result
  }
}

const client = new Client('https://icagc4x2ok.execute-api.us-east-1.amazonaws.com')

// Words we have found previously
let knownWords = []
// Words we searched for but didn't find
let unknownWords = []
// words we've pulled preverbs out of but need to keep track of
let strippedWordMap = {}
//
let suggestions = {}

class Lex {
  getWordsNotKnown(words) {
    return words
      .filter((word) => knownWords.indexOf(word) === -1)
      .filter((word) => unknownWords.indexOf(word) === -1)
  }

  replaceMacrons(word) {
    word = word.replace(/ā/g, 'â').replace(/ē/g, 'ê').replace(/ī/g, 'î').replace(/ō/g, 'ô')
    return word
  }

  // fixKaKi(word) {
  //   word = word.replace('kâ-')
  // }

  stripWords(words) {
    let strippedWords = []
    for (let word of words) {
      let stripped = this.replaceMacrons(word)
      // strip out special characters
      stripped = stripped.replace(/[.,()]/g, '')
      // save to the map
      strippedWordMap[stripped] = word
      strippedWords.push(stripped)
    }
    // remove any punctuation
    // console.log(strippedWordMap)
    return strippedWords
  }

  /**
   * Search the index for matches to the given words, keeping track of the matched and unmatched.
   * TODO: test this!!
   */
  async wordSearch(words, callback) {
    logger.log(`Got search terms: ${words}`)
    // pull preverbs and macrons out of the search terms
    const strippedWords = this.stripWords(words)
    // now that the words are stripped, match against known words one more time
    for (const stripped of strippedWords) {
      if (knownWords.includes(stripped)) {
        knownWords.push(strippedWordMap[stripped])
      }
    }
    // remove any words we already "know"
    const onlySearchFor = this.getWordsNotKnown(strippedWords)

    // build the query
    if (onlySearchFor.length) {
      const raw = await client.search(onlySearchFor)
      const resultWords = Object.entries(raw)
        .map((items) => {
          if (items[1].length) {
            return items[0]
          }
        })
        .filter(Boolean)
      logger.info('result words', resultWords)

      suggestions = {
        ...suggestions,
        ...raw._suggestions,
      }
      logger.info('suggestions', suggestions)

      // loop through the stripped word map and match any results
      const matchedStrippedWords = resultWords.map((result) => strippedWordMap[result])
      knownWords = knownWords.concat(resultWords)
      knownWords = knownWords.concat(matchedStrippedWords)
      // keep track of the stuff we don't need to search for again
      // unknownWords = unknownWords.concat(words.filter(word => resultWords.indexOf(word) === -1))
    } else {
      logger.debug('Nothing to search for.')
    }
    // push any mapped words into the knownWords
    for (const known of knownWords) {
      const original = strippedWordMap[known]
      if (original && !knownWords.includes(original)) {
        knownWords.push(original)
      }
    }
    // notify
    if (callback) {
      callback()
    }
  }
  /**
   * Allow modules to report words that are known already (probably from saved data)
   */
  addKnownWords(words) {
    knownWords = Array.from(new Set(knownWords.concat(words)))

    Timeout.clear('report-known-words-timer')
    Timeout.set(
      'report-known-words-timer',
      () => {
        logger.info('Reported known words', knownWords)
      },
      1000,
    )
  }
  /**
   * Return the list of known words
   */
  getKnownWords() {
    return knownWords.filter((item) => item && item.length)
  }

  getSuggestions() {
    return suggestions
  }
}

export default new Lex()
