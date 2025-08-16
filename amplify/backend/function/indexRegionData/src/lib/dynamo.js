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

/**
 * Get all issues for a specific region
 * @param {string} regionId 
 * @param {string} issueTable 
 * @returns {Promise<Array>} Array of issues
 */
async function getIssuesForRegion(regionId, issueTable) {
  try {
    // Query issues by regionId using the ByRegion GSI
    const params = {
      TableName: issueTable,
      IndexName: 'ByRegion',
      KeyConditionExpression: 'regionId = :regionId',
      ExpressionAttributeValues: {
        ':regionId': regionId
      }
    }
    
    const result = await query(params)
    return result.Items || []
  } catch (error) {
    console.error('Error getting issues for region:', error)
    return []
  }
}

module.exports = { getDoc, query, scan, getIssuesForRegion }
