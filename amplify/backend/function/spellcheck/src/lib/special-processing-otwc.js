/**
 * Special processing functions for Nishnaabemwin (Corbiere-style) (otwc) language
 * 
 * These functions handle OTWC-specific text normalization and processing
 */

/**
 * Static list of FST files used by OTWC language processing
 * These files must exist in S3 under the 'fsts' folder
 * Note: OTWC does not have a generator file, so suggestions will not be available
 */
const FST_FILES = {
  'strict-analyzer': 'otwc_syncopated_analyzer_mcor_uw.hfstol',
  'relaxed-analyzer': 'otwc_syncopated_analyzer_mcor_relaxed_uw.hfstol'
}

/**
 * Process characters for OTWC normalization
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

