

/**
 * Special processing functions for Ojibwe (otw) language
 * 
 * These functions handle OTW-specific text normalization and processing.
 * Note: OTWR and OTWC are different spelling styles but use the same analysis format.
 */

/**
 * Process characters for OTW normalization
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
 * Analyzes an OTW linguistic analysis string and extracts lemma, wordType, and wordClass
 * 
 * Analysis strings follow the format:
 *   [PREFIX+]lemma+POS[+OTHER_TAGS]
 * 
 * Where PREFIX can be:
 *   - 1+ (first person prefix)
 *   - 2+ (second person prefix)
 *   - 3+ (third person prefix)
 *   - X+ (unspecified person prefix)
 * 
 * POS (Part of Speech) tags are direct and include subclasses:
 *   - Verbs: VAI, VTA, VTI, VII
 *   - Nouns: NA, NI
 * 
 * @param {string} analysis - The linguistic analysis string (e.g., "gwekshin+VAI+3" or "1+gwekshin+VAI")
 * @returns {Object} - Object with {lemma, wordType, wordClass}
 * 
 * @example
 * analyze("gwekshin+VAI+3")
 * // Returns: { lemma: "gwekshin", wordType: "V", wordClass: "VAI" }
 * 
 * analyze("1+zhiishiip+NA")
 * // Returns: { lemma: "zhiishiip", wordType: "N", wordClass: "NA" }
 * 
 * analyze("mchaa+VII+0")
 * // Returns: { lemma: "mchaa", wordType: "V", wordClass: "VII" }
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
  
  // OTW prefixes: person markers that come before the lemma
  const prefixes = ['1', '2', '3', 'X']
  
  // Find the lemma - first part that doesn't start with a person prefix
  let lemma = null
  let lemmaIndex = -1
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    // Check if this part is a prefix (exact match for person markers)
    if (prefixes.includes(part)) {
      continue
    }
    // Found the lemma (first non-prefix part)
    lemma = part
    lemmaIndex = i
    break
  }
  
  // If no lemma found (shouldn't happen with valid input), return the first part
  if (lemma === null && parts.length > 0) {
    lemma = parts[0]
    lemmaIndex = 0
    console.warn(`⚠️ [OTW] Could not find lemma (all parts appear to be prefixes). Using first part as lemma. Analysis: "${analysis}" | Parts: [${parts.join(', ')}]`)
  }
  
  // Find the part of speech (comes after the lemma)
  let wordType = null
  let wordClass = null
  
  // Look at tags after the lemma
  for (let i = lemmaIndex + 1; i < parts.length; i++) {
    const tag = parts[i]
    
    // OTW uses direct POS tags that include subclasses
    // Check for verb tags
    if (tag === 'VAI' || tag === 'VTA' || tag === 'VTI' || tag === 'VII') {
      wordType = 'V'
      wordClass = tag
      break
    }
    // Check for noun tags
    else if (tag === 'NA' || tag === 'NI') {
      wordType = 'N'
      wordClass = tag
      break
    }
  }
  
  // Warn if we found a lemma but couldn't determine wordType/wordClass
  if (lemma !== null && (wordType === null || wordClass === null)) {
    console.warn(`⚠️ [OTW] Found lemma "${lemma}" but could not determine wordType/wordClass. Analysis: "${analysis}" | Parts: [${parts.join(', ')}]`)
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