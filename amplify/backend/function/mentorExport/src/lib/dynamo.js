const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')

const client = new DynamoDBClient({ region: process.env.REGION })
const docClient = DynamoDBDocumentClient.from(client)

const EXPORT_TABLE = process.env.API_KIYANAW_EXPORTTABLE_NAME
const REGION_TABLE = process.env.API_KIYANAW_REGIONTABLE_NAME
const TRANSCRIPTION_TABLE = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME
const MEDIA_TABLE = process.env.API_KIYANAW_MEDIATABLE_NAME

/**
 * Update an Export record's status and optional extra fields.
 * Pass conditionStatus to add a ConditionExpression (for atomic dedupe).
 */
async function updateExportStatus(id, status, { conditionStatus, downloadKey, error, progress, total } = {}) {
  const now = new Date().toISOString()

  const exprParts = ['#status = :status', '#updatedAt = :updatedAt']
  const names = { '#status': 'status', '#updatedAt': 'updatedAt' }
  const values = { ':status': status, ':updatedAt': now }

  const optional = { downloadKey, error, progress, total }
  for (const [field, value] of Object.entries(optional)) {
    if (value !== undefined) {
      exprParts.push(`#${field} = :${field}`)
      names[`#${field}`] = field
      values[`:${field}`] = value
    }
  }

  const params = {
    TableName: EXPORT_TABLE,
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

async function getTranscription(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TRANSCRIPTION_TABLE, Key: { id } }))
  return Item || null
}

async function getMedia(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: MEDIA_TABLE, Key: { id } }))
  return Item || null
}

/**
 * Fetch every region for a transcription via the ByTranscription GSI, paging
 * through all results (a transcription can have hundreds of regions).
 */
async function getRegionsByTranscription(transcriptionId) {
  const regions = []
  let ExclusiveStartKey

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(new QueryCommand({
      TableName: REGION_TABLE,
      IndexName: 'ByTranscription',
      KeyConditionExpression: 'transcriptionId = :tid',
      ExpressionAttributeValues: { ':tid': transcriptionId },
      ExclusiveStartKey,
    }))
    regions.push(...(Items || []))
    ExclusiveStartKey = LastEvaluatedKey
  } while (ExclusiveStartKey)

  return regions
}

module.exports = { updateExportStatus, getTranscription, getMedia, getRegionsByTranscription }
