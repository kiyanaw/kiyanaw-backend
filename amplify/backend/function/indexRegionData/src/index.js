const assert = require('assert').strict
const AWS = require('aws-sdk')
const axios = require('axios')
const dynamo = require('./lib/aws')

AWS.config.update({
  credentials: new AWS.EnvironmentCredentials('AWS'),
  region: 'us-east-1',
})

var esClient = require('elasticsearch').Client({
  host: 'https://search-indexregiondata-lqatyzsxiuhepcfidwldyiebh4.us-east-1.es.amazonaws.com',
  connectionClass: require('http-aws-es'),
})

const db = {
  prod: {
    transcriptionTable: 'Transcription-2f6oi2uymzaunf4rb564agznt4-prod',
    regionTable: 'Region-2f6oi2uymzaunf4rb564agznt4-prod',
    domain: 'https://transcribe.kiyanaw.net',
  },
}

const sapir = async (word) => {
  return axios.get(`https://sapir.artsrn.ualberta.ca/cree-dictionary/click-in-text?q=${word}`)
}

const okResponse = () => {
  return {
    statusCode: 200,
    body: '{"message": "ok"}',
  }
}

const toCircumflex = (item) => {
  console.log('circumflexing', item)
  return item.replace(/ā/g, 'â').replace(/ī/g, 'î').replace(/ō/g, 'ô').replace(/ē/g, 'ê')
}

exports.handler = async (event) => {
  const record = event.Records[0]
  console.log('record', JSON.stringify(record))

  // select the db
  let env = db.prod
  const transcriptionTable = db.prod.transcriptionTable
  const regionTable = db.prod.regionTable

  if (!(record && record.body)) {
    return okResponse()
  }

  const regionId = record.body
  console.log('Processing region', regionId)

  let region
  try {
    region = await dynamo.getDoc({
      TableName: regionTable,
      Key: {
        id: regionId,
      },
    })
  } catch (err) {
    console.error('Error getting region', err)
    return okResponse()
  }
  region = region.Item
  console.log('Got region', region)

  // get transcription
  let transcription
  try {
    // work around the Lambda syntax error
    transcription = await dynamo.getDoc({
      TableName: transcriptionTable,
      Key: {
        id: region.transcriptionId,
      },
    })
  } catch (err) {
    console.error('Error getting transcription', err)
    return okResponse()
  }

  transcription = transcription.Item
  console.log('transcription', transcription)

  if (transcription.isPrivate || transcription.disableAnalyzer) {
    console.log('Not processing transcription')
    return okResponse()
  }

  // pull known words from the region
  // const region = item.new
  const text = JSON.parse(region.text)
  const words = text
    .filter((item) => item.attributes && item.attributes['known-word'])
    .map((item) => item.insert)
  const sentence = text.map((item) => item.insert).join('')

  console.log('Clearing out region contents')

  const deleted = await esClient.deleteByQuery({
    index: 'knownwords',
    type: '_doc',
    body: {
      query: {
        match: { regionId: region.id },
      },
    },
  })
  console.log('Deleted', deleted)

  console.log('Words to index', words)

  for (const word of words) {
    const surface = toCircumflex(word)
    console.log('Normalized: ', surface)
    const raw = await sapir(surface)
    const results = raw.data.results

    if (results.length) {
      const lemma = results[0].lemma_wordform.text
      const wordType = results[0].lemma_wordform.pos
      const wordClass = results[0].lemma_wordform.wordclass
      console.log(`Got lemma for surface form '${surface}': ${lemma}`)

      const toIndex = {
        lemma,
        surface,
        transcriptionId: transcription.id,
        regionId: region.id,
        regionText: toCircumflex(sentence),
        wordType,
        wordClass,
      }
      console.log('toIndex', toIndex)

      const success = await esClient.update({
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

  return okResponse()
}
