import {
  findIssueMatches,
  findAmbiguousWordMatches,
  findSpellingSuggestionMatches,
  filterMatchesByPriority,
  computeFormatOperations,
  parseQuillOpsToRanges,
  type CurrentRanges,
  type FormatOperation,
  type MatchResult,
} from './rteService.utils';
import type { IssueHighlight } from './textHighlightService';
import type { WordAnalysis, SpellingSuggestion } from './adt';

describe('rteService.utils', () => {
  // ==========================================================================
  // findIssueMatches
  // ==========================================================================
  describe('findIssueMatches', () => {
    it('should return empty array for empty text', () => {
      const issues: IssueHighlight[] = [
        { id: '1', text: 'hello', type: 'needs-help' },
      ];
      expect(findIssueMatches('', issues)).toEqual([]);
    });

    it('should return empty array for empty issues', () => {
      expect(findIssueMatches('hello world', [])).toEqual([]);
    });

    it('should find single issue match', () => {
      const text = 'hello world';
      const issues: IssueHighlight[] = [
        { id: 'issue-1', text: 'hello', type: 'needs-help' },
      ];

      const matches = findIssueMatches(text, issues);

      expect(matches).toEqual([
        { index: 0, length: 5, id: 'issue-1', type: 'needs-help' },
      ]);
    });

    it('should find multiple issue matches', () => {
      const text = 'hello world goodbye';
      const issues: IssueHighlight[] = [
        { id: 'issue-1', text: 'hello', type: 'needs-help' },
        { id: 'issue-2', text: 'goodbye', type: 'indexing' },
      ];

      const matches = findIssueMatches(text, issues);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toMatchObject({ index: 0, id: 'issue-1' });
      expect(matches[1]).toMatchObject({ index: 12, id: 'issue-2' });
    });

    it('should be case-insensitive', () => {
      const text = 'Hello WORLD';
      const issues: IssueHighlight[] = [
        { id: 'issue-1', text: 'hello', type: 'needs-help' },
        { id: 'issue-2', text: 'world', type: 'indexing' },
      ];

      const matches = findIssueMatches(text, issues);

      expect(matches).toHaveLength(2);
    });

    it('should return matches sorted by index', () => {
      const text = 'zebra apple banana';
      const issues: IssueHighlight[] = [
        { id: '3', text: 'banana', type: 'new-word' },
        { id: '1', text: 'zebra', type: 'needs-help' },
        { id: '2', text: 'apple', type: 'indexing' },
      ];

      const matches = findIssueMatches(text, issues);

      expect(matches[0].id).toBe('1'); // zebra at 0
      expect(matches[1].id).toBe('2'); // apple at 6
      expect(matches[2].id).toBe('3'); // banana at 12
    });

    it('should handle issues with whitespace in text', () => {
      const text = 'hello world';
      const issues: IssueHighlight[] = [
        { id: 'issue-1', text: '  hello  ', type: 'needs-help' },
      ];

      const matches = findIssueMatches(text, issues);

      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('issue-1');
    });
  });

  // ==========================================================================
  // findAmbiguousWordMatches
  // ==========================================================================
  describe('findAmbiguousWordMatches', () => {
    it('should return empty array when no ambiguous indices', () => {
      const text = 'hello world';
      const regionAnalysis: WordAnalysis[] = [
        { word: 'hello', analysis: 'hello+N', allAnalysis: ['hello+N'], source: 'auto', index: 0 },
        { word: 'world', analysis: 'world+N', allAnalysis: ['world+N'], source: 'auto', index: 1 },
      ];

      const matches = findAmbiguousWordMatches(text, new Set(), regionAnalysis);

      expect(matches).toEqual([]);
    });

    it('should return empty array when no region analysis', () => {
      const matches = findAmbiguousWordMatches('hello world', new Set([0]), []);
      expect(matches).toEqual([]);
    });

    it('should find ambiguous word at specific index', () => {
      const text = 'isi foo isi';
      const regionAnalysis: WordAnalysis[] = [
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc', 'itêw+V'], source: 'auto', index: 0 },
        { word: 'foo', analysis: 'foo+N', allAnalysis: ['foo+N'], source: 'auto', index: 1 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc', 'itêw+V'], source: 'auto', index: 2 },
      ];

      // Only second 'isi' is ambiguous
      const matches = findAmbiguousWordMatches(text, new Set([2]), regionAnalysis);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ word: 'isi', index: 8, length: 3 });
    });

    it('should find multiple ambiguous words', () => {
      const text = 'isi foo isi';
      const regionAnalysis: WordAnalysis[] = [
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc', 'itêw+V'], source: 'auto', index: 0 },
        { word: 'foo', analysis: 'foo+N', allAnalysis: ['foo+N'], source: 'auto', index: 1 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['isi+Ipc', 'itêw+V'], source: 'auto', index: 2 },
      ];

      // Both 'isi' words are ambiguous
      const matches = findAmbiguousWordMatches(text, new Set([0, 2]), regionAnalysis);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ word: 'isi', index: 0, length: 3 });
      expect(matches[1]).toEqual({ word: 'isi', index: 8, length: 3 });
    });

    it('should be case-insensitive when matching', () => {
      const text = 'Hello world';
      const regionAnalysis: WordAnalysis[] = [
        { word: 'hello', analysis: 'hello+N', allAnalysis: ['hello+N', 'hello+V'], source: 'auto', index: 0 },
        { word: 'world', analysis: 'world+N', allAnalysis: ['world+N'], source: 'auto', index: 1 },
      ];

      const matches = findAmbiguousWordMatches(text, new Set([0]), regionAnalysis);

      expect(matches).toHaveLength(1);
      expect(matches[0].word).toBe('Hello');
    });
  });

  // ==========================================================================
  // findSpellingSuggestionMatches
  // ==========================================================================
  describe('findSpellingSuggestionMatches', () => {
    it('should return empty array for empty suggestions', () => {
      expect(findSpellingSuggestionMatches('hello world', [])).toEqual([]);
    });

    it('should find misspelled word', () => {
      const text = 'helo world';
      const suggestions: SpellingSuggestion[] = [
        { word: 'helo', allSuggestions: ['hello'] },
      ];

      const matches = findSpellingSuggestionMatches(text, suggestions);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ word: 'helo', index: 0, length: 4 });
    });

    it('should find multiple misspelled words', () => {
      const text = 'helo wrold';
      const suggestions: SpellingSuggestion[] = [
        { word: 'helo', allSuggestions: ['hello'] },
        { word: 'wrold', allSuggestions: ['world'] },
      ];

      const matches = findSpellingSuggestionMatches(text, suggestions);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ word: 'helo', index: 0, length: 4 });
      expect(matches[1]).toEqual({ word: 'wrold', index: 5, length: 5 });
    });

    it('should find all occurrences of misspelled word', () => {
      const text = 'helo helo helo';
      const suggestions: SpellingSuggestion[] = [
        { word: 'helo', allSuggestions: ['hello'] },
      ];

      const matches = findSpellingSuggestionMatches(text, suggestions);

      expect(matches).toHaveLength(3);
    });

    it('should be case-insensitive', () => {
      const text = 'HELO World';
      const suggestions: SpellingSuggestion[] = [
        { word: 'helo', allSuggestions: ['hello'] },
      ];

      const matches = findSpellingSuggestionMatches(text, suggestions);

      expect(matches).toHaveLength(1);
      expect(matches[0].word).toBe('HELO');
    });
  });

  // ==========================================================================
  // filterMatchesByPriority
  // ==========================================================================
  describe('filterMatchesByPriority', () => {
    it('should return all matches when no overlaps', () => {
      const known: MatchResult[] = [{ index: 0, length: 5 }];
      const ambiguous: MatchResult[] = [{ index: 10, length: 5 }];
      const spelling: MatchResult[] = [{ index: 20, length: 5 }];
      const issues: MatchResult[] = [{ index: 30, length: 5 }];

      const result = filterMatchesByPriority(known, ambiguous, spelling, issues);

      expect(result.filteredKnown).toHaveLength(1);
      expect(result.filteredAmbiguous).toHaveLength(1);
      expect(result.filteredSpelling).toHaveLength(1);
    });

    it('should filter out known words that overlap with issues', () => {
      const known: MatchResult[] = [{ index: 0, length: 5 }];
      const ambiguous: MatchResult[] = [];
      const spelling: MatchResult[] = [];
      const issues: MatchResult[] = [{ index: 0, length: 5 }];

      const result = filterMatchesByPriority(known, ambiguous, spelling, issues);

      expect(result.filteredKnown).toHaveLength(0);
    });

    it('should filter out known words that overlap with ambiguous', () => {
      const known: MatchResult[] = [{ index: 0, length: 5 }];
      const ambiguous: MatchResult[] = [{ index: 2, length: 5 }];
      const spelling: MatchResult[] = [];
      const issues: MatchResult[] = [];

      const result = filterMatchesByPriority(known, ambiguous, spelling, issues);

      expect(result.filteredKnown).toHaveLength(0);
      expect(result.filteredAmbiguous).toHaveLength(1);
    });

    it('should filter out ambiguous that overlaps with issues', () => {
      const known: MatchResult[] = [];
      const ambiguous: MatchResult[] = [{ index: 0, length: 5 }];
      const spelling: MatchResult[] = [];
      const issues: MatchResult[] = [{ index: 3, length: 5 }];

      const result = filterMatchesByPriority(known, ambiguous, spelling, issues);

      expect(result.filteredAmbiguous).toHaveLength(0);
    });

    it('should filter out spelling that overlaps with issues', () => {
      const known: MatchResult[] = [];
      const ambiguous: MatchResult[] = [];
      const spelling: MatchResult[] = [{ index: 0, length: 5 }];
      const issues: MatchResult[] = [{ index: 0, length: 5 }];

      const result = filterMatchesByPriority(known, ambiguous, spelling, issues);

      expect(result.filteredSpelling).toHaveLength(0);
    });

    it('should handle complex overlapping scenario', () => {
      // Text: "hello world test"
      // known: "hello" (0-5), "world" (6-11), "test" (12-16)
      // issue: "world" (6-11)
      // ambiguous: "test" (12-16)
      const known: MatchResult[] = [
        { index: 0, length: 5 },
        { index: 6, length: 5 },
        { index: 12, length: 4 },
      ];
      const ambiguous: MatchResult[] = [{ index: 12, length: 4 }];
      const spelling: MatchResult[] = [];
      const issues: MatchResult[] = [{ index: 6, length: 5 }];

      const result = filterMatchesByPriority(known, ambiguous, spelling, issues);

      // "hello" should remain (no overlap)
      // "world" should be filtered (overlaps with issue)
      // "test" should be filtered (overlaps with ambiguous)
      expect(result.filteredKnown).toHaveLength(1);
      expect(result.filteredKnown[0].index).toBe(0);
      expect(result.filteredAmbiguous).toHaveLength(1);
    });
  });

  // ==========================================================================
  // computeFormatOperations
  // ==========================================================================
  describe('computeFormatOperations', () => {
    const emptyRanges: CurrentRanges = {
      known: [],
      ambiguous: [],
      spelling: [],
      issues: [],
    };

    it('should return empty array when current equals desired', () => {
      const ranges: CurrentRanges = {
        known: [{ start: 0, end: 5 }],
        ambiguous: [],
        spelling: [],
        issues: [],
      };

      const ops = computeFormatOperations(ranges, ranges, 100);

      expect(ops).toEqual([]);
    });

    it('should generate add operation for new known word', () => {
      const current = emptyRanges;
      const desired: CurrentRanges = {
        ...emptyRanges,
        known: [{ start: 0, end: 5 }],
      };

      const ops = computeFormatOperations(current, desired, 100);

      expect(ops).toHaveLength(1);
      expect(ops[0]).toMatchObject({
        index: 0,
        length: 5,
        value: true,
        phase: 'add',
        origin: 'known',
        formatName: 'known-word',
      });
    });

    it('should generate remove operation for stale known word', () => {
      const current: CurrentRanges = {
        ...emptyRanges,
        known: [{ start: 0, end: 5 }],
      };
      const desired = emptyRanges;

      const ops = computeFormatOperations(current, desired, 100);

      expect(ops).toHaveLength(1);
      expect(ops[0]).toMatchObject({
        index: 0,
        length: 5,
        value: false,
        phase: 'remove',
        origin: 'known',
        formatName: 'known-word',
      });
    });

    it('should handle issue operations with id', () => {
      const current = emptyRanges;
      const desired: CurrentRanges = {
        ...emptyRanges,
        issues: [{ start: 0, end: 5, type: 'needs-help', id: 'issue-123' }],
      };

      const ops = computeFormatOperations(current, desired, 100);

      expect(ops).toHaveLength(1);
      expect(ops[0]).toMatchObject({
        index: 0,
        length: 5,
        value: 'issue-123',
        phase: 'add',
        origin: 'issue',
        formatName: 'issue-needs-help',
      });
    });

    it('should clamp operations to text length', () => {
      const current = emptyRanges;
      const desired: CurrentRanges = {
        ...emptyRanges,
        known: [{ start: 8, end: 15 }],
      };

      const ops = computeFormatOperations(current, desired, 10);

      expect(ops).toHaveLength(1);
      expect(ops[0].length).toBe(2); // Clamped to 10 - 8 = 2
    });

    it('should skip operations with invalid indices', () => {
      const current = emptyRanges;
      const desired: CurrentRanges = {
        ...emptyRanges,
        known: [{ start: 100, end: 105 }], // Beyond text length
      };

      const ops = computeFormatOperations(current, desired, 50);

      expect(ops).toHaveLength(0);
    });

    it('should handle multiple format types together', () => {
      const current = emptyRanges;
      const desired: CurrentRanges = {
        known: [{ start: 0, end: 5 }],
        ambiguous: [{ start: 10, end: 15 }],
        spelling: [{ start: 20, end: 25 }],
        issues: [{ start: 30, end: 35, type: 'indexing', id: null }],
      };

      const ops = computeFormatOperations(current, desired, 100);

      expect(ops).toHaveLength(4);
      expect(ops.map((o) => o.origin).sort()).toEqual([
        'ambiguous',
        'issue',
        'known',
        'spelling',
      ]);
    });
  });

  // ==========================================================================
  // parseQuillOpsToRanges
  // ==========================================================================
  describe('parseQuillOpsToRanges', () => {
    it('should return empty ranges for empty ops', () => {
      const result = parseQuillOpsToRanges([]);

      expect(result).toEqual({
        known: [],
        ambiguous: [],
        spelling: [],
        issues: [],
      });
    });

    it('should parse known-word format', () => {
      const ops = [
        { insert: 'hello', attributes: { 'known-word': true } },
        { insert: ' world' },
      ];

      const result = parseQuillOpsToRanges(ops);

      expect(result.known).toEqual([{ start: 0, end: 5 }]);
    });

    it('should parse ambiguous-word format', () => {
      const ops = [
        { insert: 'hello ' },
        { insert: 'isi', attributes: { 'ambiguous-word': true } },
        { insert: ' world' },
      ];

      const result = parseQuillOpsToRanges(ops);

      expect(result.ambiguous).toEqual([{ start: 6, end: 9 }]);
    });

    it('should parse spelling-suggestion format', () => {
      const ops = [
        { insert: 'helo', attributes: { 'spelling-suggestion': true } },
        { insert: ' world' },
      ];

      const result = parseQuillOpsToRanges(ops);

      expect(result.spelling).toEqual([{ start: 0, end: 4 }]);
    });

    it('should parse issue formats with id', () => {
      const ops = [
        { insert: 'hello', attributes: { 'issue-needs-help': 'issue-123' } },
        { insert: ' world' },
      ];

      const result = parseQuillOpsToRanges(ops);

      expect(result.issues).toEqual([
        { start: 0, end: 5, type: 'needs-help', id: 'issue-123' },
      ]);
    });

    it('should parse issue formats without id', () => {
      const ops = [
        { insert: 'hello', attributes: { 'issue-indexing': true } },
      ];

      const result = parseQuillOpsToRanges(ops);

      expect(result.issues).toEqual([
        { start: 0, end: 5, type: 'indexing', id: null },
      ]);
    });

    it('should handle multiple formats on same segment', () => {
      const ops = [
        {
          insert: 'hello',
          attributes: {
            'known-word': true,
            'issue-needs-help': 'issue-123',
          },
        },
      ];

      const result = parseQuillOpsToRanges(ops);

      expect(result.known).toEqual([{ start: 0, end: 5 }]);
      expect(result.issues).toEqual([
        { start: 0, end: 5, type: 'needs-help', id: 'issue-123' },
      ]);
    });

    it('should track cursor position across segments', () => {
      const ops = [
        { insert: 'hello' },
        { insert: ' ' },
        { insert: 'world', attributes: { 'known-word': true } },
      ];

      const result = parseQuillOpsToRanges(ops);

      expect(result.known).toEqual([{ start: 6, end: 11 }]);
    });

    it('should handle non-string inserts as placeholder', () => {
      const ops = [
        { insert: 'hello ' },
        { insert: { image: 'test.png' } }, // Embed treated as single char
        { insert: ' world', attributes: { 'known-word': true } },
      ];

      const result = parseQuillOpsToRanges(ops);

      // Image is treated as single char \uFFFC
      expect(result.known).toEqual([{ start: 7, end: 13 }]);
    });
  });
});
