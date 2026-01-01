/**
 * Pure computational utilities for RTE highlighting operations.
 *
 * These functions perform text matching, range computation, and diff operations
 * without any dependencies on Quill or DOM. They're designed to be easily testable
 * and composable.
 */

import { type IssueType } from './adt';
import { type IssueHighlight } from './textHighlightService';
import { REGION_TEXT_MATCH_PATTERN } from '../constants/text-patterns';
import { type WordAnalysis, type SpellingSuggestion } from './adt';
import { ISSUE_FORMATS } from './rteService.blots';

// ============================================================================
// Types
// ============================================================================

/** A range representing a formatted segment in text */
export interface FormatRange {
  start: number;
  end: number;
}

/** A range with associated issue metadata */
export interface IssueRange extends FormatRange {
  type: IssueType;
  id: string | null;
}

/** Collection of current formatting ranges by type */
export interface CurrentRanges {
  known: FormatRange[];
  ambiguous: FormatRange[];
  spelling: FormatRange[];
  issues: IssueRange[];
}

/** A single format operation to apply or remove */
export interface FormatOperation {
  index: number;
  length: number;
  value: boolean | string | null;
  phase: 'remove' | 'add';
  origin: 'known' | 'ambiguous' | 'spelling' | 'issue';
  formatName: string;
}

/** Match result with position info */
export interface MatchResult {
  index: number;
  length: number;
}

/** Match result with word text */
export interface WordMatch extends MatchResult {
  word: string;
}

/** Match result with issue metadata */
export interface IssueMatch extends MatchResult {
  id: string;
  type: IssueType;
}

// ============================================================================
// Text Matching Functions
// ============================================================================

/**
 * Finds positions of issue text matches within the given text.
 *
 * Tokenizes the text and matches each token against the provided issues.
 * Returns matches sorted by index, with longer matches preferred at same position.
 *
 * @param text - The text to search within
 * @param issues - Array of issues with text to match
 * @returns Array of matches with position and issue metadata
 */
export function findIssueMatches(
  text: string,
  issues: IssueHighlight[]
): IssueMatch[] {
  if (!text || issues.length === 0) {
    return [];
  }

  const matches: IssueMatch[] = [];
  const tokens = text.split(REGION_TEXT_MATCH_PATTERN);
  let currentIndex = 0;

  // Create issue text lookup for efficient matching
  // Normalize issue text the same way tokens are created
  const issueTextMap = new Map<string, { id: string; type: IssueType }>();
  for (const issue of issues) {
    const normalized = issue.text.trim().toLowerCase();
    const match = normalized.match(REGION_TEXT_MATCH_PATTERN);
    const key = match ? match[0] : normalized;
    issueTextMap.set(key, { id: issue.id, type: issue.type });
  }

  for (const token of tokens) {
    if (REGION_TEXT_MATCH_PATTERN.test(token)) {
      const lowerToken = token.trim().toLowerCase();
      const issueInfo = issueTextMap.get(lowerToken);
      if (issueInfo) {
        matches.push({
          index: currentIndex,
          length: token.length,
          id: issueInfo.id,
          type: issueInfo.type,
        });
      }
    }
    currentIndex += token.length;
  }

  // Sort by index for safe RTE formatting
  return matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return b.length - a.length;
  });
}

/**
 * Finds positions of ambiguous words within the given text.
 *
 * Uses regionAnalysis to correlate token positions with ambiguous indices.
 * Only marks words at indices present in the ambiguousIndices set.
 *
 * @param text - The text to search within
 * @param ambiguousIndices - Set of word indices that are ambiguous
 * @param regionAnalysis - Analysis data correlating word indices
 * @returns Array of matches with position info
 */
export function findAmbiguousWordMatches(
  text: string,
  ambiguousIndices: Set<number>,
  regionAnalysis: WordAnalysis[]
): WordMatch[] {
  const matches: WordMatch[] = [];

  if (ambiguousIndices.size === 0 || regionAnalysis.length === 0) {
    return matches;
  }

  const tokens = text.split(REGION_TEXT_MATCH_PATTERN);
  let charPos = 0;
  let knownWordIdx = 0;

  for (const token of tokens) {
    if (REGION_TEXT_MATCH_PATTERN.test(token)) {
      const lowerToken = token.toLowerCase();
      if (
        knownWordIdx < regionAnalysis.length &&
        regionAnalysis[knownWordIdx].word.toLowerCase() === lowerToken
      ) {
        if (ambiguousIndices.has(knownWordIdx)) {
          matches.push({ word: token, index: charPos, length: token.length });
        }
        knownWordIdx++;
      }
    }
    charPos += token.length;
  }

  return matches;
}

/**
 * Finds positions of words that have spelling suggestions.
 *
 * Matches tokens against the misspelled words from spelling suggestions.
 *
 * @param text - The text to search within
 * @param spellingSuggestions - Array of spelling suggestions
 * @returns Array of matches with position info
 */
export function findSpellingSuggestionMatches(
  text: string,
  spellingSuggestions: SpellingSuggestion[]
): WordMatch[] {
  const matches: WordMatch[] = [];

  if (spellingSuggestions.length === 0) {
    return matches;
  }

  // Build a set of misspelled words from suggestions
  const misspelledWords = new Set(
    spellingSuggestions.map((s) => s.word.toLowerCase())
  );

  // Find all occurrences of misspelled words in the text
  const tokens = text.split(REGION_TEXT_MATCH_PATTERN);
  let charPos = 0;

  for (const token of tokens) {
    if (REGION_TEXT_MATCH_PATTERN.test(token)) {
      const lowerToken = token.toLowerCase();
      if (misspelledWords.has(lowerToken)) {
        matches.push({ word: token, index: charPos, length: token.length });
      }
    }
    charPos += token.length;
  }

  return matches;
}

// ============================================================================
// Priority Filtering
// ============================================================================

/**
 * Filters match arrays by priority to prevent overlapping highlights.
 *
 * Priority order (highest to lowest):
 * 1. Issues - always shown
 * 2. Spelling suggestions - shown unless overlapping with issues
 * 3. Ambiguous words - shown unless overlapping with issues or spelling
 * 4. Known words - shown unless overlapping with anything else
 *
 * @param knownMatches - Known word matches
 * @param ambiguousMatches - Ambiguous word matches
 * @param spellingMatches - Spelling suggestion matches
 * @param issueMatches - Issue matches (highest priority)
 * @returns Filtered match arrays with overlaps removed
 */
export function filterMatchesByPriority(
  knownMatches: MatchResult[],
  ambiguousMatches: MatchResult[],
  spellingMatches: MatchResult[],
  issueMatches: MatchResult[]
): {
  filteredKnown: MatchResult[];
  filteredAmbiguous: MatchResult[];
  filteredSpelling: MatchResult[];
} {
  const toRange = (match: MatchResult) => ({
    start: match.index,
    end: match.index + match.length,
  });

  const rangesOverlap = (
    start: number,
    end: number,
    ranges: Array<{ start: number; end: number }>
  ): boolean => ranges.some((range) => start < range.end && end > range.start);

  const issueRanges = issueMatches.map(toRange);
  const spellingRanges = spellingMatches.map(toRange);
  const ambiguousRanges = ambiguousMatches.map(toRange);

  // Issues take priority over everything
  const filteredSpelling = spellingMatches.filter((match) => {
    const start = match.index;
    const end = match.index + match.length;
    return !rangesOverlap(start, end, issueRanges);
  });

  // Ambiguous takes priority over known, but not over issues or spelling
  const filteredAmbiguous = ambiguousMatches.filter((match) => {
    const start = match.index;
    const end = match.index + match.length;
    return (
      !rangesOverlap(start, end, issueRanges) &&
      !rangesOverlap(start, end, spellingRanges)
    );
  });

  // Known words have lowest priority
  const filteredKnown = knownMatches.filter((match) => {
    const start = match.index;
    const end = match.index + match.length;
    return (
      !rangesOverlap(start, end, issueRanges) &&
      !rangesOverlap(start, end, spellingRanges) &&
      !rangesOverlap(start, end, ambiguousRanges)
    );
  });

  return { filteredKnown, filteredAmbiguous, filteredSpelling };
}

// ============================================================================
// Format Operation Computation
// ============================================================================

/**
 * Computes the minimal set of format operations to transform current ranges to desired ranges.
 *
 * This is the core diff algorithm that determines what formatting changes are needed.
 * It compares current and desired states for each format type and generates:
 * - 'remove' operations for ranges that exist but shouldn't
 * - 'add' operations for ranges that should exist but don't
 *
 * @param currentRanges - Currently formatted ranges from the editor
 * @param desiredRanges - Desired formatted ranges based on analysis
 * @param textLength - Length of the text (for bounds checking)
 * @returns Array of format operations to apply
 */
export function computeFormatOperations(
  currentRanges: CurrentRanges,
  desiredRanges: CurrentRanges,
  textLength: number
): FormatOperation[] {
  const operations: FormatOperation[] = [];

  const queueOperation = (
    index: number,
    length: number,
    value: boolean | string | null,
    phase: 'remove' | 'add',
    origin: 'known' | 'ambiguous' | 'spelling' | 'issue',
    formatName: string
  ): void => {
    if (length <= 0 || index < 0 || index >= textLength) return;
    const safeLength = Math.min(length, textLength - index);
    if (safeLength <= 0) return;
    operations.push({ index, length: safeLength, value, phase, origin, formatName });
  };

  const rangeKey = (range: FormatRange) => `${range.start}-${range.end}`;
  const issueRangeKey = (range: IssueRange) =>
    `${range.start}-${range.end}-${range.type}`;

  // Diff simple formats (known, ambiguous, spelling)
  const diffSimple = (
    current: FormatRange[],
    desired: FormatRange[],
    origin: 'known' | 'ambiguous' | 'spelling',
    formatName: string
  ) => {
    const currentMap = new Map(current.map((r) => [rangeKey(r), r]));
    const desiredMap = new Map(desired.map((r) => [rangeKey(r), r]));

    currentMap.forEach((range, key) => {
      if (!desiredMap.has(key)) {
        queueOperation(
          range.start,
          range.end - range.start,
          false,
          'remove',
          origin,
          formatName
        );
      }
    });

    desiredMap.forEach((range, key) => {
      if (!currentMap.has(key)) {
        queueOperation(
          range.start,
          range.end - range.start,
          true,
          'add',
          origin,
          formatName
        );
      }
    });
  };

  // Diff issue formats
  const diffIssues = (current: IssueRange[], desired: IssueRange[]) => {
    const currentMap = new Map(current.map((r) => [issueRangeKey(r), r]));
    const desiredMap = new Map(desired.map((r) => [issueRangeKey(r), r]));

    currentMap.forEach((range, key) => {
      if (!desiredMap.has(key)) {
        const formatName = `issue-${range.type}`;
        queueOperation(
          range.start,
          range.end - range.start,
          false,
          'remove',
          'issue',
          formatName
        );
      }
    });

    desiredMap.forEach((range, key) => {
      const existing = currentMap.get(key);
      if (!existing || existing.id !== range.id) {
        const formatName = `issue-${range.type}`;
        queueOperation(
          range.start,
          range.end - range.start,
          range.id ?? true,
          'add',
          'issue',
          formatName
        );
      }
    });
  };

  diffSimple(currentRanges.known, desiredRanges.known, 'known', 'known-word');
  diffSimple(
    currentRanges.ambiguous,
    desiredRanges.ambiguous,
    'ambiguous',
    'ambiguous-word'
  );
  diffSimple(
    currentRanges.spelling,
    desiredRanges.spelling,
    'spelling',
    'spelling-suggestion'
  );
  diffIssues(currentRanges.issues, desiredRanges.issues);

  return operations;
}

// ============================================================================
// Quill Content Parsing
// ============================================================================

/** A single operation from Quill delta */
export interface QuillOp {
  insert?: string | Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

/**
 * Parses Quill delta operations into format ranges.
 *
 * Extracts the currently applied formatting from Quill content operations.
 * This is used to determine what formatting already exists before computing diffs.
 *
 * @param ops - Array of Quill delta operations
 * @returns Collection of ranges by format type
 */
export function parseQuillOpsToRanges(ops: QuillOp[]): CurrentRanges {
  const known: FormatRange[] = [];
  const ambiguous: FormatRange[] = [];
  const spelling: FormatRange[] = [];
  const issues: IssueRange[] = [];

  let cursor = 0;
  for (const op of ops) {
    const insert = op.insert;
    const segment = typeof insert === 'string' ? insert : '\uFFFC';
    const segmentLength = segment.length;
    if (segmentLength === 0) continue;

    const attrs = op.attributes || {};

    if (attrs['known-word']) {
      known.push({ start: cursor, end: cursor + segmentLength });
    }

    if (attrs['ambiguous-word']) {
      ambiguous.push({ start: cursor, end: cursor + segmentLength });
    }

    if (attrs['spelling-suggestion']) {
      spelling.push({ start: cursor, end: cursor + segmentLength });
    }

    for (const formatName of ISSUE_FORMATS) {
      const value = attrs[formatName];
      if (value) {
        const type = formatName.replace('issue-', '') as IssueType;
        issues.push({
          start: cursor,
          end: cursor + segmentLength,
          type,
          id: typeof value === 'string' ? value : null,
        });
      }
    }

    cursor += segmentLength;
  }

  return { known, ambiguous, spelling, issues };
}
