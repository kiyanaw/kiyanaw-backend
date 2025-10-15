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

module.exports = {
  getLanguageProcessor,
  hasSpecialProcessing,
  languages, // Export for testing purposes
}

