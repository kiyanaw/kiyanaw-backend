const dynamo = require('./dynamo')
const search = require('./search')
const s3 = require('./s3')

/**
 * Delete all regions for a transcription from DynamoDB
 * @param {string} transcriptionId - The transcription ID
 * @returns {Promise<{success: boolean, deleted: number, error?: Error}>}
 */
const deleteRegionsForTranscription = async (transcriptionId) => {
  try {
    const regionTable = process.env.API_KIYANAW_REGIONTABLE_NAME
    console.log(`Deleting regions for transcription ${transcriptionId}`)
    
    // Get all regions for this transcription using the ByTranscription index
    const regions = await dynamo.getRegionsForTranscription(transcriptionId, regionTable)
    
    if (regions.length === 0) {
      console.log(`No regions found for transcription ${transcriptionId}`)
      return { success: true, deleted: 0 }
    }
    
    console.log(`Found ${regions.length} regions to delete`)
    
    // Delete regions in batches (DynamoDB batch limit is 25)
    const batchSize = 25
    let totalDeleted = 0
    
    for (let i = 0; i < regions.length; i += batchSize) {
      const batch = regions.slice(i, i + batchSize)
      const deleteRequests = batch.map(region => ({
        DeleteRequest: {
          Key: { id: region.id }
        }
      }))
      
      const batchParams = {
        RequestItems: {
          [regionTable]: deleteRequests
        }
      }
      
      await dynamo.batchWrite(batchParams)
      totalDeleted += batch.length
      console.log(`Deleted batch of ${batch.length} regions (${totalDeleted}/${regions.length} total)`)
    }
    
    return { success: true, deleted: totalDeleted }
  } catch (error) {
    console.error('Failed to delete regions:', error)
    return { success: false, deleted: 0, error }
  }
}

/**
 * Delete all issues for a transcription from DynamoDB
 * @param {string} transcriptionId - The transcription ID
 * @returns {Promise<{success: boolean, deleted: number, error?: Error}>}
 */
const deleteIssuesForTranscription = async (transcriptionId) => {
  try {
    const issueTable = process.env.API_KIYANAW_ISSUETABLE_NAME
    console.log(`Deleting issues for transcription ${transcriptionId}`)
    
    // Get all issues for this transcription using the ByTranscription index
    const issues = await dynamo.getIssuesForTranscription(transcriptionId, issueTable)
    
    if (issues.length === 0) {
      console.log(`No issues found for transcription ${transcriptionId}`)
      return { success: true, deleted: 0 }
    }
    
    console.log(`Found ${issues.length} issues to delete`)
    
    // Delete issues in batches
    const batchSize = 25
    let totalDeleted = 0
    
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize)
      const deleteRequests = batch.map(issue => ({
        DeleteRequest: {
          Key: { id: issue.id }
        }
      }))
      
      const batchParams = {
        RequestItems: {
          [issueTable]: deleteRequests
        }
      }
      
      await dynamo.batchWrite(batchParams)
      totalDeleted += batch.length
      console.log(`Deleted batch of ${batch.length} issues (${totalDeleted}/${issues.length} total)`)
    }
    
    return { success: true, deleted: totalDeleted }
  } catch (error) {
    console.error('Failed to delete issues:', error)
    return { success: false, deleted: 0, error }
  }
}

/**
 * Delete all invites for a transcription from DynamoDB
 * @param {string} transcriptionId - The transcription ID
 * @returns {Promise<{success: boolean, deleted: number, error?: Error}>}
 */
const deleteInvitesForTranscription = async (transcriptionId) => {
  try {
    const inviteTable = process.env.API_KIYANAW_INVITETABLE_NAME
    console.log(`Deleting invites for transcription ${transcriptionId}`)
    
    // Get all invites for this transcription using the ByTranscription index
    const invites = await dynamo.getInvitesForTranscription(transcriptionId, inviteTable)
    
    if (invites.length === 0) {
      console.log(`No invites found for transcription ${transcriptionId}`)
      return { success: true, deleted: 0 }
    }
    
    console.log(`Found ${invites.length} invites to delete`)
    
    // Delete invites in batches
    const batchSize = 25
    let totalDeleted = 0
    
    for (let i = 0; i < invites.length; i += batchSize) {
      const batch = invites.slice(i, i + batchSize)
      const deleteRequests = batch.map(invite => ({
        DeleteRequest: {
          Key: { id: invite.id }
        }
      }))
      
      const batchParams = {
        RequestItems: {
          [inviteTable]: deleteRequests
        }
      }
      
      await dynamo.batchWrite(batchParams)
      totalDeleted += batch.length
      console.log(`Deleted batch of ${batch.length} invites (${totalDeleted}/${invites.length} total)`)
    }
    
    return { success: true, deleted: totalDeleted }
  } catch (error) {
    console.error('Failed to delete invites:', error)
    return { success: false, deleted: 0, error }
  }
}

/**
 * Comprehensive cleanup when a transcription is deleted
 * Deletes all related data with proper error isolation
 * @param {string} transcriptionId - The transcription ID to clean up
 * @param {string} sourceUrl - The S3 source URL (optional)
 * @returns {Promise<{summary: object, hasErrors: boolean}>}
 */
const cleanupDeletedTranscription = async (transcriptionId, sourceUrl = null) => {
  console.log(`🧹 Starting comprehensive cleanup for transcription ${transcriptionId}`)
  
  const results = {
    openSearchWords: { success: false, deleted: 0 },
    openSearchIssues: { success: false, deleted: 0 },
    dynamoRegions: { success: false, deleted: 0 },
    dynamoIssues: { success: false, deleted: 0 },
    dynamoInvites: { success: false, deleted: 0 },
    s3Files: { success: false, deleted: 0 },
    transcriptionRecord: { success: false, deleted: 0 }
  }
  
  // 1. Clear OpenSearch indexes (words and issues)
  try {
    console.log('🔍 Clearing OpenSearch words index...')
    const wordsResult = await search.clearKnownWordsForTranscription(transcriptionId)
    results.openSearchWords = { success: true, deleted: wordsResult.deleted || 0 }
    console.log(`✅ Cleared ${results.openSearchWords.deleted} words from OpenSearch`)
  } catch (error) {
    console.error('❌ Failed to clear OpenSearch words:', error)
    results.openSearchWords = { success: false, deleted: 0, error }
  }
  
  try {
    console.log('🔍 Clearing OpenSearch issues index...')
    const issuesResult = await search.clearIssuesForTranscription(transcriptionId)
    results.openSearchIssues = { success: true, deleted: issuesResult.deleted || 0 }
    console.log(`✅ Cleared ${results.openSearchIssues.deleted} issues from OpenSearch`)
  } catch (error) {
    console.error('❌ Failed to clear OpenSearch issues:', error)
    results.openSearchIssues = { success: false, deleted: 0, error }
  }
  
  // 2. Delete DynamoDB records (regions, issues, invites)
  console.log('🗄️ Deleting DynamoDB records...')
  const [regionsResult, issuesResult, invitesResult] = await Promise.allSettled([
    deleteRegionsForTranscription(transcriptionId),
    deleteIssuesForTranscription(transcriptionId),
    deleteInvitesForTranscription(transcriptionId)
  ])
  
  // Process DynamoDB results
  if (regionsResult.status === 'fulfilled') {
    results.dynamoRegions = regionsResult.value
    console.log(`✅ Deleted ${results.dynamoRegions.deleted} regions from DynamoDB`)
  } else {
    console.error('❌ Failed to delete regions:', regionsResult.reason)
    results.dynamoRegions = { success: false, deleted: 0, error: regionsResult.reason }
  }
  
  if (issuesResult.status === 'fulfilled') {
    results.dynamoIssues = issuesResult.value
    console.log(`✅ Deleted ${results.dynamoIssues.deleted} issues from DynamoDB`)
  } else {
    console.error('❌ Failed to delete issues:', issuesResult.reason)
    results.dynamoIssues = { success: false, deleted: 0, error: issuesResult.reason }
  }
  
  if (invitesResult.status === 'fulfilled') {
    results.dynamoInvites = invitesResult.value
    console.log(`✅ Deleted ${results.dynamoInvites.deleted} invites from DynamoDB`)
  } else {
    console.error('❌ Failed to delete invites:', invitesResult.reason)
    results.dynamoInvites = { success: false, deleted: 0, error: invitesResult.reason }
  }
  
  // 3. Delete S3 files (if source URL provided)
  if (sourceUrl) {
    try {
      console.log('🪣 Deleting S3 files...')
      const s3Result = await s3.deleteTranscriptionFiles(sourceUrl)
      const successfulDeletions = s3Result.filter(r => r.status === 'fulfilled').length
      results.s3Files = { success: true, deleted: successfulDeletions }
      console.log(`✅ Deleted ${successfulDeletions} S3 files`)
    } catch (error) {
      console.error('❌ Failed to delete S3 files:', error)
      results.s3Files = { success: false, deleted: 0, error }
    }
  } else {
    console.log('⚠️ No source URL provided, skipping S3 deletion')
    results.s3Files = { success: true, deleted: 0 } // Not an error, just no files to delete
  }
  
  // 4. Hard delete the transcription record from DynamoDB (cleanup Amplify soft delete)
  try {
    console.log('🗑️ Hard deleting transcription record from DynamoDB...')
    const transcriptionTable = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME
    
    await dynamo.deleteItem({
      TableName: transcriptionTable,
      Key: {
        id: transcriptionId
      }
    })
    
    results.transcriptionRecord = { success: true, deleted: 1 }
    console.log('✅ Successfully hard deleted transcription record from DynamoDB')
  } catch (error) {
    console.error('❌ Failed to hard delete transcription record:', error)
    results.transcriptionRecord = { success: false, deleted: 0, error }
  }
  
  // Calculate summary
  const hasErrors = Object.values(results).some(result => !result.success)
  const totalDeleted = Object.values(results).reduce((sum, result) => sum + result.deleted, 0)
  
  console.log(`🏁 Cleanup completed for transcription ${transcriptionId}:`)
  console.log(`   Total items deleted: ${totalDeleted}`)
  console.log(`   Errors encountered: ${hasErrors ? 'Yes' : 'No'}`)
  
  return {
    summary: results,
    hasErrors,
    totalDeleted
  }
}

module.exports = {
  deleteRegionsForTranscription,
  deleteIssuesForTranscription,
  deleteInvitesForTranscription,
  cleanupDeletedTranscription
}
