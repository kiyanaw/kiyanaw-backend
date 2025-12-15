/**
 * Language-specific special processing registry
 * 
 * This module provides a centralized registry for language-specific
 * text processing functions. Each language can define its own
 * special processing logic.
 * 
 * Usage:
 *   const processor = getLanguageProcessor('crk')
 *   if (processor) {
 *     const processed = processor.processCharacters(text)
 *   }
 */

const languages = {
  crk: require('./special-processing-crk'),
  crgn: require('./special-processing-crgn'),
  otwc: require('./special-processing-otwc'),
  otwr: require('./special-processing-otwr'),
}

/**
 * Get the special processor for a given language code
 * 
 * @param {string} languageCode - ISO 639-3 language code (e.g., 'crk')
 * @returns {Object|null} - Language processor object or null if not found
 */
const getLanguageProcessor = (languageCode) => {
  if (!languageCode || typeof languageCode !== 'string') {
    return null
  }
  
  return languages[languageCode] || null
}

/**
 * Check if a language has special processing available
 * 
 * @param {string} languageCode - ISO 639-3 language code
 * @returns {boolean} - True if special processing is available
 */
const hasSpecialProcessing = (languageCode) => {
  return !!languages[languageCode]
}

/**
 * Check if a language has a specific FST file type
 * 
 * @param {string} languageCode - ISO 639-3 language code
 * @param {string} fstType - FST file type ('strict-analyzer', 'relaxed-analyzer', 'strict-generator')
 * @returns {boolean} - True if the language has the specified FST file type
 */
const hasFstFile = (languageCode, fstType) => {
  const processor = getLanguageProcessor(languageCode);
  return !!(processor && processor.FST_FILES && processor.FST_FILES[fstType]);
}

module.exports = {
  getLanguageProcessor,
  hasSpecialProcessing,
  hasFstFile,
  languages, // Export for testing purposes
}

