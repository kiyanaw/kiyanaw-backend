/**
 * Special processing functions for Gaeilge (Irish) (gle) language
 *
 * These functions handle GLE-specific text normalization and processing.
 * Irish is not polysynthetic, so there are no prefix slots — the lemma
 * is always the first element of the analysis string. POS tags use full
 * English words rather than abbreviations (e.g. "Noun", "Verb", "Adj").
 */

/**
 * Process characters for GLE normalization
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
 * Analyzes a GLE linguistic analysis string and extracts lemma, wordType, and wordClass
 *
 * Analysis strings follow the format:
 *   lemma+POS[+SubPOS][+GrammaticalFeatures]
 *
 * Irish has no prefix slot system, so the lemma is always parts[0].
 *
 * POS (Part of Speech) tags use full words:
 *   - Noun -> wordType "N", wordClass "N"
 *   - Verb -> wordType "V", then check next tag for VT/VI subclass
 *   - Adj  -> wordType "Adj", wordClass "ADJ"
 *   - Verbal (followed by Noun) -> wordType "Verbal", wordClass "VN" (verbal noun)
 *
 * @param {string} analysis - The linguistic analysis string (e.g., "cuid+Noun+Fem+Gen+Sg")
 * @returns {Object} - Object with {lemma, wordType, wordClass}
 *
 * @example
 * analyze("cuid+Noun+Fem+Gen+Sg")
 * // Returns: { lemma: "cuid", wordType: "N", wordClass: "N" }
 *
 * analyze("ceangail+Verb+VT+FutInd")
 * // Returns: { lemma: "ceangail", wordType: "V", wordClass: "VT" }
 *
 * analyze("feadail+Verbal+Noun+VI+Gen")
 * // Returns: { lemma: "feadail", wordType: "Verbal", wordClass: "VN" }
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

  // Irish has no prefix system — lemma is always the first part
  const lemma = parts[0]
  const lemmaIndex = 0

  // Find the part of speech (comes after the lemma)
  let wordType = null
  let wordClass = null

  // Look at tags after the lemma
  for (let i = lemmaIndex + 1; i < parts.length; i++) {
    const tag = parts[i]

    if (tag === 'Noun') {
      wordType = 'N'
      wordClass = 'N'
      break
    } else if (tag === 'Verb') {
      wordType = 'V'
      // Look for transitivity subclass in the next tag
      if (i + 1 < parts.length) {
        const nextTag = parts[i + 1]
        if (nextTag === 'VT' || nextTag === 'VI') {
          wordClass = nextTag
        } else {
          wordClass = 'V'
        }
      } else {
        wordClass = 'V'
      }
      break
    } else if (tag === 'Adj') {
      wordType = 'Adj'
      wordClass = 'ADJ'
      break
    } else if (tag === 'Verbal') {
      // Verbal noun: "Verbal+Noun+..." — consume both tags
      if (i + 1 < parts.length && parts[i + 1] === 'Noun') {
        wordType = 'Verbal'
        wordClass = 'VN'
      }
      break
    }
  }

  // Log warning if we found a lemma but couldn't determine wordType/wordClass
  if (lemma && (!wordType || !wordClass)) {
    console.warn(`⚠️ [GLE] Analysis parsing incomplete - found lemma "${lemma}" but missing wordType/wordClass. Analysis: "${analysis}" | Parts: [${parts.join(', ')}]`)
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
