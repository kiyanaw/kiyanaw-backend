/**
 * Language Processing - Frontend TypeScript wrapper
 *
 * This module provides typed access to the language processing functions
 * from the Lambda backend. The source of truth is in:
 *   amplify/backend/function/indexRegionData/src/lib/special-processing*.js
 *
 * The `language-processing` directory is symlinked to the Lambda lib folder.
 */

// Import from symlinked Lambda code (CommonJS)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CommonJS module from Lambda, vite-plugin-commonjs may wrap in .default
import * as specialProcessingModule from './language-processing/special-processing.js';

// Handle commonjs plugin wrapping - exports may be under .default
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const specialProcessing = (specialProcessingModule as any).default || specialProcessingModule;

/**
 * Result of analyzing a linguistic analysis string
 */
export interface AnalysisResult {
  /** The lemma (dictionary form) extracted from the analysis */
  lemma: string | null;
  /** The word type (V, N, Ipc, Pron, ADV, NUM, etc.) */
  wordType: string | null;
  /** The word class with subclass (VAI, VTA, NA, NI, etc.) */
  wordClass: string | null;
}

/**
 * Interface for language-specific processors
 */
export interface LanguageProcessor {
  /**
   * Process/normalize text according to language-specific rules
   * @param text - The text to process
   * @returns Normalized text
   */
  processCharacters(text: string): string;

  /**
   * Analyze a linguistic analysis string to extract components
   * @param analysis - The FST analysis string (e.g., 'PV/ati+ohpikihtâw+V+TI+Imp')
   * @returns Analysis result with lemma, wordType, and wordClass
   */
  analyze(analysis: string): AnalysisResult;
}

/**
 * Supported language codes
 */
export type LanguageCode = 'crk' | 'ciw' | 'otwr' | 'otwc';

/**
 * Get the special processor for a given language code
 * @param languageCode - ISO 639-3 language code (e.g., 'crk')
 * @returns Language processor object or null if not found
 */
export function getLanguageProcessor(languageCode: string): LanguageProcessor | null {
  return specialProcessing.getLanguageProcessor(languageCode);
}

/**
 * Check if a language has special processing available
 * @param languageCode - ISO 639-3 language code
 * @returns True if special processing is available
 */
export function hasSpecialProcessing(languageCode: string): boolean {
  return specialProcessing.hasSpecialProcessing(languageCode);
}

/**
 * Extract the lemma from an analysis string for a given language
 *
 * This is a convenience function that handles the full flow:
 * get processor -> analyze -> extract lemma
 *
 * @param languageCode - ISO 639-3 language code (e.g., 'crk', 'ciw', 'otw')
 * @param analysis - The linguistic analysis string (e.g., 'PV/ati+ohpikihtâw+V+TI+Imp')
 * @returns The extracted lemma, or null if not found/unsupported
 *
 * @example
 * getLemma('crk', 'PV/ati+ohpikihtâw+V+TI+Imp+Imm+2Sg')
 * // Returns: 'ohpikihtâw'
 *
 * getLemma('ciw', 'ayaa+VAI+Ind+Pos+Neu+1SgSubj')
 * // Returns: 'ayaa'
 */
export function getLemma(languageCode: string, analysis: string): string | null {
  return specialProcessing.getLemma(languageCode, analysis);
}

/**
 * Convenience object for fluent API access
 *
 * @example
 * const processor = languageProcessing.getLang('crk');
 * const lemma = processor?.analyze('foo+V+AI').lemma;
 */
export const languageProcessing = {
  getLang: getLanguageProcessor,
  getLemma,
  hasSpecialProcessing,
};

export default languageProcessing;
