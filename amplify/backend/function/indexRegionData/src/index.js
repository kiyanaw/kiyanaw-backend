/* Amplify Params - DO NOT EDIT
	API_KIYANAW_GRAPHQLAPIIDOUTPUT
	API_KIYANAW_ISSUETABLE_ARN
	API_KIYANAW_ISSUETABLE_NAME
	API_KIYANAW_REGIONTABLE_ARN
	API_KIYANAW_REGIONTABLE_NAME
	API_KIYANAW_TRANSCRIPTIONTABLE_ARN
	API_KIYANAW_TRANSCRIPTIONTABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

/**
 * Region Data Indexing Lambda Function
 * 
 * This Lambda function processes region data changes and updates the search index
 * for the Language Database. It's triggered via SQS when regions are created,
 * updated, or deleted.
 * 
 * Main Logic Flow:
 * 1. Receives a region ID from the SQS queue
 * 2. Fetches the region data from DynamoDB
 * 3. Fetches the parent transcription data to check visibility rules
 * 4. Validates what should be indexed based on transcription settings:
 *    - Region words: Transcription must not be private (isPrivate = false) AND have language
 *    - Issues: Transcription must have publicIssues = true (language optional)
 * 5. If region is deleted or not found, cleans up existing search index entries
 * 6. If region exists and passes validation:
 *    - Clears existing search index entries for the region
 *    - Indexes the region's analyzed words (if transcription is public)
 *    - Fetches and indexes issues for the region (if publicIssues is enabled)
 * 
 * Issue Indexing includes:
 * - Issue text, type, and resolution status
 * - Associated region text, start/end times
 * - Transcription name and source
 * - Owner information
 * 
 * The search indexing enables:
 * - Discovery of analyzed text in the Language Database
 * - Searchable corpus of language data and issues
 * - Separate visibility controls for regions vs issues
 * - Only includes data from transcriptions with appropriate public settings
 * 
 * Future TODOs:
 * - Implement region change notifications
 */

const dynamo = require('./lib/dynamo')
const search = require('./lib/search')

const { okResponse } = require('./utils')

/**
 * Get all issues for a specific region
 * @param {string} regionId 
 * @param {string} issueTable 
 * @returns {Promise<Array>} Array of issues
 */
const getIssuesForRegion = async (regionId, issueTable) => {
  try {
    // Query issues by regionId - we need to scan since regionId is not the primary key
    // In a production system, you might want to add a GSI for regionId
    const params = {
      TableName: issueTable,
      FilterExpression: 'regionId = :regionId',
      ExpressionAttributeValues: {
        ':regionId': regionId
      }
    }
    
    const result = await dynamo.scan(params)
    return result.Items || []
  } catch (error) {
    console.error('Error getting issues for region:', error)
    return []
  }
}

/**
 * Process A: Region Word Indexing (atomic operation)
 * Clear existing entries and re-index region words
 * Failures in this process don't affect issue processing
 */
const processRegionWords = async (region, transcription) => {
  try {
    console.log('🔄 Starting region word processing for region:', region.id)
    
    // Step 1: Clear existing entries
    const deletedWords = await search.clearKnownWordsForRegion(region.id)
    console.log('✅ Cleared existing word entries:', deletedWords)
    
    // Step 2: Index new entries (back-to-back with clearing)
    const indexedWords = await search.indexRegionAnalysis(region, transcription)
    console.log('✅ Indexed region words:', indexedWords)
    
    console.log('✅ Region word processing completed successfully')
  } catch (error) {
    console.error('❌ Region word processing failed:', error)
    // Don't throw - this should not stop issue processing
  }
}

/**
 * Process B: Issue Indexing (atomic operation)
 * Clear existing entries and re-index issues for the region
 * Independent of region word processing
 */
const processRegionIssues = async (region, transcription, issueTable) => {
  try {
    console.log('🔄 Starting issue processing for region:', region.id)
    
    // Step 1: Clear existing entries
    const deletedIssues = await search.clearIssuesForRegion(region.id)
    console.log('✅ Cleared existing issue entries:', deletedIssues)
    
    // Step 2: Fetch and index new issues (back-to-back with clearing)
    console.log('📥 Fetching issues for region:', region.id)
    const issues = await getIssuesForRegion(region.id, issueTable)
    console.log(`📊 Found ${issues.length} issues for region`)
    
    if (issues.length > 0) {
      const indexedIssues = await search.indexIssuesForRegion(issues, region, transcription)
      console.log('✅ Indexed issues:', indexedIssues)
    } else {
      console.log('ℹ️ No issues to index for this region')
    }
    
    console.log('✅ Issue processing completed successfully')
  } catch (error) {
    console.error('❌ Issue processing failed:', error)
    // Don't throw - this is isolated from other processing
  }
}

/**
 * Cleanup for deleted regions - remove all search index entries
 * Runs both cleanup operations independently with error isolation
 */
const cleanupDeletedRegion = async (regionId) => {
  // Clean up word entries
  try {
    const deletedWords = await search.clearKnownWordsForRegion(regionId)
    console.log('✅ Cleaned up word entries for deleted region:', deletedWords)
  } catch (error) {
    console.error('❌ Failed to clean up word entries for deleted region:', error)
  }
  
  // Clean up issue entries (independent of word cleanup)
  try {
    const deletedIssues = await search.clearIssuesForRegion(regionId)
    console.log('✅ Cleaned up issue entries for deleted region:', deletedIssues)
  } catch (error) {
    console.error('❌ Failed to clean up issue entries for deleted region:', error)
  }
}

exports.handler = async (event) => {
  const record = event.Records[0]
  console.log('record', JSON.stringify(record))

  // Get table names from environment variables
  const transcriptionTable = process.env.API_KIYANAW_TRANSCRIPTIONTABLE_NAME
  const regionTable = process.env.API_KIYANAW_REGIONTABLE_NAME
  const issueTable = process.env.API_KIYANAW_ISSUETABLE_NAME

  if (!transcriptionTable || !regionTable || !issueTable) {
    console.error('Missing table name environment variables')
    return okResponse()
  }

  if (!(record && record.body)) {
    return okResponse()
  }

  const regionId = record.body
  console.log('Processing region', regionId)

  let region
  try {
    region = await dynamo.getDoc({
      TableName: regionTable,
      Key: {
        id: regionId,
      },
    })
  } catch (err) {
    console.error('Error getting region', err)
    return okResponse()
  }

  // Handle case where region is not found (deleted) - still clean up search index
  if (!region) {
    console.warn('Region not found (possibly deleted)', regionId)
    console.log('🧹 Cleaning up search index entries for deleted region:', regionId)
    
    // Clean up both word and issue indexes for deleted region
    await cleanupDeletedRegion(regionId)
    
    return okResponse()
  }

  region = region.Item
  console.log('Got region', region)

  // get transcription
  let transcription
  try {
    // work around the Lambda syntax error
    transcription = await dynamo.getDoc({
      TableName: transcriptionTable,
      Key: {
        id: region.transcriptionId,
      },
    })
  } catch (err) {
    console.error('Error getting transcription', err)
    return okResponse()
  }

  if (!transcription) {
    console.warn('Transcription not found', region.transcriptionId)
    return okResponse()
  }

  transcription = transcription.Item
  console.log('transcription', transcription)

  // Determine what processing should happen
  const shouldProcessRegions = !transcription.isPrivate && transcription.lang
  const shouldProcessIssues = transcription.publicIssues

  if (!shouldProcessRegions && !shouldProcessIssues) {
    console.log('Not processing transcription - no indexing rules met:', {
      isPrivate: transcription.isPrivate,
      publicIssues: transcription.publicIssues,
      lang: transcription.lang
    })
    return okResponse()
  }

  console.log('Processing plan:', {
    regions: shouldProcessRegions,
    issues: shouldProcessIssues
  })

  /**
   * Process A: Region Word Indexing (atomic operation)
   */
  if (shouldProcessRegions) {
    await processRegionWords(region, transcription)
  } else {
    console.log('Skipping region word indexing - transcription is private or has no language')
  }

  /**
   * Process B: Issue Indexing (atomic operation, independent of region processing)
   */
  if (shouldProcessIssues) {
    await processRegionIssues(region, transcription, issueTable)
  } else {
    console.log('Skipping issue indexing - publicIssues is false')
  }

  /**
   * Notify of region changes
   */
  // TODO

  return okResponse()
}
