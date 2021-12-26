const AWS = require('aws-sdk')
AWS.config.update({
  credentials: new AWS.EnvironmentCredentials('AWS'),
  region: 'us-east-1',
})

const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

const config = {
  prod: {
    transcriptionTable: 'Transcription-2f6oi2uymzaunf4rb564agznt4-prod',
    regionTable: 'Region-2f6oi2uymzaunf4rb564agznt4-prod',
    domain: 'https://transcribe.kiyanaw.net',
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
