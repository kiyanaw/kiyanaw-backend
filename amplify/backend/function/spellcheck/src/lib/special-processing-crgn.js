/**
 * Special processing functions for Cree (crgn) language
 * 
 * These functions handle CRGN-specific text normalization and processing.
 * Note: Currently uses the same FST files as CRK since CRGN doesn't have
 * its own FST files yet.
 */

/**
 * Static list of FST files used by CRGN language processing
 * Currently uses CRK FST files since CRGN doesn't have its own files yet
 * These files must exist in S3 under the 'fsts' folder
 */
const FST_FILES = {
  'strict-analyzer': 'crk-strict-analyzer.hfstol',
  'relaxed-analyzer': 'crk-relaxed-analyzer.hfstol',
  'strict-generator': 'crk-strict-generator.hfstol'
}

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

module.exports = {
  processCharacters,
  FST_FILES,
}

