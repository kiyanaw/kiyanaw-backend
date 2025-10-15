/**
 * Special processing functions for Plains Cree (crk) language
 * 
 * These functions handle CRK-specific text normalization and processing
 */

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

/**
 * Analyzes a CRK linguistic analysis string and extracts lemma, wordType, and wordClass
 * 
 * Analysis strings follow the format:
 *   [PREFIX+]lemma+POS[+SUBCLASS][+OTHER_TAGS]
 * 
 * Where PREFIX can be:
 *   - PV/ (preverb)
 *   - IC+ (initial change)
 *   - RdplW+ or RdplS+ (reduplication)
 * 
 * POS (Part of Speech):
 *   - V (verb) with subclasses: AI, II, TA, TI
 *   - N (noun) with subclasses: A (animate), I (inanimate)
 *   - Ipc (particle)
 *   - Pron (pronoun)
 * 
 * @param {string} analysis - The linguistic analysis string (e.g., "PV/ati+ohpikihtâw+V+TI+Imp+Imm+2Sg")
 * @returns {Object} - Object with {lemma, wordType, wordClass}
 * 
 * @example
 * analyze("PV/ati+ohpikihtâw+V+TI+Imp+Imm+2Sg")
 * // Returns: { lemma: "ohpikihtâw", wordType: "V", wordClass: "VTI" }
 * 
 * analyze("ahcahk+N+A+Sg")
 * // Returns: { lemma: "ahcahk", wordType: "N", wordClass: "NA" }
 * 
 * analyze("êkây+Ipc")
 * // Returns: { lemma: "êkây", wordType: "Ipc", wordClass: "IPC" }
 */
const analyze = (analysis) => {
  // Handle null, undefined, or empty strings
  if (!analysis || typeof analysis !== 'string' || analysis.trim() === '') {
    return {
      lemma: null,
      wordType: null,
      wordClass: null
    }
  }

  // Split the analysis string by '+'
  const parts = analysis.split('+')
  
  // Find the lemma - first part that doesn't start with a special prefix
  let lemma = null
  let lemmaIndex = -1
  const prefixes = ['PV/', 'IC', 'RdplW', 'RdplS']
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const hasPrefix = prefixes.some(prefix => part.startsWith(prefix))
    
    if (!hasPrefix && lemma === null) {
      lemma = part
      lemmaIndex = i
      break
    }
  }
  
  // If no lemma found (shouldn't happen with valid input), return the first part
  if (lemma === null && parts.length > 0) {
    lemma = parts[0]
    lemmaIndex = 0
  }
  
  // Find the part of speech (comes after the lemma)
  let wordType = null
  let wordClass = null
  
  // Look at tags after the lemma
  for (let i = lemmaIndex + 1; i < parts.length; i++) {
    const tag = parts[i]
    
    // Check for main part of speech tags
    if (tag === 'V') {
      wordType = 'V'
      // Look for verb subclass in next tag
      if (i + 1 < parts.length) {
        const nextTag = parts[i + 1]
        if (nextTag === 'AI') wordClass = 'VAI'
        else if (nextTag === 'II') wordClass = 'VII'
        else if (nextTag === 'TA') wordClass = 'VTA'
        else if (nextTag === 'TI') wordClass = 'VTI'
      }
      break
    } else if (tag === 'N') {
      wordType = 'N'
      // Look for noun subclass - could be next tag or one after (if 'D' for dependent comes first)
      for (let j = i + 1; j < parts.length && j < i + 3; j++) {
        const nextTag = parts[j]
        if (nextTag === 'A') {
          wordClass = 'NA'
          break
        } else if (nextTag === 'I') {
          wordClass = 'NI'
          break
        }
      }
      break
    } else if (tag === 'Ipc') {
      wordType = 'Ipc'
      wordClass = 'IPC'
      break
    } else if (tag === 'Pron') {
      wordType = 'Pron'
      wordClass = 'PRON'
      break
    }
  }
  
  return {
    lemma,
    wordType,
    wordClass
  }
}

module.exports = {
  processCharacters,
  analyze,
}

