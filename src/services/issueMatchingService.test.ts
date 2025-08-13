import { issueMatchingService, IssueMatchingService } from './issueMatchingService';
import type { IssueData } from './adt';

describe('IssueMatchingService', () => {
  let service: IssueMatchingService;

  beforeEach(() => {
    service = new IssueMatchingService();
  });

  describe('tokenizeText', () => {
    it('should tokenize simple text correctly', () => {
      const text = 'Hello world test';
      const result = (service as any).tokenizeText(text);
      
      expect(result).toEqual([
        { token: 'hello', start: 0, end: 5 },
        { token: 'world', start: 6, end: 11 },
        { token: 'test', start: 12, end: 16 }
      ]);
    });

    it('should handle unicode characters (Cree text)', () => {
      const text = 'ē-mânokâkēcik test';
      const result = (service as any).tokenizeText(text);
      
      expect(result).toEqual([
        { token: 'ē-mânokâkēcik', start: 0, end: 13 },
        { token: 'test', start: 14, end: 18 }
      ]);
    });

    it('should handle mixed punctuation and strip punctuation from tokens', () => {
      const text = 'word1, word2! word3?';
      const result = (service as any).tokenizeText(text);
      
      expect(result).toEqual([
        { token: 'word1', start: 0, end: 5 },
        { token: 'word2', start: 7, end: 12 },
        { token: 'word3', start: 14, end: 19 }
      ]);
    });

    it('should handle empty text', () => {
      const result = (service as any).tokenizeText('');
      expect(result).toEqual([]);
    });

    it('should handle text with only punctuation', () => {
      const result = (service as any).tokenizeText('!@#$%^&*()');
      expect(result).toEqual([]); // No tokens since punctuation is stripped
    });

    it('should normalize tokens to lowercase', () => {
      const text = 'Hello WORLD Test';
      const result = (service as any).tokenizeText(text);
      
      expect(result[0].token).toBe('hello');
      expect(result[1].token).toBe('world');
      expect(result[2].token).toBe('test');
    });
  });

  describe('editDistance', () => {
    it('should calculate distance for identical strings', () => {
      const result = (service as any).editDistance('hello', 'hello');
      expect(result).toBe(0);
    });

    it('should calculate distance for completely different strings', () => {
      const result = (service as any).editDistance('abc', 'xyz');
      expect(result).toBe(3);
    });

    it('should calculate distance for one substitution', () => {
      const result = (service as any).editDistance('hello', 'hallo');
      expect(result).toBe(1);
    });

    it('should calculate distance for one insertion', () => {
      const result = (service as any).editDistance('hello', 'helloo');
      expect(result).toBe(1);
    });

    it('should calculate distance for one deletion', () => {
      const result = (service as any).editDistance('hello', 'hell');
      expect(result).toBe(1);
    });

    it('should handle empty strings', () => {
      expect((service as any).editDistance('', '')).toBe(0);
      expect((service as any).editDistance('hello', '')).toBe(5);
      expect((service as any).editDistance('', 'hello')).toBe(5);
    });

    it('should calculate complex edit distances', () => {
      // "kitten" -> "sitting" requires 3 operations
      const result = (service as any).editDistance('kitten', 'sitting');
      expect(result).toBe(3);
    });
  });

  describe('normalizeText', () => {
    it('should extract first word and lowercase it', () => {
      const result = (service as any).normalizeText('  Hello World  ');
      expect(result).toBe('hello');
    });

    it('should handle unicode characters', () => {
      const result = (service as any).normalizeText('  Ē-MÂNOKÂKĒCIK  ');
      expect(result).toBe('ē-mânokâkēcik');
    });

    it('should strip punctuation', () => {
      const result = (service as any).normalizeText('hello,');
      expect(result).toBe('hello');
    });

    it('should handle empty/whitespace text', () => {
      expect((service as any).normalizeText('')).toBe('');
      expect((service as any).normalizeText('   ')).toBe('');
      expect((service as any).normalizeText('!@#$%')).toBe('');
    });
  });

  describe('findCandidates', () => {
    const sampleTokens = [
      { token: 'hello', start: 0, end: 5 },
      { token: 'world', start: 6, end: 11 },
      { token: 'test', start: 12, end: 16 },
      { token: 'testing', start: 17, end: 24 }
    ];

    it('should find exact match candidates', () => {
      const result = (service as any).findCandidates('hello', sampleTokens);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].token).toBe('hello');
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(5);
      expect(result[0].score).toBeLessThan(0); // Exact match gets bonuses
    });

    it('should find close match candidates sorted by score', () => {
      const result = (service as any).findCandidates('helo', sampleTokens);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].token).toBe('hello');
      expect(result[0].score).toBeLessThan(0); // Gets bonus for same first letter and similar length
    });

    it('should limit results to maxSuggestions', () => {
      const result = (service as any).findCandidates('t', sampleTokens, 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should reject candidates with too high edit distance', () => {
      const result = (service as any).findCandidates('xyz', sampleTokens);
      
      // Should have fewer matches due to length and similarity filtering
      expect(result.length).toBeLessThan(sampleTokens.length);
    });

    it('should sort candidates by score (best first)', () => {
      const tokens = [
        { token: 'testing', start: 0, end: 7 },
        { token: 'test', start: 8, end: 12 },
        { token: 'tests', start: 13, end: 18 }
      ];
      
      const result = (service as any).findCandidates('test', tokens);
      
      expect(result.length).toBeGreaterThan(1);
      expect(result[0].score).toBeLessThanOrEqual(result[1].score);
    });
  });

  describe('match', () => {
    const createMockIssue = (id: string, text: string, resolved = false): IssueData => ({
      id,
      text,
      resolved,
      type: 'new-word',
      owner: 'user1',
      ownerFriendly: 'User One',
      regionId: 'region1',
      transcriptionId: 'trans1',
      index: 1,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      _version: 1
    });

    it('should match exact text matches', () => {
      const regionText = 'hello world test';
      const issues = [
        createMockIssue('issue1', 'hello'),
        createMockIssue('issue2', 'world'),
        createMockIssue('issue3', 'missing')
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue1');
      expect(result.matched).toContain('issue2');
      expect(result.unmatched).toContain('issue3');
      expect(result.matched.size).toBe(2);
      expect(result.unmatched.size).toBe(1);
    });

    it('should be case sensitive for exact string matching', () => {
      const regionText = 'Hello WORLD Test';
      const issues = [
        createMockIssue('issue1', 'hello'),  // lowercase - should NOT match
        createMockIssue('issue2', 'Hello'),  // exact case - should match
        createMockIssue('issue3', 'WORLD'),  // exact case - should match
        createMockIssue('issue4', 'world'),  // lowercase - should NOT match
        createMockIssue('issue5', 'Test'),   // exact case - should match
        createMockIssue('issue6', 'test')    // lowercase - should NOT match
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue2'); // "Hello"
      expect(result.matched).toContain('issue3'); // "WORLD"
      expect(result.matched).toContain('issue5'); // "Test"
      expect(result.matched.size).toBe(3);
      
      expect(result.unmatched).toContain('issue1'); // "hello"
      expect(result.unmatched).toContain('issue4'); // "world"
      expect(result.unmatched).toContain('issue6'); // "test"
      expect(result.unmatched.size).toBe(3);
    });

    it('should skip resolved issues', () => {
      const regionText = 'hello world test';
      const issues = [
        createMockIssue('issue1', 'hello', false), // unresolved
        createMockIssue('issue2', 'world', true),  // resolved - should be skipped
        createMockIssue('issue3', 'test', false)   // unresolved
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue1');
      expect(result.matched).toContain('issue3');
      expect(result.matched).not.toContain('issue2');
      expect(result.unmatched).not.toContain('issue2');
      expect(result.matched.size).toBe(2);
    });

    it('should provide suggestions for unmatched issues', () => {
      const regionText = 'hello world testing';
      const issues = [
        createMockIssue('issue1', 'hello'),    // exact match
        createMockIssue('issue2', 'helo'),     // close match -> suggestion
        createMockIssue('issue3', 'xyz')       // no good match
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue1');
      expect(result.unmatched).toContain('issue2');
      expect(result.unmatched).toContain('issue3');
      
      // Should have suggestions for 'helo' (close to 'hello')
      expect(result.suggestions['issue2']).toBeDefined();
      expect(result.suggestions['issue2'].length).toBeGreaterThan(0);
      expect(result.suggestions['issue2'][0].token).toBe('hello');
    });

    it('should handle empty region text', () => {
      const regionText = '';
      const issues = [createMockIssue('issue1', 'hello')];

      const result = service.match(regionText, issues);

      expect(result.matched.size).toBe(0);
      expect(result.unmatched).toContain('issue1');
    });

    it('should handle empty issues array', () => {
      const regionText = 'hello world';
      const issues: IssueData[] = [];

      const result = service.match(regionText, issues);

      expect(result.matched.size).toBe(0);
      expect(result.unmatched.size).toBe(0);
      expect(Object.keys(result.suggestions)).toHaveLength(0);
    });

    it('should handle unicode text (Cree example)', () => {
      const regionText = 'ē-mânokâkēcik nitayân';
      const issues = [
        createMockIssue('issue1', 'ē-mânokâkēcik'),
        createMockIssue('issue2', 'nitayân'),
        createMockIssue('issue3', 'missing')
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue1');
      expect(result.matched).toContain('issue2');
      expect(result.unmatched).toContain('issue3');
    });

    it('should handle whitespace and punctuation correctly', () => {
      const regionText = '  hello,  world!  ';
      // The tokenizer strips punctuation, so we get ['hello', 'world']
      const issues = [
        createMockIssue('issue1', 'hello,'),      // Should match 'hello' (punctuation stripped)
        createMockIssue('issue2', 'world!'),      // Should match 'world' (punctuation stripped)
        createMockIssue('issue3', 'hello'),       // Should match 'hello' exactly
        createMockIssue('issue4', 'world')        // Should match 'world' exactly
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue1');
      expect(result.matched).toContain('issue2');
      expect(result.matched).toContain('issue3');
      expect(result.matched).toContain('issue4');
    });

    it('should find substring matches (exact string matching)', () => {
      const regionText = 'paskwāw-okimāw, test word.';
      const issues = [
        createMockIssue('issue1', 'paskwāw-okimāw,'),  // Full string - should match
        createMockIssue('issue2', 'paskwāw-okimāw'),   // Substring of issue1 - should also match
        createMockIssue('issue3', 'word.'),            // Full string - should match
        createMockIssue('issue4', 'word'),             // Substring of issue3 - should also match
        createMockIssue('issue5', 'test'),             // Exact match - should match
        createMockIssue('issue6', 'missing')           // Should not match
      ];

      const result = service.match(regionText, issues);

      // All substring matches should be found
      expect(result.matched).toContain('issue1'); // "paskwāw-okimāw," 
      expect(result.matched).toContain('issue2'); // "paskwāw-okimāw" (substring)
      expect(result.matched).toContain('issue3'); // "word."
      expect(result.matched).toContain('issue4'); // "word" (substring)
      expect(result.matched).toContain('issue5'); // "test"
      expect(result.matched.size).toBe(5);
      
      expect(result.unmatched).toContain('issue6'); // "missing"
      expect(result.unmatched.size).toBe(1);
    });

    it('should require exact case and spacing matching', () => {
      const regionText = '  PASKWĀW-OKIMĀW,   test!  ';
      const issues = [
        createMockIssue('issue1', 'paskwāw-okimāw,   '), // Different case - should NOT match
        createMockIssue('issue2', 'PASKWĀW-OKIMĀW,'),     // Exact case but no spaces - should NOT match
        createMockIssue('issue3', 'PASKWĀW-OKIMĀW,   '),  // Exact case with spaces - should match
        createMockIssue('issue4', 'test!'),               // Exact match - should match
        createMockIssue('issue5', 'TEST!')                // Different case - should NOT match
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue2'); // "PASKWĀW-OKIMĀW," (substring)
      expect(result.matched).toContain('issue3'); // "PASKWĀW-OKIMĀW,   " (full match)
      expect(result.matched).toContain('issue4'); // "test!" exact match
      expect(result.matched.size).toBe(3);
      
      expect(result.unmatched).toContain('issue1'); // Wrong case
      expect(result.unmatched).toContain('issue5'); // Wrong case
      expect(result.unmatched.size).toBe(2);
    });

    it('should match full issue text including parentheses and affixes', () => {
      const regionText = 'nitawāpēnākēw awa (ē-)tipinikāsowiht âhpinohk ohtāwiya - ohtāwīpana ēkwa.';
      const issues = [
        createMockIssue('i1', '(ē-)tipinikāsowiht', false), // full text with parentheses - should match
        createMockIssue('i2', 'tipinikāsowiht', false),     // core word (substring) - should also match
        createMockIssue('i3', 'ē-', false),                // affix (substring) - should also match
      ];

      const result = service.match(regionText, issues);

      // All substring matches should be found
      expect(result.matched).toContain('i1'); // Full text match
      expect(result.matched).toContain('i2'); // Core word (substring)
      expect(result.matched).toContain('i3'); // Affix (substring)
      expect(result.matched.size).toBe(3);
      
      expect(result.unmatched.size).toBe(0);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(issueMatchingService).toBeInstanceOf(IssueMatchingService);
      expect(issueMatchingService).toBe(issueMatchingService); // Same reference
    });

    it('should work with the singleton instance', () => {
      const regionText = 'hello world';
      const issues = [
        {
          id: 'test1',
          text: 'hello',
          resolved: false,
          type: 'new-word' as const,
          owner: 'user1',
          ownerFriendly: 'User One',
          regionId: 'region1',
          transcriptionId: 'trans1',
          index: 1,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          _version: 1
        }
      ];

      const result = issueMatchingService.match(regionText, issues);
      expect(result.matched).toContain('test1');
    });
  });
});