const { Transducer } = require('hfstol');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { createWriteStream } = require('fs');
const { mkdir } = require('fs/promises');
const { join } = require('path');
const { pipeline } = require('stream/promises');

const FSTS_FOLDER = 'fsts';
const EFS_MOUNT_DIR = '/fsts';
const BUCKET_NAME = process.env.STORAGE_TRANSCRIPTIONS_BUCKETNAME;
const REGION = process.env.REGION || 'us-east-1';

if (!BUCKET_NAME) {
  throw new Error('STORAGE_TRANSCRIPTIONS_BUCKETNAME environment variable is not set');
}

const s3Client = new S3Client({ region: REGION });

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

// Cache transducers per language code to avoid reloading
const transducerCache = {};

/**
 * Download FST file from S3 to EFS mount point (only if it doesn't already exist)
 */
async function downloadFstFromS3(languageCode, fstType) {
  const s3Key = `${FSTS_FOLDER}/${languageCode}-${fstType}.hfstol`;
  const localPath = join(EFS_MOUNT_DIR, `${languageCode}-${fstType}.hfstol`);

  // Check if file already exists on EFS
  const fs = require('fs');
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // Ensure EFS directory exists
  await mkdir(EFS_MOUNT_DIR, { recursive: true });

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const response = await s3Client.send(command);
    const writeStream = createWriteStream(localPath);
    
    await pipeline(response.Body, writeStream);
    
    return localPath;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      throw new Error(`FST file not found: ${s3Key}`);
    }
    throw new Error(`Failed to download FST file ${s3Key}: ${error.message}`);
  }
}

/**
 * Get or load strict analyzer for a language
 */
async function getStrictAnalyzer(languageCode) {
  const cacheKey = `${languageCode}-strict-analyzer`;
  
  if (!transducerCache[cacheKey]) {
    try {
      const fstPath = await downloadFstFromS3(languageCode, 'strict-analyzer');
      transducerCache[cacheKey] = new Transducer(fstPath);
    } catch (e) {
      console.error(`Failed to load strict analyzer for ${languageCode}:`, e);
      throw e;
    }
  }
  return transducerCache[cacheKey];
}

/**
 * Get or load relaxed analyzer for a language
 */
async function getRelaxedAnalyzer(languageCode) {
  const cacheKey = `${languageCode}-relaxed-analyzer`;
  
  if (!transducerCache[cacheKey]) {
    try {
      const fstPath = await downloadFstFromS3(languageCode, 'relaxed-analyzer');
      transducerCache[cacheKey] = new Transducer(fstPath);
    } catch (e) {
      console.error(`Failed to load relaxed analyzer for ${languageCode}:`, e);
      throw e;
    }
  }
  return transducerCache[cacheKey];
}

/**
 * Get or load strict generator for a language
 */
async function getStrictGenerator(languageCode) {
  const cacheKey = `${languageCode}-strict-generator`;
  
  if (!transducerCache[cacheKey]) {
    try {
      const fstPath = await downloadFstFromS3(languageCode, 'strict-generator');
      transducerCache[cacheKey] = new Transducer(fstPath);
    } catch (e) {
      console.error(`Failed to load strict generator for ${languageCode}:`, e);
      throw e;
    }
  }
  return transducerCache[cacheKey];
}

exports.handler = async (event, context) => {
  console.log('received event:', event);

  let response;
  if (event.path === '/bulk-lookup') {
    response = await bulkLookup(event);
  } else if (event.path === '/suggest') {
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
  let languageCode = 'crk';
  
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
    
    // Extract language code and words from body
    let words;
    
    if (body.languageCode && body.words) {
      // New format: { languageCode: "crk", words: [...] }
      languageCode = body.languageCode;
      words = body.words;
    } else if (Array.isArray(body)) {
      // Fallback: assume array of words, default to 'crk'
      languageCode = 'crk';
      words = body;
    } else {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Invalid body format. Expected { languageCode: string, words: string[] } or string[]' })
      };
    }
    
    if (!languageCode || typeof languageCode !== 'string') {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'languageCode is required and must be a string' })
      };
    }
    
    if (!Array.isArray(words)) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'words must be an array' })
      };
    }
    
    // Process characters for normalization before analysis
    const processedWords = words.map(word => processCharacters(word));
    console.log('Processed words:', processedWords);
    
    // Create mapping between original and processed words
    const wordMapping = {};
    words.forEach((original, index) => {
      const processed = processedWords[index];
      if (processed !== original) {
        wordMapping[processed] = original;
      }
    });
    
    const analysisResult = await analyzeStrict(processedWords, languageCode);
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
    if (unknowns.length > 0) {
      result._suggestions = await checkUnknowns(unknowns, languageCode);
    }
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
    
    // Extract language code and words from body
    let languageCode;
    let words;
    
    if (body.languageCode && body.words) {
      // New format: { languageCode: "crk", words: [...] }
      languageCode = body.languageCode;
      words = body.words;
    } else if (Array.isArray(body)) {
      // Fallback: assume array of words, default to 'crk'
      languageCode = 'crk';
      words = body;
    } else {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Invalid body format. Expected { languageCode: string, words: string[] } or string[]' })
      };
    }
    
    if (!languageCode || typeof languageCode !== 'string') {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'languageCode is required and must be a string' })
      };
    }
    
    if (!Array.isArray(words)) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'words must be an array' })
      };
    }
    
    // Process characters for normalization before checking suggestions
    const processedWords = words.map(word => processCharacters(word));
    console.log('Processed words:', processedWords);
    
    // Create mapping between original and processed words
    const wordMapping = {};
    words.forEach((original, index) => {
      const processed = processedWords[index];
      if (processed !== original) {
        wordMapping[processed] = original;
      }
    });
    
    const suggestionResult = await checkUnknowns(processedWords, languageCode);
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

async function checkUnknowns(items, languageCode) {
  const final = {};
  const result = await analyzeRelaxed(items, languageCode);
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
    const suggested = await generateStrict(toLookup, languageCode);
    console.log('suggested:', suggested);
    
    for (const key of Object.keys(suggested)) {
      if (suggested[key] && suggested[key].length > 0) {
        final[originalLookup[key]] = suggested[key][0];
      }
    }
  }

  return final;
}

async function analyzeStrict(lookup, languageCode) {
  const fst = await getStrictAnalyzer(languageCode);
  const result = {};
  
  for (const word of lookup) {
    try {
      const rawAnalyses = fst.lookup(word);
      // Filter out error analyses (anything containing +Err/ or Err/Frag)
      // These are fragments or orthographic errors that shouldn't be shown to users
      result[word] = rawAnalyses.filter(analysis => !analysis.includes('+Err/') && !analysis.includes('Err/Frag'));
    } catch (e) {
      console.error(`Error looking up word "${word}":`, e);
      result[word] = [];
    }
  }
  
  return result;
}

async function analyzeRelaxed(lookup, languageCode) {
  const fst = await getRelaxedAnalyzer(languageCode);
  const result = {};
  
  for (const word of lookup) {
    try {
      const rawAnalyses = fst.lookup(word);
      // Filter out error analyses (anything containing +Err/ or Err/Frag)
      // These are fragments or orthographic errors that shouldn't be shown to users
      result[word] = rawAnalyses.filter(analysis => !analysis.includes('+Err/') && !analysis.includes('Err/Frag'));
    } catch (e) {
      console.error(`Error looking up word "${word}":`, e);
      result[word] = [];
    }
  }
  
  return result;
}

async function generateStrict(lookup, languageCode) {
  const fst = await getStrictGenerator(languageCode);
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
