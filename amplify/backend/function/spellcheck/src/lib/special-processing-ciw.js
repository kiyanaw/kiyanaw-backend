/**
 * Special processing functions for Nishnaabemowin (Ojibwe) (ciw) language
 * 
 * These functions handle CIW-specific text normalization and processing
 */

/**
 * Static list of FST files used by CIW language processing
 * These files must exist in S3 under the 'fsts' folder
 * Note: CIW only has a strict-analyzer file, so suggestions will not be available
 */
const FST_FILES = {
  'strict-analyzer': 'ciw-strict-analyzer.hfstol'
}

/**
 * Process characters for CIW normalization
 * Currently no special processing needed, but can be extended if needed
 * 
 * @param {string} text - The text to process
 * @returns {string} - Normalized text
 */
const processCharacters = (text) => {
  if (!text || typeof text !== 'string') {
    return text
  }
  
  // Strip punctuation
  return text
    .replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '')
    .trim()
}

module.exports = {
  processCharacters,
  FST_FILES,
}

