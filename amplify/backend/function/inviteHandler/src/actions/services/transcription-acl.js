const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

function getDocClient() {
  const client = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(client);
}

/**
 * Add a user to a transcription's viewers or editors list
 * @param {string} transcriptionId
 * @param {string} userId
 * @param {string} permissionLevel - "viewer" or "editor"
 */
async function addUserToTranscription(transcriptionId, userId, permissionLevel) {
  const docClient = getDocClient();
  const tableName = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME;

  if (!tableName) {
    throw new Error('API_KIYANAW_TRANSCRIPTIONTABLE_NAME environment variable not configured');
  }

  const listAttribute = permissionLevel === 'editor' ? 'editors' : 'viewers';
  const now = new Date().toISOString();

  const getResult = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: { id: transcriptionId }
  }));

  const transcription = getResult.Item;
  if (!transcription) {
    throw new Error(`Transcription ${transcriptionId} not found`);
  }

  const currentList = transcription[listAttribute] || [];
  if (currentList.includes(userId)) {
    console.log(`User ${userId} already in ${listAttribute} for transcription ${transcriptionId}`);
    return transcription;
  }

  const result = await docClient.send(new UpdateCommand({
    TableName: tableName,
    Key: { id: transcriptionId },
    UpdateExpression: 'SET #list = list_append(if_not_exists(#list, :empty_list), :user_id), #updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#list': listAttribute, '#updatedAt': 'dateLastUpdated' },
    ExpressionAttributeValues: { ':user_id': [userId], ':empty_list': [], ':updatedAt': now },
    ReturnValues: 'ALL_NEW'
  }));

  console.log(`User ${userId} added to ${listAttribute} for transcription ${transcriptionId}`);
  return result.Attributes;
}

/**
 * Remove a user from a transcription's viewers or editors list
 * @param {string} transcriptionId
 * @param {string} userIdentifier - userId (or email as fallback for old records)
 * @param {string} permissionLevel - "viewer" or "editor"
 */
async function removeUserFromTranscription(transcriptionId, userIdentifier, permissionLevel) {
  const docClient = getDocClient();
  const tableName = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME;

  if (!tableName) {
    throw new Error('API_KIYANAW_TRANSCRIPTIONTABLE_NAME environment variable not configured');
  }

  const listAttribute = permissionLevel === 'editor' ? 'editors' : 'viewers';
  const now = new Date().toISOString();

  const getResult = await docClient.send(new GetCommand({
    TableName: tableName,
    Key: { id: transcriptionId }
  }));

  const transcription = getResult.Item;
  if (!transcription) {
    console.log(`Transcription ${transcriptionId} not found - skipping ACL cleanup`);
    return;
  }

  const currentList = transcription[listAttribute] || [];
  if (!currentList.includes(userIdentifier)) {
    console.log(`User ${userIdentifier} not in ${listAttribute} for transcription ${transcriptionId}`);
    return;
  }

  const updatedList = currentList.filter(id => id !== userIdentifier);

  const result = await docClient.send(new UpdateCommand({
    TableName: tableName,
    Key: { id: transcriptionId },
    UpdateExpression: 'SET #list = :updatedList, #updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#list': listAttribute, '#updatedAt': 'dateLastUpdated' },
    ExpressionAttributeValues: { ':updatedList': updatedList, ':updatedAt': now },
    ReturnValues: 'ALL_NEW'
  }));

  console.log(`User ${userIdentifier} removed from ${listAttribute} for transcription ${transcriptionId}`);
  return result.Attributes;
}

module.exports = { addUserToTranscription, removeUserFromTranscription };
