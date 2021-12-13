import elasticsearch from 'elasticsearch'
import httpAwsEs from 'http-aws-es'

import Timeout from 'smart-timeout'

import logging from '../logging'

// TODO: inject this
import AWS from 'aws-sdk'
import { Auth } from 'aws-amplify'

const logger = new logging.Logger('Lexicon')

class Client {
  constructor() {
    this.endpoint = 'https://icagc4x2ok.execute-api.us-east-1.amazonaws.com'
    this.sapirEndpoint = 'https://itwewina.altlab.app/click-in-text'

    Auth.currentCredentials().then((credentials) => {
      console.log('credentials', credentials)
      this.esClient = elasticsearch.Client({
        host:
          'https://search-indexregiondata-lqatyzsxiuhepcfidwldyiebh4.us-east-1.es.amazonaws.com',
        connectionClass: httpAwsEs,
        awsConfig: new AWS.Config({ region: 'us-east-1', credentials }),
      })

      window.es = this.esClient
    })
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

  async sapir(term) {
    const url = `${this.sapirEndpoint}/?q=${term}`
    let response = await fetch(url, {
      method: 'GET',
    })
    response = await response.json()
    return response.results
  }
}

const client = new Client()

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
    logger.debug(`Got search terms: ${words}`)
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
      logger.debug('result words', resultWords)

      suggestions = {
        ...suggestions,
        ...raw._suggestions,
      }
      logger.debug('suggestions', suggestions)

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

  async lookup(term) {
    return client.sapir(term)
  }
}

export default new Lex()
