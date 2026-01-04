/**
 * Utility functions for the spellcheck Lambda
 */

/**
 * Prioritize particles (Ipc) first in analysis results
 *
 * When a word has multiple analyses (e.g., both Ipc and V/N), particles
 * are almost always (99%+) the intended reading. This function sorts
 * analyses to place Ipc analyses first.
 *
 * @param {string[]} analyses - Array of FST analysis strings
 * @returns {string[]} - Sorted array with Ipc analyses first
 */
function prioritizeParticles(analyses) {
  return analyses.sort((a, b) => {
    const aIsIpc = a.includes('+Ipc');
    const bIsIpc = b.includes('+Ipc');
    if (aIsIpc && !bIsIpc) return -1;
    if (!aIsIpc && bIsIpc) return 1;
    return 0; // preserve relative order otherwise
  });
}

const HEADERS = {
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

/**
 * Parse request body and extract language code and words
 * 
 * @param {string} body - JSON string body
 * @returns {Object} - { languageCode, words } or null if invalid
 */
function parseRequestBody(body) {
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(body);
    
    // New format: { languageCode: "crk", words: [...] }
    if (parsed.languageCode && parsed.words) {
      return {
        languageCode: parsed.languageCode,
        words: parsed.words
      };
    }
    
    // Fallback: assume array of words, default to 'crk'
    if (Array.isArray(parsed)) {
      return {
        languageCode: 'crk',
        words: parsed
      };
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Create an error response
 * 
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @returns {Object} - Lambda response object
 */
function errorResponse(statusCode, message) {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify({ message })
  };
}

/**
 * Create a success response
 * 
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Response data
 * @returns {Object} - Lambda response object
 */
function successResponse(statusCode, data) {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(data)
  };
}

module.exports = {
  HEADERS,
  parseRequestBody,
  errorResponse,
  successResponse,
  prioritizeParticles,
}

