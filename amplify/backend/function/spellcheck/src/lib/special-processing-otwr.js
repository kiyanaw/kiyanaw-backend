/**
 * Special processing functions for Nishnaabemwin (Rhodes-style) (otwr) language
 * 
 * These functions handle OTWR-specific text normalization and processing
 */

/**
 * Static list of FST files used by OTWR language processing
 * These files must exist in S3 under the 'fsts' folder
 * Note: OTWR does not have a generator file, so suggestions will not be available
 */
const FST_FILES = {
  'strict-analyzer': 'otwr_syncopated_analyzer.hfstol',
  'relaxed-analyzer': 'otwr_syncopated_analyzer_relaxed.hfstol'
}

/**
 * Process characters for OTWR normalization
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

