import elasticsearch from 'elasticsearch'

const client = new elasticsearch.Client({
  host: 'http://localhost:9200/'
})

/**
 * @typedef {object} Word
 * @property {string} definition - English definition of the word
 * @property {Array<string>} derivation - List of morphemes derived from this word
 * @property {string} type - Word classification, eg: 'VAI', 'NI'
 * @property {string} roman - SRO of the word
 */
class Word {
  /* TODO: document params */
  constructor(item) {
    const data = item._source
    this._id = item._id
    this.definition = data.algDefinition
    this.derivation = data.algDerivation
    this.type = data.algType
    this.roman = data.algSro
  }
}

/* TODO: document params */
const unpackWord = async function(doc) {
  return new Word(doc)
}
/**
 * @description Retrieve a list of 'unverified' words
 */
const getUnverified = async function(page = null, term = null) {
  let termQuery = null
  if (term) {
    termQuery = { must: { wildcard: { algSro: term } } }
  }
  let query = {
    index: 'words',
    type: 'item',
    body: {
      query: {
        bool: {
          // don't grab any document that has a 'skipped' flag
          must_not: { term: { tags: 'skipped' } },
          filter: { bool: { must_not: { exists: { field: 'sro' } } } },
          ...termQuery
        }
      }
    }
  }
  if (page) {
    query = {
      ...query,
      ...page
    }
  }
  const raw = await client.search(query)
  const unpacked = await Promise.all(raw.hits.hits.map((item) => unpackWord(item)))
  return { words: unpacked, total: raw.hits.total }
}
/**
 * todo
 */
const getNextUnverified = async function(id) {
  if (id) {
    return unpackWord(await client.get({ id: id, index: 'words', type: 'item' }))
  } else {
    return getUnverified({ from: 0, size: 1 })
  }
}

/**
 * Get morphemes
 * @param {*} page
 * @param {*} term
 */
const getMorphemes = async function(page = null, term = null) {
  let termQuery = {}
  if (term) {
    termQuery = { must: { wildcard: { sro: term } } }
  }
  let query = {
    index: 'morphemes',
    type: 'item',
    body: {
      query: {
        bool: {
          ...termQuery
        }
      }
    }
  }
  if (page) {
    query = {
      ...query,
      ...page
    }
  }
  const raw = await client.search(query)
  const unpacked = await Promise.all(raw.hits.hits.map((item) => unpackWord(item)))
  return { words: unpacked, total: raw.hits.total }
}

export default {
  getMorphemes,
  getNextUnverified,
  getUnverified
}
