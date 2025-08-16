const assert = require('assert')

const sapir = require('./sapir')
const utils = require('../utils')

const { client } = require('./es')

const clearKnownWordsForRegion = async (regionId) => {
  const indexName = `knownwords-${process.env.ENV}`
  console.log('Clearing out region items for ', regionId, 'in index', indexName)
  
  try {
    const deleted = await client.deleteByQuery({
      index: indexName,
      body: {
        query: {
          match: { regionId: regionId },
        },
      },
    })
    return deleted
  } catch (error) {
    // Handle index not found error gracefully - this happens on first run
    if (error.meta?.statusCode === 404 && error.meta?.body?.error?.type === 'index_not_found_exception') {
      console.log(`ℹ️ Index ${indexName} doesn't exist yet - will be created on first indexing operation`)
      return { deleted: 0 }
    }
    // Re-throw other errors
    throw error
  }
}

const indexRegionAnalysis = async (region, transcription) => {
  // Skip indexing if transcription has no language set
  if (!transcription.lang) {
    console.log('⚠️ Skipping indexing - no lang set on transcription')
    return
  }
  const languageCode = transcription.lang

  // Use regionAnalysis array instead of parsing regionText for known words
  const words = region.regionAnalysis || []
  console.log('Words to index from regionAnalysis:', words)

  if (words.length === 0) {
    console.log('No words in regionAnalysis to index')
    return
  }

  // Get full region text for context (if available)
  let sentence = ''
  if (region.regionText) {
    // regionText is now stored as plain text
    sentence = region.regionText
  }

  // Process words in parallel using Promise.allSettled for better performance
  const wordProcessingPromises = words.map(async (word) => {
    let surface = utils.toCircumflex(word)
    // strip out any goofy characters
    surface = surface.replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '').trim()
    
    if (!surface) {
      console.log('Skipping empty word after normalization:', word)
      return { status: 'skipped', word, reason: 'empty after normalization' }
    }
    
    console.log('Processing word:', surface)
    
    try {
      // TODO: check for IPC
      // TODO: pull only wolvengrey
      // TODO: exact-match results
      const raw = await sapir.clickInText(surface)
      const results = raw.data.results

      if (results.length) {
        const lemma = results[0].lemma_wordform.text
        const wordType = results[0].lemma_wordform.pos
        const wordClass = results[0].lemma_wordform.wordclass
        console.log(`Got lemma for surface form '${surface}': ${lemma}`)

        const toIndex = {
          lang: languageCode, // Use transcription language
          lemma,
          surface,
          transcriptionId: region.transcriptionId,
          regionId: region.id,
          regionText: utils.toCircumflex(sentence),
          wordType,
          wordClass,
          transcriptionName: transcription.title,
          timestamp: `${region.start}:${region.end}`,
        }

        const indexName = `knownwords-${process.env.ENV}`
        const success = await client.update({
          index: indexName,
          id: `${toIndex.regionId}-${surface}`,
          body: {
            // put the partial document under the `doc` key
            doc: toIndex,
            doc_as_upsert: true,
          },
        })
        
        // OpenSearch client response structure - check for successful indexing
        const isSuccessful = success.body?._shards?.successful > 0 || 
                           success.statusCode === 200 || 
                           success.statusCode === 201
        
        return { 
          status: 'indexed', 
          word: surface, 
          lemma,
          successful: isSuccessful,
          response: success.body?.result || 'success'
        }
      } else {
        console.log(`No results found for word: ${surface}`)
        return { status: 'no_results', word: surface }
      }
    } catch (error) {
      console.error(`Error processing word "${surface}":`, error.message)
      return { status: 'error', word: surface, error: error.message }
    }
  })

  // Wait for all word processing to complete
  const results = await Promise.allSettled(wordProcessingPromises)
  
  // Log summary of results
  const summary = {
    total: words.length,
    indexed: 0,
    failed: 0,
    skipped: 0,
    no_results: 0
  }
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const wordResult = result.value
      summary[wordResult.status] = (summary[wordResult.status] || 0) + 1
      
      if (wordResult.status === 'error') {
        console.error(`Word processing failed:`, wordResult)
      }
    } else {
      summary.failed++
      console.error(`Promise rejected for word ${words[index]}:`, result.reason)
    }
  })
  
  console.log('Word processing summary:', summary)
}

const clearIssuesForRegion = async (regionId) => {
  const indexName = `issues-${process.env.ENV}`
  console.log('Clearing out issue items for region', regionId, 'in index', indexName)
  
  try {
    const deleted = await client.deleteByQuery({
      index: indexName,
      body: {
        query: {
          match: { regionId: regionId },
        },
      },
    })
    return deleted
  } catch (error) {
    // Handle index not found error gracefully - this happens on first run
    if (error.meta?.statusCode === 404 && error.meta?.body?.error?.type === 'index_not_found_exception') {
      console.log(`ℹ️ Index ${indexName} doesn't exist yet - will be created on first indexing operation`)
      return { deleted: 0 }
    }
    // Re-throw other errors
    throw error
  }
}

const indexIssuesForRegion = async (issues, region, transcription) => {
  // Skip indexing if transcription doesn't allow public issues
  if (!transcription.publicIssues) {
    console.log('⚠️ Skipping issue indexing - publicIssues is false on transcription')
    return
  }

  if (!issues || issues.length === 0) {
    console.log('No issues to index for region', region.id)
    return
  }

  // Filter out resolved issues - we only want to index active/unresolved issues
  const unresolvedIssues = issues.filter(issue => !issue.resolved)
  
  if (unresolvedIssues.length === 0) {
    console.log(`No unresolved issues to index for region ${region.id} (${issues.length} total issues, all resolved)`)
    return
  }

  console.log(`Indexing ${unresolvedIssues.length} unresolved issues for region ${region.id} (${issues.length} total issues)`)

  // Process unresolved issues in parallel using Promise.allSettled
  const issueProcessingPromises = unresolvedIssues.map(async (issue) => {
    try {
      const toIndex = {
        lang: transcription.lang || null, // Language is optional for issues
        issueId: issue.id,
        issueText: issue.text,
        issueType: issue.type,
        resolved: issue.resolved || false,
        transcriptionId: issue.transcriptionId,
        regionId: issue.regionId,
        regionText: region.regionText || '',
        regionStart: region.start,
        regionEnd: region.end,
        transcriptionName: transcription.title,
        transcriptionSource: transcription.source,
        dateLastUpdated: issue.dateLastUpdated,
        owner: issue.owner,
        ownerFriendly: issue.ownerFriendly
      }

      const indexName = `issues-${process.env.ENV}`
      const success = await client.update({
        index: indexName,
        id: issue.id, // Use issue ID as the document ID
        body: {
          doc: toIndex,
          doc_as_upsert: true,
        },
      })

      // Check for successful indexing
      const isSuccessful = success.body?._shards?.successful > 0 || 
                         success.statusCode === 200 || 
                         success.statusCode === 201

      return { 
        status: 'indexed', 
        issueId: issue.id, 
        issueText: issue.text,
        successful: isSuccessful,
        response: success.body?.result || 'success'
      }
    } catch (error) {
      console.error(`Error indexing issue "${issue.id}":`, error.message)
      return { status: 'error', issueId: issue.id, error: error.message }
    }
  })

  // Wait for all issue processing to complete
  const results = await Promise.allSettled(issueProcessingPromises)
  
  // Log summary of results
  const summary = {
    total: unresolvedIssues.length,
    indexed: 0,
    failed: 0,
    error: 0
  }
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const issueResult = result.value
      summary[issueResult.status] = (summary[issueResult.status] || 0) + 1
      
      if (issueResult.status === 'error') {
        console.error(`Issue indexing failed:`, issueResult)
      }
    } else {
      summary.failed++
      console.error(`Promise rejected for issue ${unresolvedIssues[index].id}:`, result.reason)
    }
  })
  
  console.log('Issue indexing summary:', summary)
  return summary
}

module.exports = {
  clearKnownWordsForRegion,
  clearIssuesForRegion,
  indexRegionAnalysis,
  indexIssuesForRegion,
}
