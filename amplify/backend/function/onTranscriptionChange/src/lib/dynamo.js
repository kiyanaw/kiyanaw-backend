const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand, BatchWriteCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb')

const client = new DynamoDBClient({ region: process.env.REGION })
const docClient = DynamoDBDocumentClient.from(client)

async function getDoc(params) {
  return docClient.send(new GetCommand(params))
}

async function query(params) {
  return docClient.send(new QueryCommand(params))
}

async function scan(params) {
  return docClient.send(new ScanCommand(params))
}

async function batchWrite(params) {
  return docClient.send(new BatchWriteCommand(params))
}

async function deleteItem(params) {
  return docClient.send(new DeleteCommand(params))
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
