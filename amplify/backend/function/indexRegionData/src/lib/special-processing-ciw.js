/**
 * Special processing functions for Ojibwe (ciw) language
 * 
 * These functions handle CIW-specific text normalization and processing
 */

/**
 * Process characters for CIW normalization
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
 * Analyzes a CIW linguistic analysis string and extracts lemma, wordType, and wordClass
 * 
 * Analysis strings follow the format:
 *   [PREFIX+]lemma+POS[+OTHER_TAGS]
 * 
 * Where PREFIX can be:
 *   - PVDir/ (directional preverb)
 *   - PVTense/ (tense preverb)
 *   - PVLex/ (lexical preverb)
 *   - PVSub/ (subordinating preverb)
 *   - PVRel/ (relativizer preverb)
 *   - ChCnj+ (conjunct change)
 *   - PNLex/ (nominal lexical prefix)
 * 
 * POS (Part of Speech) tags are direct and include subclasses:
 *   - Verbs: VAI, VTA, VTI, VII
 *   - Nouns: NA, NI, NAD
 *   - Adverbs: ADVLoc, ADVTmp, ADVConj, ADVDeg, ADVGram, ADVPred, ADVQnt, ADVMan, ADVNeg, ADVInter
 *   - Pronouns: PRONDem, PRONPer, PRONInter, PRONIndf
 *   - Particles: PCEmph, PCDisc, PCInterj, PCAsp
 *   - Numbers: NUM
 * 
 * @param {string} analysis - The linguistic analysis string (e.g., "ayaa+VAI+Ind+Pos+Neu+1SgSubj")
 * @returns {Object} - Object with {lemma, wordType, wordClass}
 * 
 * @example
 * analyze("ayaa+VAI+Ind+Pos+Neu+1SgSubj")
 * // Returns: { lemma: "ayaa", wordType: "V", wordClass: "VAI" }
 * 
 * analyze("anishinaabe+NA+ProxPl")
 * // Returns: { lemma: "anishinaabe", wordType: "N", wordClass: "NA" }
 * 
 * analyze("omaa+ADVLoc")
 * // Returns: { lemma: "omaa", wordType: "ADV", wordClass: "ADVLoc" }
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
  const prefixes = ['PVDir/', 'PVTense/', 'PVLex/', 'PVSub/', 'PVRel/', 'ChCnj', 'PNLex/']
  
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
    console.warn(`⚠️ [CIW] Could not find lemma (all parts appear to be prefixes). Using first part as lemma. Analysis: "${analysis}" | Parts: [${parts.join(', ')}]`)
  }
  
  // Find the part of speech (comes after the lemma)
  let wordType = null
  let wordClass = null
  
  // Look at tags after the lemma
  for (let i = lemmaIndex + 1; i < parts.length; i++) {
    const tag = parts[i]
    
    // CIW uses direct POS tags that include subclasses
    // Check for verb tags
    if (tag === 'VAI' || tag === 'VTA' || tag === 'VTI' || tag === 'VII') {
      wordType = 'V'
      wordClass = tag
      break
    }
    // Check for noun tags
    else if (tag === 'NA' || tag === 'NI' || tag === 'NAD') {
      wordType = 'N'
      wordClass = tag
      break
    }
    // Check for adverb tags
    else if (tag.startsWith('ADV')) {
      wordType = 'ADV'
      wordClass = tag
      break
    }
    // Check for pronoun tags
    else if (tag.startsWith('PRON')) {
      wordType = 'Pron'
      wordClass = tag
      break
    }
    // Check for particle tags
    else if (tag.startsWith('PC')) {
      wordType = 'Ipc'
      wordClass = tag
      break
    }
    // Check for number tags
    else if (tag === 'NUM') {
      wordType = 'NUM'
      wordClass = 'NUM'
      break
    }
  }
  
  // Log warning if we found a lemma but couldn't determine wordType/wordClass
  if (lemma && (!wordType || !wordClass)) {
    console.warn(`⚠️ [CIW] Analysis parsing incomplete - found lemma "${lemma}" but missing wordType/wordClass. Analysis: "${analysis}" | Parts: [${parts.join(', ')}]`)
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
