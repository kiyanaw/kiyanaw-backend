import { REGION_TEXT_MATCH_PATTERN, REGION_TEXT_MATCH_PATTERN_GLOBAL } from './text-patterns';

describe('text-patterns', () => {
  describe('REGION_TEXT_MATCH_PATTERN', () => {
    it('should match Unicode letters, numbers, underscores, and hyphens', () => {
      expect(REGION_TEXT_MATCH_PATTERN.test('hello')).toBe(true);
      expect(REGION_TEXT_MATCH_PATTERN.test('word123')).toBe(true);
      expect(REGION_TEXT_MATCH_PATTERN.test('word_test')).toBe(true);
      expect(REGION_TEXT_MATCH_PATTERN.test('word-test')).toBe(true);
      expect(REGION_TEXT_MATCH_PATTERN.test('kâ-kîsikâk')).toBe(true); // Cree with accents and hyphens
      expect(REGION_TEXT_MATCH_PATTERN.test('中文')).toBe(true); // Chinese characters
      expect(REGION_TEXT_MATCH_PATTERN.test('🙂')).toBe(false); // Emoji
      expect(REGION_TEXT_MATCH_PATTERN.test('   ')).toBe(false); // Whitespace
      expect(REGION_TEXT_MATCH_PATTERN.test('.')).toBe(false); // Punctuation
    });

    it('should extract the first match from text', () => {
      const text = 'hello world';
      const match = text.match(REGION_TEXT_MATCH_PATTERN);
      expect(match?.[0]).toBe('hello');
    });
  });

  describe('REGION_TEXT_MATCH_PATTERN_GLOBAL', () => {
    it('should match all words in text', () => {
      const text = 'hello world-test kâ-kîsikâk';
      const matches = Array.from(text.matchAll(REGION_TEXT_MATCH_PATTERN_GLOBAL));
      
      expect(matches).toHaveLength(3);
      expect(matches[0][0]).toBe('hello');
      expect(matches[1][0]).toBe('world-test');
      expect(matches[2][0]).toBe('kâ-kîsikâk');
    });

    it('should work with text.split() for tokenization', () => {
      const text = 'hello, world!';
      const tokens = text.split(REGION_TEXT_MATCH_PATTERN);
      
      // Should split on words, keeping separators
      expect(tokens).toEqual(['', 'hello', ', ', 'world', '!']);
    });

    it('should handle empty text', () => {
      const matches = Array.from(''.matchAll(REGION_TEXT_MATCH_PATTERN_GLOBAL));
      expect(matches).toHaveLength(0);
    });

    it('should handle text with no words', () => {
      const matches = Array.from('!@#$%'.matchAll(REGION_TEXT_MATCH_PATTERN_GLOBAL));
      expect(matches).toHaveLength(0);
    });
  });
});
