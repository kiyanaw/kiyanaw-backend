import { issueSpanMatcher } from './issueSpanMatcher';
import type { IssueHighlight } from './textHighlightService';

describe('IssueSpanMatcher', () => {
  const createIssue = (id: string, text: string, type: 'needs-help' | 'indexing' | 'new-word' = 'new-word'): IssueHighlight => ({
    id,
    text,
    type,
    commentCount: 0
  });

  describe('findIssueSpans', () => {
    it('should find exact string matches', () => {
      const text = 'hello world test';
      const issues = [
        createIssue('i1', 'hello'),
        createIssue('i2', 'world'),
        createIssue('i3', 'missing')
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([
        { index: 0, length: 5, id: 'i1', type: 'new-word' },
        { index: 6, length: 5, id: 'i2', type: 'new-word' }
      ]);
    });

    it('should be case sensitive', () => {
      const text = 'Hello world';
      const issues = [
        createIssue('i1', 'hello'), // lowercase - should NOT match
        createIssue('i2', 'Hello'), // exact case - should match
        createIssue('i3', 'WORLD'), // uppercase - should NOT match
        createIssue('i4', 'world')  // exact case - should match
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([
        { index: 0, length: 5, id: 'i2', type: 'new-word' },
        { index: 6, length: 5, id: 'i4', type: 'new-word' }
      ]);
    });

    it('should include punctuation in exact matches', () => {
      const text = 'paskwāw-okimāw, test word.';
      const issues = [
        createIssue('i1', 'paskwāw-okimāw,'), // with comma - should match
        createIssue('i2', 'paskwāw-okimāw'),  // without comma - should match (substring)
        createIssue('i3', 'word.'),           // with period - should match
        createIssue('i4', 'word')             // without period - should match (substring)
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      // All matches should be found, including overlapping ones
      expect(result).toEqual([
        { index: 0, length: 15, id: 'i1', type: 'new-word' },  // "paskwāw-okimāw,"
        { index: 0, length: 14, id: 'i2', type: 'new-word' },  // "paskwāw-okimāw" (overlaps)
        { index: 21, length: 5, id: 'i3', type: 'new-word' },  // "word."
        { index: 21, length: 4, id: 'i4', type: 'new-word' }   // "word" (overlaps)
      ]);
    });

    it('should match full issue text including parentheses and affixes', () => {
      const text = 'nitawâpênâkêw awa (ē-)tipinikāsowiht âhpinohk ohtâwiya';
      const issues = [
        createIssue('i1', '(ē-)tipinikāsowiht'), // full text with parentheses
        createIssue('i2', 'tipinikāsowiht'),     // just the core word - should match (substring)
        createIssue('i3', 'ē-'),                // just the affix - should match (substring)
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      // All matches should be found, including overlapping substrings
      expect(result).toEqual([
        { index: 18, length: 18, id: 'i1', type: 'new-word' }, // "(ē-)tipinikāsowiht"
        { index: 19, length: 2, id: 'i3', type: 'new-word' },  // "ē-" (overlaps)
        { index: 22, length: 14, id: 'i2', type: 'new-word' }  // "tipinikāsowiht" (overlaps)
      ]);
    });

    it('should find multiple occurrences of the same issue text', () => {
      const text = 'test hello test world test';
      const issues = [
        createIssue('i1', 'test'),
        createIssue('i2', 'hello')
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([
        { index: 0, length: 4, id: 'i1', type: 'new-word' },
        { index: 5, length: 5, id: 'i2', type: 'new-word' },
        { index: 11, length: 4, id: 'i1', type: 'new-word' },
        { index: 22, length: 4, id: 'i1', type: 'new-word' }
      ]);
    });

    it('should handle overlapping issue texts by sorting longest first at same index', () => {
      const text = 'testing test';
      const issues = [
        createIssue('i1', 'test'),    // shorter, should come after
        createIssue('i2', 'testing') // longer, should come first
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([
        { index: 0, length: 7, id: 'i2', type: 'new-word' }, // longer first
        { index: 0, length: 4, id: 'i1', type: 'new-word' }, // shorter second
        { index: 8, length: 4, id: 'i1', type: 'new-word' }  // separate occurrence
      ]);
    });

    it('should handle different issue types', () => {
      const text = 'hello world test';
      const issues = [
        createIssue('i1', 'hello', 'needs-help'),
        createIssue('i2', 'world', 'indexing'),
        createIssue('i3', 'test', 'new-word')
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([
        { index: 0, length: 5, id: 'i1', type: 'needs-help' },
        { index: 6, length: 5, id: 'i2', type: 'indexing' },
        { index: 12, length: 4, id: 'i3', type: 'new-word' }
      ]);
    });

    it('should handle empty text', () => {
      const text = '';
      const issues = [createIssue('i1', 'hello')];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([]);
    });

    it('should handle empty issues array', () => {
      const text = 'hello world';
      const issues: IssueHighlight[] = [];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([]);
    });

    it('should handle issues with empty text', () => {
      const text = 'hello world';
      const issues = [
        createIssue('i1', 'hello'),
        createIssue('i2', ''),      // empty text - should be skipped
        createIssue('i3', '   '),   // whitespace only - should be skipped after trim
        createIssue('i4', 'world')
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([
        { index: 0, length: 5, id: 'i1', type: 'new-word' },
        { index: 6, length: 5, id: 'i4', type: 'new-word' }
      ]);
    });

    it('should handle unicode characters correctly', () => {
      const text = 'ē-mânokâkēcik nitayân test';
      const issues = [
        createIssue('i1', 'ē-mânokâkēcik'),
        createIssue('i2', 'nitayân'),
        createIssue('i3', 'missing')
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([
        { index: 0, length: 13, id: 'i1', type: 'new-word' },
        { index: 14, length: 7, id: 'i2', type: 'new-word' }
      ]);
    });

    it('should handle complex punctuation and spacing', () => {
      const text = 'Hello, "world"! (test) [more].';
      const issues = [
        createIssue('i1', 'Hello,'),
        createIssue('i2', '"world"!'),
        createIssue('i3', '(test)'),
        createIssue('i4', '[more].'),
        createIssue('i5', 'world'), // without quotes - should match (substring)
      ];

      const result = issueSpanMatcher.findIssueSpans(text, issues);

      expect(result).toEqual([
        { index: 0, length: 6, id: 'i1', type: 'new-word' },   // "Hello,"
        { index: 7, length: 8, id: 'i2', type: 'new-word' },   // '"world"!'
        { index: 8, length: 5, id: 'i5', type: 'new-word' },   // "world" (overlaps)
        { index: 16, length: 6, id: 'i3', type: 'new-word' },  // "(test)"
        { index: 23, length: 7, id: 'i4', type: 'new-word' }   // "[more]."
      ]);
    });
  });
});