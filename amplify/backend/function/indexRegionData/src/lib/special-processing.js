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
  ciw: require('./special-processing-ciw'),
  otwr: require('./special-processing-otw'), // Same as otw, different spelling style
  otwc: require('./special-processing-otw'), // Same as otw, different spelling style
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
 * Extract the lemma from an analysis string for a given language
 *
 * This is a convenience function that handles the full flow:
 * get processor → analyze → extract lemma
 *
 * @param {string} languageCode - ISO 639-3 language code (e.g., 'crk', 'ciw', 'otw')
 * @param {string} analysis - The linguistic analysis string (e.g., 'PV/ati+ohpikihtâw+V+TI+Imp')
 * @returns {string|null} - The extracted lemma, or null if not found/unsupported
 *
 * @example
 * getLemma('crk', 'PV/ati+ohpikihtâw+V+TI+Imp+Imm+2Sg')
 * // Returns: 'ohpikihtâw'
 *
 * getLemma('ciw', 'ayaa+VAI+Ind+Pos+Neu+1SgSubj')
 * // Returns: 'ayaa'
 */
const getLemma = (languageCode, analysis) => {
  const processor = getLanguageProcessor(languageCode)
  if (!processor) {
    return null
  }

  const result = processor.analyze(analysis)
  return result?.lemma ?? null
}

module.exports = {
  getLanguageProcessor,
  hasSpecialProcessing,
  getLemma,
  languages, // Export for testing purposes
}

