const AWS = require('aws-sdk')
AWS.config.update({
  credentials: new AWS.EnvironmentCredentials('AWS'),
  region: process.env.REGION,
})

const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })

async function getDoc(params) {
  return new Promise((resolve, reject) => {
    docClient.get(params, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

async function query(params) {
  return new Promise((resolve, reject) => {
    docClient.query(params, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

async function scan(params) {
  return new Promise((resolve, reject) => {
    docClient.scan(params, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

module.exports = { getDoc, query, scan }
