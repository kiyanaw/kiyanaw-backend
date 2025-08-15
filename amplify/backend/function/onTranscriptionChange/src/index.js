/* Amplify Params - DO NOT EDIT
	API_KIYANAW_COMMENTTABLE_ARN
	API_KIYANAW_COMMENTTABLE_NAME
	API_KIYANAW_GRAPHQLAPIIDOUTPUT
	API_KIYANAW_INVITETABLE_ARN
	API_KIYANAW_INVITETABLE_NAME
	API_KIYANAW_ISSUETABLE_ARN
	API_KIYANAW_ISSUETABLE_NAME
	API_KIYANAW_REGIONTABLE_ARN
	API_KIYANAW_REGIONTABLE_NAME
	API_KIYANAW_TRANSCRIPTIONTABLE_ARN
	API_KIYANAW_TRANSCRIPTIONTABLE_NAME
	ENV
	REGION
	STORAGE_TRANSCRIPTIONS_BUCKETNAME
Amplify Params - DO NOT EDIT */

/* Also (added manually): 
  OPENSEARCH_ENDPOINT
*/

const AWS = require('aws-sdk')
const dynamo = require('./lib/dynamo')
const search = require('./lib/search')
const s3 = require('./lib/s3')
const cleanup = require('./lib/cleanup')
const { okResponse } = require('./utils')

const sqs = new AWS.SQS({ region: process.env.REGION })
const queueUrl = `https://sqs.${process.env.REGION}.amazonaws.com/${process.env.ACCOUNT_ID}/enqueueRegionChanges-${process.env.ENV}`

/**
 * Get all region IDs for a transcription
 * @param {string} transcriptionId 
 * @returns {Promise<string[]>} Array of region IDs
 */
const getRegionIdsForTranscription = async (transcriptionId) => {
  const regionTable = process.env.API_KIYANAW_REGIONTABLE_NAME
  
  const params = {
    TableName: regionTable,
    IndexName: 'ByTranscription',
    KeyConditionExpression: 'transcriptionId = :transcriptionId',
    ExpressionAttributeValues: {
      ':transcriptionId': transcriptionId
    },
    ProjectionExpression: 'id'
  }
  
  const result = await dynamo.query(params)
  return result.Items ? result.Items.map(item => item.id) : []
}

/**
 * Enqueue region IDs in bulk to SQS
 * @param {string[]} regionIds 
 */
const bulkEnqueueRegions = async (regionIds) => {
  if (regionIds.length === 0) {
    console.log('No regions to enqueue')
    return
  }
  
  console.log(`Enqueuing ${regionIds.length} regions for reprocessing`)
  console.log(`Enqueue URL ${queueUrl}`)
  
  // Send in batches of 10 (SQS batch limit)
  const batchSize = 10
  const batches = []
  
  for (let i = 0; i < regionIds.length; i += batchSize) {
    batches.push(regionIds.slice(i, i + batchSize))
  }
  
  for (const batch of batches) {
    const entries = batch.map((regionId, index) => ({
      Id: `${index}`,
      MessageBody: regionId
    }))
    
    const params = {
      QueueUrl: queueUrl,
      Entries: entries
    }
    
    try {
      const response = await sqs.sendMessageBatch(params).promise()
      console.log(`Batch sent: ${response.Successful.length} successful, ${response.Failed.length} failed`)
    } catch (error) {
      console.error('Error sending batch:', error)
    }
  }
}

/**
 * Check if lang is considered valid (not empty, null, or undefined)
 * @param {*} lang 
 * @returns {boolean}
 */
const isValidLang = (lang) => {
  return lang && lang !== '' && lang !== null && lang !== undefined
}

/**
 * @type {import('@types/aws-lambda').DynamoDBStreamHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`)
  
  for (const record of event.Records) {
    console.log('Processing record:', record.eventID)
    console.log('Event name:', record.eventName)
    
    const oldImage = record.dynamodb.OldImage ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage) : null
    const newImage = record.dynamodb.NewImage ? AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage) : null
    
    console.log('Old image:', oldImage)
    console.log('New image:', newImage)
    
    // Get transcription ID from either old or new image
    const transcriptionId = newImage?.id || oldImage?.id
    if (!transcriptionId) {
      console.warn('No transcription ID found in record')
      continue
    }
    
    // Case 1: Transcription deleted (no new record)
    if (record.eventName === 'REMOVE' && !newImage) {
      console.log(`Transcription ${transcriptionId} deleted - performing comprehensive cleanup`)
      
      const sourceUrl = oldImage?.source || null
      const cleanupResult = await cleanup.cleanupDeletedTranscription(transcriptionId, sourceUrl)
      
      if (cleanupResult.hasErrors) {
        console.warn(`⚠️ Cleanup completed with errors for transcription ${transcriptionId}`)
        console.warn('Cleanup summary:', JSON.stringify(cleanupResult.summary, null, 2))
      } else {
        console.log(`✅ Cleanup completed successfully for transcription ${transcriptionId}`)
        console.log(`Total items deleted: ${cleanupResult.totalDeleted}`)
      }
      
      continue
    }
    
    // For INSERT/MODIFY events, we need both old and new to detect changes
    if (record.eventName === 'INSERT') {
      // New transcription - no action needed here
      console.log(`New transcription ${transcriptionId} created - no action needed`)
      continue
    }
    
    if (record.eventName === 'MODIFY' && oldImage && newImage) {
      const oldIsPrivate = oldImage.isPrivate
      const newIsPrivate = newImage.isPrivate
      const oldLang = oldImage.lang
      const newLang = newImage.lang
      const oldPublicIssues = oldImage.publicIssues
      const newPublicIssues = newImage.publicIssues
      
      console.log(`Transcription ${transcriptionId} modified:`)
      console.log(`  isPrivate: ${oldIsPrivate} -> ${newIsPrivate}`)
      console.log(`  lang: ${oldLang} -> ${newLang}`)
      console.log(`  publicIssues: ${oldPublicIssues} -> ${newPublicIssues}`)
      
      // Case 2: isPrivate changed to true - delete from OpenSearch
      if (!oldIsPrivate && newIsPrivate) {
        console.log('Transcription became private - clearing OpenSearch indexes')
        await search.clearKnownWordsForTranscription(transcriptionId)
        await search.clearIssuesForTranscription(transcriptionId)
        continue
      }
      
      // Case 2b: publicIssues changed to false - delete issues from OpenSearch
      if (oldPublicIssues && !newPublicIssues) {
        console.log('Issues became private - clearing OpenSearch issues index')
        await search.clearIssuesForTranscription(transcriptionId)
        continue
      }
      
      // Case 2c: publicIssues changed to true - re-enqueue all regions to index issues
      if (!oldPublicIssues && newPublicIssues) {
        console.log('Issues became public - re-enqueueing all regions to index issues')
        const regionIds = await getRegionIdsForTranscription(transcriptionId)
        await bulkEnqueueRegions(regionIds)
        continue
      }
      
      // Case 3: lang became invalid (empty/null) - delete from OpenSearch
      if (isValidLang(oldLang) && !isValidLang(newLang)) {
        console.log('Language became invalid - clearing OpenSearch index')
        await search.clearKnownWordsForTranscription(transcriptionId)
        continue
      }
      
      // Case 4: lang changed to valid value AND transcription is public - re-enqueue all regions
      if (oldLang !== newLang && isValidLang(newLang) && !newIsPrivate) {
        console.log('Language changed to valid value and transcription is public - re-enqueueing all regions')
        const regionIds = await getRegionIdsForTranscription(transcriptionId)
        await bulkEnqueueRegions(regionIds)
        continue
      }
      
      // Case 5: isPrivate changed to false - re-enqueue all regions
      if (oldIsPrivate && !newIsPrivate) {
        console.log('Transcription became public - re-enqueueing all regions')
        const regionIds = await getRegionIdsForTranscription(transcriptionId)
        await bulkEnqueueRegions(regionIds)
        continue
      }
    }
  }
  
  return okResponse()
}
