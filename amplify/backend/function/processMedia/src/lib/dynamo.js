const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb')

const client = new DynamoDBClient({ region: process.env.REGION })
const docClient = DynamoDBDocumentClient.from(client)

/**
 * Update a Media record's status and optional extra fields.
 * Pass conditionStatus to add a ConditionExpression (for atomic dedupe).
 */
async function updateMediaStatus(id, status, { conditionStatus, renditionKey, peaksKey, thumbnailKey, duration } = {}) {
  const now = new Date().toISOString()
  const tableName = process.env.API_KIYANAW_MEDIATABLE_NAME

  const exprParts = ['#status = :status', '#updatedAt = :updatedAt']
  const names = { '#status': 'status', '#updatedAt': 'updatedAt' }
  const values = { ':status': status, ':updatedAt': now }

  if (renditionKey !== undefined) {
    exprParts.push('#renditionKey = :renditionKey')
    names['#renditionKey'] = 'renditionKey'
    values[':renditionKey'] = renditionKey
  }
  if (peaksKey !== undefined) {
    exprParts.push('#peaksKey = :peaksKey')
    names['#peaksKey'] = 'peaksKey'
    values[':peaksKey'] = peaksKey
  }
  if (thumbnailKey !== undefined) {
    exprParts.push('#thumbnailKey = :thumbnailKey')
    names['#thumbnailKey'] = 'thumbnailKey'
    values[':thumbnailKey'] = thumbnailKey
  }
  if (duration !== undefined) {
    exprParts.push('#duration = :duration')
    names['#duration'] = 'duration'
    values[':duration'] = duration
  }

  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: `SET ${exprParts.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }

  if (conditionStatus) {
    params.ConditionExpression = '#status = :conditionStatus'
    values[':conditionStatus'] = conditionStatus
  }

  return docClient.send(new UpdateCommand(params))
}

module.exports = { updateMediaStatus }
