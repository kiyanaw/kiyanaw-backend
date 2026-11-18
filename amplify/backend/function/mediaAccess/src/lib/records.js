// DynamoDB + Cognito reads needed to authorize a signing request.
const { GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const { AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider')
const { sourceUrlToKey } = require('./keys')

const LEGACY_INDEX_TTL_MS = 5 * 60 * 1000

/**
 * @param {object} deps
 * @param {{send: Function}} deps.docClient - DynamoDBDocumentClient
 * @param {{send: Function}} deps.cognitoClient - CognitoIdentityProviderClient
 * @param {{transcriptionTable: string, mediaTable: string, userPoolId: string}} deps.config
 */
function createRecords({ docClient, cognitoClient, config }) {
  const { transcriptionTable, mediaTable, userPoolId } = config
  let legacyIndex = null
  let legacyIndexBuiltAt = 0

  const live = (item) => !!item && item._deleted !== true

  async function getTranscription(id) {
    const { Item } = await docClient.send(new GetCommand({ TableName: transcriptionTable, Key: { id } }))
    return live(Item) ? Item : null
  }

  async function getMedia(id) {
    const { Item } = await docClient.send(new GetCommand({ TableName: mediaTable, Key: { id } }))
    return live(Item) ? Item : null
  }

  async function transcriptionsByMedia(mediaId) {
    const items = []
    let ExclusiveStartKey
    do {
      const page = await docClient.send(new QueryCommand({
        TableName: transcriptionTable,
        IndexName: 'ByMedia',
        KeyConditionExpression: '#mediaId = :mediaId',
        ExpressionAttributeNames: { '#mediaId': 'mediaId' },
        ExpressionAttributeValues: { ':mediaId': mediaId },
        ExclusiveStartKey,
      }))
      items.push(...(page.Items || []))
      ExclusiveStartKey = page.LastEvaluatedKey
    } while (ExclusiveStartKey)
    return items.filter(live)
  }

  // Legacy transcriptions have no index on `source`; map source key -> transcription ids
  // with one projected scan per warm container, then re-read each match for fresh ACLs.
  async function buildLegacyIndex() {
    const index = new Map()
    let ExclusiveStartKey
    do {
      const page = await docClient.send(new ScanCommand({
        TableName: transcriptionTable,
        ProjectionExpression: '#id, #source',
        FilterExpression: 'attribute_exists(#source)',
        ExpressionAttributeNames: { '#id': 'id', '#source': 'source' },
        ExclusiveStartKey,
      }))
      for (const item of page.Items || []) {
        const key = sourceUrlToKey(item.source)
        if (key === null) continue
        const ids = index.get(key) || []
        ids.push(item.id)
        index.set(key, ids)
      }
      ExclusiveStartKey = page.LastEvaluatedKey
    } while (ExclusiveStartKey)
    return index
  }

  async function transcriptionsBySourceKeys(sourceKeys) {
    const now = Date.now()
    if (!legacyIndex || now - legacyIndexBuiltAt > LEGACY_INDEX_TTL_MS) {
      legacyIndex = await buildLegacyIndex()
      legacyIndexBuiltAt = now
    }
    const ids = [...new Set(sourceKeys.flatMap((k) => legacyIndex.get(k) || []))]
    const items = await Promise.all(ids.map(getTranscription))
    return items.filter((t) => t !== null)
  }

  async function groupsForUser(sub) {
    const groups = []
    let NextToken
    do {
      let page
      try {
        // The pool's username attribute is email, so the Cognito username is the sub.
        page = await cognitoClient.send(new AdminListGroupsForUserCommand({
          UserPoolId: userPoolId,
          Username: sub,
          NextToken,
        }))
      } catch (error) {
        if (error.name === 'UserNotFoundException') return []
        throw error
      }
      groups.push(...(page.Groups || []).map((g) => g.GroupName))
      NextToken = page.NextToken
    } while (NextToken)
    return groups
  }

  return { getTranscription, getMedia, transcriptionsByMedia, transcriptionsBySourceKeys, groupsForUser }
}

module.exports = { createRecords }
