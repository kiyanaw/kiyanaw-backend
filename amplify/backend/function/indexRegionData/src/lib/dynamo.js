const AWS = require('aws-sdk')
AWS.config.update({
  credentials: new AWS.EnvironmentCredentials('AWS'),
  region: 'us-east-1',
})

const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

const config = {
  production: {
    transcriptionTable: 'Transcription-26n7gb6myzcklnzgus7uo6pwuq-production',
    regionTable: 'Region-26n7gb6myzcklnzgus7uo6pwuq-production',
    domain: 'https://transcribe.kiyanaw.net',
  },
  staging: {
    transcriptionTable: 'Transcription-m2zepok2hrhxrlp4jpo52kh774-staging',
    regionTable: 'Region-m2zepok2hrhxrlp4jpo52kh774-staging',
    domain: 'https://transcribe.kiyanaw.dev',
  },
}

async function getDoc(params, table) {
  return new Promise((resolve, reject) => {
    docClient.get(params, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

module.exports = { config, getDoc }
