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

    it('should handle mixed punctuation and preserve word boundaries', () => {
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
      expect(result).toEqual([]);
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
    it('should trim and lowercase text', () => {
      const result = (service as any).normalizeText('  Hello World  ');
      expect(result).toBe('hello world');
    });

    it('should handle unicode characters', () => {
      const result = (service as any).normalizeText('  Ē-MÂNOKÂKĒCIK  ');
      expect(result).toBe('ē-mânokâkēcik');
    });

    it('should handle empty/whitespace text', () => {
      expect((service as any).normalizeText('')).toBe('');
      expect((service as any).normalizeText('   ')).toBe('');
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
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        token: 'hello',
        start: 0,
        end: 5,
        score: 0
      });
    });

    it('should find close match candidates sorted by score', () => {
      const result = (service as any).findCandidates('helo', sampleTokens);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].token).toBe('hello');
      expect(result[0].score).toBe(1); // One character difference
    });

    it('should limit results to maxSuggestions', () => {
      const result = (service as any).findCandidates('t', sampleTokens, 2);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should reject candidates with too high edit distance', () => {
      const result = (service as any).findCandidates('xyz', sampleTokens);
      
      // Should not return any matches since 'xyz' is too different from any token
      expect(result).toHaveLength(0);
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

    it('should handle case-insensitive matching', () => {
      const regionText = 'Hello WORLD Test';
      const issues = [
        createMockIssue('issue1', 'hello'),
        createMockIssue('issue2', 'WORLD'),
        createMockIssue('issue3', 'Test')
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue1');
      expect(result.matched).toContain('issue2');
      expect(result.matched).toContain('issue3');
      expect(result.matched.size).toBe(3);
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
      const issues = [
        createMockIssue('issue1', '  Hello  '),  // Should match (normalized)
        createMockIssue('issue2', 'world')       // Should match (tokenizer extracts 'world' from 'world!')
      ];

      const result = service.match(regionText, issues);

      expect(result.matched).toContain('issue1');
      expect(result.matched).toContain('issue2');
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