const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')

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

/**
 * Get all issues for a specific region
 * @param {string} regionId
 * @param {string} issueTable
 * @returns {Promise<Array>} Array of issues
 */
async function getIssuesForRegion(regionId, issueTable) {
  try {
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
