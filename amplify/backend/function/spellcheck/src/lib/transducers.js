/**
 * Transducer management and analysis functions
 * 
 * Handles loading and using FST transducers for word analysis.
 * Transducers are loaded from EFS each time (not cached in memory)
 * to avoid keeping large objects (hundreds of MB) in memory.
 * The FST files themselves are cached on EFS after first download.
 */

const { Transducer } = require('hfstol');
const fst = require('./fst');
const specialProcessing = require('./special-processing');

/**
 * Load strict analyzer for a language from EFS
 * 
 * @param {string} languageCode - Language code (e.g., 'crk')
 * @returns {Promise<Transducer>} - The strict analyzer transducer
 */
async function getStrictAnalyzer(languageCode) {
  try {
    const processor = specialProcessing.getLanguageProcessor(languageCode);
    if (!processor || !processor.FST_FILES || !processor.FST_FILES['strict-analyzer']) {
      throw new Error(`No strict-analyzer FST file defined for language: ${languageCode}`);
    }
    
    const fileName = processor.FST_FILES['strict-analyzer'];
    const fstPath = await fst.downloadFstFromS3(fileName);
    return new Transducer(fstPath);
  } catch (e) {
    console.error(`Failed to load strict analyzer for ${languageCode}:`, e);
    throw e;
  }
}

/**
 * Load relaxed analyzer for a language from EFS
 * 
 * @param {string} languageCode - Language code (e.g., 'crk')
 * @returns {Promise<Transducer>} - The relaxed analyzer transducer
 */
async function getRelaxedAnalyzer(languageCode) {
  try {
    const processor = specialProcessing.getLanguageProcessor(languageCode);
    if (!processor || !processor.FST_FILES || !processor.FST_FILES['relaxed-analyzer']) {
      throw new Error(`No relaxed-analyzer FST file defined for language: ${languageCode}`);
    }
    
    const fileName = processor.FST_FILES['relaxed-analyzer'];
    const fstPath = await fst.downloadFstFromS3(fileName);
    return new Transducer(fstPath);
  } catch (e) {
    console.error(`Failed to load relaxed analyzer for ${languageCode}:`, e);
    throw e;
  }
}

/**
 * Load strict generator for a language from EFS
 * 
 * @param {string} languageCode - Language code (e.g., 'crk')
 * @returns {Promise<Transducer>} - The strict generator transducer
 */
async function getStrictGenerator(languageCode) {
  try {
    const processor = specialProcessing.getLanguageProcessor(languageCode);
    if (!processor || !processor.FST_FILES || !processor.FST_FILES['strict-generator']) {
      throw new Error(`No strict-generator FST file defined for language: ${languageCode}`);
    }
    
    const fileName = processor.FST_FILES['strict-generator'];
    const fstPath = await fst.downloadFstFromS3(fileName);
    return new Transducer(fstPath);
  } catch (e) {
    console.error(`Failed to load strict generator for ${languageCode}:`, e);
    throw e;
  }
}

/**
 * Analyze words using strict analyzer
 * 
 * @param {string[]} lookup - Array of words to analyze
 * @param {string} languageCode - Language code
 * @returns {Promise<Object>} - Object mapping words to arrays of analyses
 */
async function analyzeStrict(lookup, languageCode) {
  const fstTransducer = await getStrictAnalyzer(languageCode);
  const result = {};
  
  for (const word of lookup) {
    try {
      const rawAnalyses = fstTransducer.lookup(word);
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

/**
 * Analyze words using relaxed analyzer
 * 
 * @param {string[]} lookup - Array of words to analyze
 * @param {string} languageCode - Language code
 * @returns {Promise<Object>} - Object mapping words to arrays of analyses
 */
async function analyzeRelaxed(lookup, languageCode) {
  const fstTransducer = await getRelaxedAnalyzer(languageCode);
  const result = {};
  
  for (const word of lookup) {
    try {
      const rawAnalyses = fstTransducer.lookup(word);
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

/**
 * Generate word forms using strict generator
 * 
 * @param {string[]} lookup - Array of analyses to generate from
 * @param {string} languageCode - Language code
 * @returns {Promise<Object>} - Object mapping analyses to arrays of generated forms
 */
async function generateStrict(lookup, languageCode) {
  const fstTransducer = await getStrictGenerator(languageCode);
  const result = {};
  
  for (const word of lookup) {
    try {
      result[word] = fstTransducer.lookup(word);
    } catch (e) {
      console.error(`Error looking up word "${word}":`, e);
      result[word] = [];
    }
  }
  
  return result;
}

module.exports = {
  getStrictAnalyzer,
  getRelaxedAnalyzer,
  getStrictGenerator,
  analyzeStrict,
  analyzeRelaxed,
  generateStrict,
}

