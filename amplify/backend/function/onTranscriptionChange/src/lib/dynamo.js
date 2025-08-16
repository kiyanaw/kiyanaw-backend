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

async function batchWrite(params) {
  return new Promise((resolve, reject) => {
    docClient.batchWrite(params, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

async function deleteItem(params) {
  return new Promise((resolve, reject) => {
    docClient.delete(params, (err, data) => {
      if (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}

/**
 * Get all regions for a specific transcription using the ByTranscription index
 * @param {string} transcriptionId 
 * @param {string} regionTable 
 * @returns {Promise<Array>} Array of regions
 */
async function getRegionsForTranscription(transcriptionId, regionTable) {
  try {
    const params = {
      TableName: regionTable,
      IndexName: 'ByTranscription',
      KeyConditionExpression: 'transcriptionId = :transcriptionId',
      ExpressionAttributeValues: {
        ':transcriptionId': transcriptionId
      },
      ProjectionExpression: 'id'
    }
    
    const result = await query(params)
    return result.Items || []
  } catch (error) {
    console.error('Error getting regions for transcription:', error)
    return []
  }
}

/**
 * Get all issues for a specific transcription using the ByTranscription index
 * @param {string} transcriptionId 
 * @param {string} issueTable 
 * @returns {Promise<Array>} Array of issues
 */
async function getIssuesForTranscription(transcriptionId, issueTable) {
  try {
    const params = {
      TableName: issueTable,
      IndexName: 'ByTranscription',
      KeyConditionExpression: 'transcriptionId = :transcriptionId',
      ExpressionAttributeValues: {
        ':transcriptionId': transcriptionId
      },
      ProjectionExpression: 'id'
    }
    
    const result = await query(params)
    return result.Items || []
  } catch (error) {
    console.error('Error getting issues for transcription:', error)
    return []
  }
}

/**
 * Get all invites for a specific transcription using the ByTranscription index
 * @param {string} transcriptionId 
 * @param {string} inviteTable 
 * @returns {Promise<Array>} Array of invites
 */
async function getInvitesForTranscription(transcriptionId, inviteTable) {
  try {
    const params = {
      TableName: inviteTable,
      IndexName: 'ByTranscription',
      KeyConditionExpression: 'transcriptionId = :transcriptionId',
      ExpressionAttributeValues: {
        ':transcriptionId': transcriptionId
      },
      ProjectionExpression: 'id'
    }
    
    const result = await query(params)
    return result.Items || []
  } catch (error) {
    console.error('Error getting invites for transcription:', error)
    return []
  }
}

module.exports = { 
  getDoc, 
  query, 
  scan, 
  batchWrite, 
  deleteItem,
  getRegionsForTranscription,
  getIssuesForTranscription,
  getInvitesForTranscription
}
