/**
 * Special processing functions for Siksika (Blackfoot) (bla) language
 *
 * These functions handle BLA-specific text normalization and processing
 */

/**
 * Process characters for BLA normalization
 *
 * @param {string} text - The text to process
 * @returns {string} - Normalized text
 */
const processCharacters = (text) => {
  if (!text || typeof text !== 'string') {
    return text
  }

  return text.trim()
}

/**
 * Analyzes a BLA linguistic analysis string and extracts lemma, wordType, and wordClass
 *
 * Analysis strings follow the format:
 *   [PREFIX+]lemma+POS[+OTHER_TAGS]
 *
 * Where PREFIX can be:
 *   - PV/ (preverb)
 *   - PN/ (prenoun)
 *   - Fut, Past, Dur, Imm, Neg (tense/aspect tags)
 *
 * POS (Part of Speech) tags are combined and include subclasses:
 *   - Verbs: VAI, VII, VTA, VTI
 *   - Nouns: NA, NI
 *   - Demonstratives: Dem
 *
 * @param {string} analysis - The linguistic analysis string (e.g., "Fut+waahkayi+VAI+Ind+3Sg")
 * @returns {Object} - Object with {lemma, wordType, wordClass}
 *
 * @example
 * analyze("Fut+waahkayi+VAI+Ind+3Sg")
 * // Returns: { lemma: "waahkayi", wordType: "V", wordClass: "VAI" }
 *
 * analyze("ninaawa+NA+Sg")
 * // Returns: { lemma: "ninaawa", wordType: "N", wordClass: "NA" }
 *
 * @note This function logs warnings (console.warn) when analysis strings cannot be fully parsed.
 *       These warnings help identify FST analysis formats that need to be added to the parser.
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
  const prefixes = ['PV/', 'PN/', 'Fut', 'Past', 'Dur', 'Imm', 'Neg']

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
    console.warn(`⚠️ [BLA] Could not find lemma (all parts appear to be prefixes). Using first part as lemma. Analysis: "${analysis}" | Parts: [${parts.join(', ')}]`)
  }

  // Find the part of speech (comes after the lemma)
  let wordType = null
  let wordClass = null

  // Look at tags after the lemma
  for (let i = lemmaIndex + 1; i < parts.length; i++) {
    const tag = parts[i]

    // BLA uses combined POS tags
    if (tag === 'VAI' || tag === 'VII' || tag === 'VTA' || tag === 'VTI') {
      wordType = 'V'
      wordClass = tag
      break
    } else if (tag === 'NA' || tag === 'NI') {
      wordType = 'N'
      wordClass = tag
      break
    } else if (tag === 'Dem') {
      wordType = 'Dem'
      wordClass = 'DEM'
      break
    }
  }

  // Log warning if we found a lemma but couldn't determine wordType/wordClass
  if (lemma && (!wordType || !wordClass)) {
    console.warn(`⚠️ [BLA] Analysis parsing incomplete - found lemma "${lemma}" but missing wordType/wordClass. Analysis: "${analysis}" | Parts: [${parts.join(', ')}]`)
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
