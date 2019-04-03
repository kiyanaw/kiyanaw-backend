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
  constructor (data) {
    this._id = data._id
    this.definition = data.algDefinition
    this.derivation = data.algDerivation
    this.type = data.algType
    this.roman = data.algSro
  }
}

/* TODO: document params */
const unpackDoc = async function (doc) {
  return new Word(doc)
}
/**
 * @description Retrieve a list of 'unverified' words
 */
const getUnverified = async function (page = null) {

  let query = {
    index: 'words',
    type: 'item',
    body: {
      query: {
        bool: {
          // don't grab any document that has a 'skipped' flag
          must_not: { term: { tags: "skipped" } },
          filter: { bool: { must_not: { exists: { field: "sro" } } } }
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
  const unpacked = await Promise.all(raw.hits.hits.map(item => unpackDoc(item._source)))
  return unpacked
}
/**
 * todo
 */
const getNextUnverified = async function () {
  const word = await getUnverified({from: 0, size: 1})
  return word[0]
}

export default {
  getNextUnverified,
  getUnverified
}