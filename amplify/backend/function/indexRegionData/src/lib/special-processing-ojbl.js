/**
 * Special processing functions for Border Lakes Ojibwe (ojbl) language
 *
 * Analyses come from the ishkodens-fst transducers, which use lowercase
 * tags and put person prefixes and preverbs before the stem.
 */

/**
 * Process characters for OJBL normalization
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
 * Part-of-speech tags mapped to their wordType and wordClass.
 * Placeholder tags from unfinished dictionary exports carry a wordType but no wordClass.
 */
const POS_TAGS = {
  vai: { wordType: 'V', wordClass: 'VAI' },
  vaio: { wordType: 'V', wordClass: 'VAIO' },
  vta: { wordType: 'V', wordClass: 'VTA' },
  vti: { wordType: 'V', wordClass: 'VTI' },
  vii: { wordType: 'V', wordClass: 'VII' },
  'verb-MORE-SPECIFICITY-REQUIRED': { wordType: 'V', wordClass: null },
  na: { wordType: 'N', wordClass: 'NA' },
  ni: { wordType: 'N', wordClass: 'NI' },
  nad: { wordType: 'N', wordClass: 'NAD' },
  nid: { wordType: 'N', wordClass: 'NID' },
  nm: { wordType: 'N', wordClass: 'NM' },
  pn: { wordType: 'N', wordClass: 'PN' },
  loc: { wordType: 'N', wordClass: 'LOC' },
  'nad-FIX-EXPORT': { wordType: 'N', wordClass: 'NAD' },
  'nid-FIX-EXPORT': { wordType: 'N', wordClass: 'NID' },
  'ni-FIX-EXPORT': { wordType: 'N', wordClass: 'NI' },
  'n-MORE-SPECIFICITY-REQUIRED': { wordType: 'N', wordClass: null },
  'noun-MORE-SPECIFICITY-REQUIRED': { wordType: 'N', wordClass: null },
  adv: { wordType: 'ADV', wordClass: 'ADV' },
  pro: { wordType: 'Pron', wordClass: 'PRON' },
  pc: { wordType: 'Ipc', wordClass: 'PC' },
  inj: { wordType: 'Ipc', wordClass: 'INJ' },
  phr: { wordType: 'PHR', wordClass: 'PHR' },
}

/**
 * Analyzes an OJBL linguistic analysis string and extracts lemma, wordType, and wordClass
 *
 * Analysis strings follow the format:
 *   [prv+<category>[+<preverb>]+]* [<person>+] lemma+<pos>[+<inflection tags>]
 *
 * Where:
 *   - person is 1, 2, 3 or x
 *   - preverbs are prv+tam+gii, prv+dir+ani, prv+cnj+gaa, prv+ccnj (changed conjunct), etc.
 *   - prenouns are joined to the stem with a hyphen (anama'e-mazina'igan) and stay in the lemma
 *
 * The stem is always the part immediately before the first part-of-speech tag.
 * Inflection tags after the POS (e.g. +pass+vai on passives) are ignored.
 *
 * @param {string} analysis - The linguistic analysis string (e.g., "2+prv+tam+gii+nibaa+vai")
 * @returns {Object} - Object with {lemma, wordType, wordClass}
 *
 * @example
 * analyze("1+prv+tam+gii+owaabamaan+vta+thmdir")
 * // Returns: { lemma: "owaabamaan", wordType: "V", wordClass: "VTA" }
 *
 * analyze("makwa+na+pl")
 * // Returns: { lemma: "makwa", wordType: "N", wordClass: "NA" }
 *
 * @note This function logs warnings (console.warn) when analysis strings cannot be parsed.
 */
const analyze = (analysis) => {
  if (!analysis || typeof analysis !== 'string' || analysis.trim() === '') {
    return {
      lemma: null,
      wordType: null,
      wordClass: null
    }
  }

  const parts = analysis.split('+')

  // Start at 1: the POS tag always follows a stem
  for (let i = 1; i < parts.length; i++) {
    const pos = POS_TAGS[parts[i]]
    if (pos) {
      return {
        lemma: parts[i - 1],
        wordType: pos.wordType,
        wordClass: pos.wordClass
      }
    }
  }

  console.warn(`⚠️ [OJBL] Could not find a part-of-speech tag. Analysis: "${analysis}" | Parts: [${parts.join(', ')}]`)
  return {
    lemma: null,
    wordType: null,
    wordClass: null
  }
}

module.exports = {
  processCharacters,
  analyze,
}
