/**
 * Shared text processing patterns used throughout the application
 */

/**
 * Region text matching pattern for identifying word boundaries in transcribed audio text.
 * 
 * This regex pattern is used across the application to consistently tokenize and match
 * text content from audio transcription regions. It matches Unicode letters, numbers,
 * underscores, and hyphens, which are the valid characters that make up words in our
 * transcribed content.
 * 
 * Primary use cases:
 * - Issue matching: Finding issues that correspond to specific words in region text
 * - Text highlighting: Applying visual highlights to known/unknown words in the editor
 * - RTE operations: Determining word boundaries for text selection and manipulation
 * - Spell checking: Tokenizing text for language analysis and suggestions
 * 
 * The pattern specifically includes:
 * - \p{L}: All Unicode letter characters (supports multilingual content like Cree)
 * - \p{N}: All Unicode number characters
 * - _: Underscores (common in transliterated text)
 * - -: Hyphens (essential for compound words like "kâ-kîsikâk" in Cree)
 * 
 * Examples of matched tokens: "hello", "kâ-kîsikâk", "word_123", "test-case", "中文"
 * Examples of non-matches: punctuation (.,!?), whitespace, emojis
 */
export const REGION_TEXT_MATCH_PATTERN = /([\p{L}\p{N}_-]+)/u;

/**
 * Global version of the region text matching pattern for use with matchAll()
 * to find all word tokens in a region's text content.
 */
export const REGION_TEXT_MATCH_PATTERN_GLOBAL = /([\p{L}\p{N}_-]+)/gu;
