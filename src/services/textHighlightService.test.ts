import { textHighlightService } from './textHighlightService';

describe('TextHighlightService', () => {
  const knownWords = new Set(['hello', 'world', 'êkwa', 'itwêw', 'ohci']);

  describe('generateHTML', () => {
    it('should highlight known words in HTML', () => {
      const text = 'hello world test';
      const result = textHighlightService.generateHTML(text, knownWords);
      
      expect(result).toBe('<span class="known-word">hello</span> <span class="known-word">world</span> test');
    });

    it('should handle Unicode characters', () => {
      const text = 'êkwa itwêw test';
      const result = textHighlightService.generateHTML(text, knownWords);
      
      expect(result).toBe('<span class="known-word">êkwa</span> <span class="known-word">itwêw</span> test');
    });

    it('should handle case insensitive matching', () => {
      const text = 'HELLO World êKWA';
      const result = textHighlightService.generateHTML(text, knownWords);
      
      expect(result).toBe('<span class="known-word">HELLO</span> <span class="known-word">World</span> <span class="known-word">êKWA</span>');
    });

    it('should handle empty input', () => {
      expect(textHighlightService.generateHTML('', knownWords)).toBe('');
      expect(textHighlightService.generateHTML('test', new Set())).toBe('test');
    });

    it('should preserve punctuation and spacing', () => {
      const text = 'hello, world! êkwa?';
      const result = textHighlightService.generateHTML(text, knownWords);
      
      expect(result).toBe('<span class="known-word">hello</span>, <span class="known-word">world</span>! <span class="known-word">êkwa</span>?');
    });
  });

  describe('findMatches', () => {
    it('should find character indices for known words', () => {
      const text = 'hello world test';
      const matches = textHighlightService.findMatches(text, knownWords);
      
      expect(matches).toEqual([
        { word: 'hello', index: 0, length: 5 },
        { word: 'world', index: 6, length: 5 }
      ]);
    });

    it('should handle Unicode characters with correct indices', () => {
      const text = 'êkwa itwêw test';
      const matches = textHighlightService.findMatches(text, knownWords);
      
      expect(matches).toEqual([
        { word: 'êkwa', index: 0, length: 4 },
        { word: 'itwêw', index: 5, length: 5 }
      ]);
    });

    it('should sort matches by index', () => {
      const text = 'world hello êkwa';
      const matches = textHighlightService.findMatches(text, knownWords);
      
      expect(matches[0].index).toBe(0); // world
      expect(matches[1].index).toBe(6); // hello
      expect(matches[2].index).toBe(12); // êkwa
    });

    it('should handle empty input', () => {
      expect(textHighlightService.findMatches('', knownWords)).toEqual([]);
      expect(textHighlightService.findMatches('test', new Set())).toEqual([]);
    });
  });

  describe('performance', () => {
    it('should handle large word sets efficiently', () => {
      // Create a large set of known words
      const largeWordSet = new Set<string>();
      for (let i = 0; i < 5000; i++) {
        largeWordSet.add(`word${i}`);
      }
      largeWordSet.add('target');

      const text = 'This is a target word in a long sentence with many words';
      
      const startTime = performance.now();
      const result = textHighlightService.generateHTML(text, largeWordSet);
      const endTime = performance.now();
      
      expect(result).toContain('<span class="known-word">target</span>');
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });
  });
}); 