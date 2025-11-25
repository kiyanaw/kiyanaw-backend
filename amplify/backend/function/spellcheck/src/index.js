/**
 * Spellcheck Lambda Function
 * 
 * This Lambda function provides spell checking and word analysis services
 * for multiple languages. It supports:
 * - Bulk word lookup with analysis
 * - Word suggestion generation
 * 
 * Endpoints:
 * - POST /bulk-lookup - Analyze multiple words
 * - POST /suggest - Get suggestions for unknown words
 * 
 * Request body format:
 * {
 *   "languageCode": "crk",
 *   "words": ["word1", "word2", ...]
 * }
 */

const specialProcessing = require('./lib/special-processing');
const transducers = require('./lib/transducers');
const { parseRequestBody, errorResponse, successResponse, HEADERS } = require('./lib/utils');

/**
 * Process words with language-specific character normalization
 */
function processWords(words, languageCode) {
  const processor = specialProcessing.getLanguageProcessor(languageCode);
  
  if (processor && processor.processCharacters) {
    return words.map(word => processor.processCharacters(word));
  }
  
  // Fallback: no processing if no processor available
  return words;
}

/**
 * Create mapping between original and processed words
 */
function createWordMapping(originalWords, processedWords) {
  const mapping = {};
  originalWords.forEach((original, index) => {
    const processed = processedWords[index];
    if (processed !== original) {
      mapping[processed] = original;
    }
  });
  return mapping;
}

/**
 * Map analysis results back to original words
 */
function mapResultsToOriginalWords(analysisResult, wordMapping) {
  const result = {};
  for (const [processedWord, analyses] of Object.entries(analysisResult)) {
    const originalWord = wordMapping[processedWord] || processedWord;
    result[originalWord] = analyses;
  }
  return result;
}

/**
 * Handle bulk lookup endpoint
 */
async function bulkLookup(event) {
  const parsed = parseRequestBody(event.body);
  
  if (!parsed) {
    return errorResponse(400, 'Invalid body format. Expected { languageCode: string, words: string[] } or string[]');
  }
  
  const { languageCode, words } = parsed;
  
  if (!languageCode || typeof languageCode !== 'string') {
    return errorResponse(400, 'languageCode is required and must be a string');
  }
  
  if (!Array.isArray(words)) {
    return errorResponse(400, 'words must be an array');
  }
  
  try {
    // Process words with language-specific normalization
    const processedWords = processWords(words, languageCode);
    console.log('Processed words:', processedWords);
    
    // Create mapping between original and processed words
    const wordMapping = createWordMapping(words, processedWords);
    
    // Analyze words using strict analyzer
    const analysisResult = await transducers.analyzeStrict(processedWords, languageCode);
    console.log('analysisResult:', analysisResult);
    
    // Map results back to original words
    const result = mapResultsToOriginalWords(analysisResult, wordMapping);
    console.log('result:', result);
    
    // Generate suggestions for unknown words
    try {
      const unknowns = Object.keys(result).filter(s => result[s].length === 0);
      if (unknowns.length > 0) {
        result._suggestions = await checkUnknowns(unknowns, languageCode);
      }
    } catch (e) {
      console.error('Error generating suggestions:', e);
    }
    
    console.log('final:', result);
    return successResponse(200, result);
  } catch (e) {
    console.error('Error in bulk lookup:', e);
    return errorResponse(500, e.message);
  }
}

/**
 * Handle suggest endpoint
 */
async function suggest(event) {
  const parsed = parseRequestBody(event.body);
  
  if (!parsed) {
    return errorResponse(400, 'Invalid body format. Expected { languageCode: string, words: string[] } or string[]');
  }
  
  const { languageCode, words } = parsed;
  
  if (!languageCode || typeof languageCode !== 'string') {
    return errorResponse(400, 'languageCode is required and must be a string');
  }
  
  if (!Array.isArray(words)) {
    return errorResponse(400, 'words must be an array');
  }
  
  try {
    // Process words with language-specific normalization
    const processedWords = processWords(words, languageCode);
    console.log('Processed words:', processedWords);
    
    // Create mapping between original and processed words
    const wordMapping = createWordMapping(words, processedWords);
    
    // Get suggestions for unknown words
    const suggestionResult = await checkUnknowns(processedWords, languageCode);
    console.log('suggestionResult:', suggestionResult);
    
    // Map results back to original words
    const final = {};
    for (const [processedWord, suggestions] of Object.entries(suggestionResult)) {
      const originalWord = wordMapping[processedWord] || processedWord;
      final[originalWord] = suggestions;
    }
    
    console.log('final:', final);
    return successResponse(200, final);
  } catch (e) {
    console.error('Error in suggest:', e);
    return errorResponse(500, e.message);
  }
}

/**
 * Check unknown words and generate suggestions
 */
async function checkUnknowns(items, languageCode) {
  const final = {};
  const result = await transducers.analyzeRelaxed(items, languageCode);
  console.log('result:', result);

  const originalLookup = {};
  for (const [key, value] of Object.entries(result)) {
    if (value && value.length > 0) {
      originalLookup[value[0]] = key;
    }
  }
  console.log('original:', originalLookup);

  const toLookup = Object.keys(originalLookup);
  if (toLookup.length > 0) {
    const suggested = await transducers.generateStrict(toLookup, languageCode);
    console.log('suggested:', suggested);
    
    for (const key of Object.keys(suggested)) {
      if (suggested[key] && suggested[key].length > 0) {
        final[originalLookup[key]] = suggested[key][0];
      }
    }
  }

  return final;
}

/**
 * Main Lambda handler
 */
exports.handler = async (event, context) => {
  console.log('received event:', event);

  let response;
  if (event.path === '/bulk-lookup') {
    response = await bulkLookup(event);
  } else if (event.path === '/suggest') {
    response = await suggest(event);
  } else {
    response = errorResponse(404, 'Not found');
  }

  return response;
};

