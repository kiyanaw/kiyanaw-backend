const { Transducer } = require('hfstol');

const PATH_TO_STRICT_ANALYZER = "/opt/crk-strict-analyzer.hfstol";
const PATH_TO_RELAXED_ANALYZER = "/opt/crk-relaxed-analyzer.hfstol";
const PATH_TO_STRICT_GENERATOR = "/opt/crk-strict-generator.hfstol";

/**
 * Converts macron diacritics to circumflex diacritics and strips punctuation
 * This is standard normalization for Plains Cree orthography
 * 
 * @param {string} text - The text to process
 * @returns {string} - Normalized text with circumflex diacritics and no punctuation
 */
const processCharacters = (text) => {
  if (!text || typeof text !== 'string') {
    return text
  }
  
  return text
    .replace(/ā/g, 'â')
    .replace(/ī/g, 'î')
    .replace(/ō/g, 'ô')
    .replace(/ē/g, 'ê')
    .replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '')
    .trim()
}

const HEADERS = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

// Cache transducers to avoid reloading
let strictAnalyzer = null;
let relaxedAnalyzer = null;
let strictGenerator = null;

function getStrictAnalyzer() {
  if (!strictAnalyzer) {
    try {
      strictAnalyzer = new Transducer(PATH_TO_STRICT_ANALYZER);
    } catch (e) {
      console.error('Failed to load strict analyzer:', e);
      throw e;
    }
  }
  return strictAnalyzer;
}

function getRelaxedAnalyzer() {
  if (!relaxedAnalyzer) {
    try {
      relaxedAnalyzer = new Transducer(PATH_TO_RELAXED_ANALYZER);
    } catch (e) {
      console.error('Failed to load relaxed analyzer:', e);
      throw e;
    }
  }
  return relaxedAnalyzer;
}

function getStrictGenerator() {
  if (!strictGenerator) {
    try {
      strictGenerator = new Transducer(PATH_TO_STRICT_GENERATOR);
    } catch (e) {
      console.error('Failed to load strict generator:', e);
      throw e;
    }
  }
  return strictGenerator;
}

exports.handler = async (event, context) => {
  console.log('received event:', event);

  let response;
  if (event.path === '/crk/bulk-lookup' || event.path === '/crgn/bulk-lookup') {
    response = await bulkLookup(event);
  } else if (event.path === '/crk/suggest' || event.path === '/crgn/suggest') {
    response = await suggest(event);
  } else {
    response = {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ message: 'Not found' })
    };
  }

  return response;
};

async function bulkLookup(event) {
  let statusCode = 200;
  let result = {};
  
  if (!event.body) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: 'No body was found' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Body:', body);
    
    // Process characters for CRK normalization before analysis
    const processedWords = body.map(word => processCharacters(word));
    console.log('Processed words:', processedWords);
    
    // Create mapping between original and processed words
    const wordMapping = {};
    body.forEach((original, index) => {
      const processed = processedWords[index];
      if (processed !== original) {
        wordMapping[processed] = original;
      }
    });
    
    const analysisResult = await analyzeStrict(processedWords);
    console.log('analysisResult:', analysisResult);
    
    // Map results back to original words
    result = {};
    for (const [processedWord, analyses] of Object.entries(analysisResult)) {
      const originalWord = wordMapping[processedWord] || processedWord;
      result[originalWord] = analyses;
    }
    
    console.log('result:', result);
  } catch (e) {
    console.error('Error reading post body:', e);
    result = { error: e.message };
    statusCode = 500;
  }

  try {
    const unknowns = Object.keys(result).filter(s => result[s].length === 0);
    result._suggestions = await checkUnknowns(unknowns);
  } catch (e) {
    console.error('Error generating suggestions:', e);
  }

  console.log('final:', result);
  return {
    statusCode: statusCode,
    headers: HEADERS,
    body: JSON.stringify(result)
  };
}

async function suggest(event) {
  let statusCode = 200;
  let final = {};
  
  if (!event.body) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: 'No body was found' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Body:', body);
    
    // Process characters for CRK normalization before checking suggestions
    const processedWords = body.map(word => processCharacters(word));
    console.log('Processed words:', processedWords);
    
    // Create mapping between original and processed words
    const wordMapping = {};
    body.forEach((original, index) => {
      const processed = processedWords[index];
      if (processed !== original) {
        wordMapping[processed] = original;
      }
    });
    
    const suggestionResult = await checkUnknowns(processedWords);
    console.log('suggestionResult:', suggestionResult);
    
    // Map results back to original words
    final = {};
    for (const [processedWord, suggestions] of Object.entries(suggestionResult)) {
      const originalWord = wordMapping[processedWord] || processedWord;
      final[originalWord] = suggestions;
    }
    
  } catch (e) {
    console.error('Error reading post body:', e);
    statusCode = 500;
  }

  console.log('final:', final);
  return {
    statusCode: statusCode,
    headers: HEADERS,
    body: JSON.stringify(final)
  };
}

async function checkUnknowns(items) {
  const final = {};
  const result = await analyzeRelaxed(items);
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
    const suggested = await generateStrict(toLookup);
    console.log('suggested:', suggested);
    
    for (const [analysis, surfaceForms] of Object.entries(suggested)) {
      if (surfaceForms && surfaceForms.length > 0) {
        const originalWord = originalLookup[analysis];
        // Return array of suggestions with both word and analysis
        final[originalWord] = surfaceForms.map(word => ({
          word: word,
          analysis: analysis
        }));
      }
    }
  }

  return final;
}

/**
 * Sorts analyses to prioritize particles (Ipc) over verbs (V) and nouns (N)
 * For CRK, particles are often the most common/simple interpretation
 * 
 * @param {string[]} analyses - Array of analysis strings
 * @returns {string[]} - Sorted array with Ipc first
 */
function sortAnalysesByType(analyses) {
  if (!analyses || analyses.length <= 1) {
    return analyses;
  }
  
  return analyses.sort((a, b) => {
    const aHasIpc = a.includes('+Ipc');
    const bHasIpc = b.includes('+Ipc');
    const aHasVorN = a.includes('+V+') || a.includes('+N+');
    const bHasVorN = b.includes('+V+') || b.includes('+N+');
    
    // If one has Ipc and the other has V or N, prioritize Ipc
    if (aHasIpc && bHasVorN) return -1;
    if (bHasIpc && aHasVorN) return 1;
    
    // Otherwise maintain original order
    return 0;
  });
}

async function analyzeStrict(lookup) {
  const fst = getStrictAnalyzer();
  const result = {};
  
  for (const word of lookup) {
    try {
      const rawAnalyses = fst.lookup(word);
      // Filter out error analyses (anything containing +Err/)
      // These are fragments or orthographic errors that shouldn't be shown to users
      const filtered = rawAnalyses.filter(analysis => !analysis.includes('+Err/'));
      // Sort to prioritize particles over verbs/nouns
      result[word] = sortAnalysesByType(filtered);
    } catch (e) {
      console.error(`Error looking up word "${word}":`, e);
      result[word] = [];
    }
  }
  
  return result;
}

async function analyzeRelaxed(lookup) {
  const fst = getRelaxedAnalyzer();
  const result = {};
  
  for (const word of lookup) {
    try {
      const rawAnalyses = fst.lookup(word);
      // Filter out error analyses (anything containing +Err/)
      // These are fragments or orthographic errors that shouldn't be shown to users
      result[word] = rawAnalyses.filter(analysis => !analysis.includes('+Err/'));
    } catch (e) {
      console.error(`Error looking up word "${word}":`, e);
      result[word] = [];
    }
  }
  
  return result;
}

async function generateStrict(lookup) {
  const fst = getStrictGenerator();
  const result = {};
  
  for (const word of lookup) {
    try {
      result[word] = fst.lookup(word);
    } catch (e) {
      console.error(`Error looking up word "${word}":`, e);
      result[word] = [];
    }
  }
  
  return result;
}
