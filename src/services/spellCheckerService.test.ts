import { spellCheckerService } from './spellCheckerService';

// Mock fetch for testing
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

describe('SpellCheckerService', () => {
  beforeEach(() => {
    spellCheckerService.clearCache();
    mockFetch.mockClear();
  });

  describe('tokenize', () => {
    it('should split text into words and remove punctuation', () => {
      const text = 'Hello, world! How are you?';
      const tokens = spellCheckerService.tokenize(text);
      expect(tokens).toEqual(['hello', 'world', 'how', 'are', 'you']);
    });

    it('should handle special characters in Cree text', () => {
      const text = 'itwêw and êkwa, also tâpwê!';
      const tokens = spellCheckerService.tokenize(text);
      expect(tokens).toEqual(['itwêw', 'and', 'êkwa', 'also', 'tâpwê']);
    });

    it('should return empty array for empty text', () => {
      expect(spellCheckerService.tokenize('')).toEqual([]);
      expect(spellCheckerService.tokenize('   ')).toEqual([]);
    });
  });

  describe('check', () => {
    it('should return empty arrays for empty input', async () => {
      const result = await spellCheckerService.check([]);
      expect(result).toEqual({ known: [], unknown: [] });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should make API call for unknown words', async () => {
      const mockResponse = {
        'itwêw': ['some', 'data'],
        'hello': [],
        'êkwa': ['analysis']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await spellCheckerService.check(['itwêw', 'hello', 'êkwa']);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://icagc4x2ok.execute-api.us-east-1.amazonaws.com/bulk-lookup',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json;charset=utf-8' },
          body: expect.stringContaining('itwêw') && expect.stringContaining('hello') && expect.stringContaining('êkwa')
        })
      );

      expect(result.known).toEqual(['itwêw', 'êkwa']);
      expect(result.unknown).toEqual(['hello']);
    });

    it('should use cache for subsequent requests', async () => {
      const mockResponse = {
        'itwêw': ['data'],
        'hello': []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call - should hit API
      const result1 = await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1.known).toEqual(['itwêw']);
      expect(result1.unknown).toEqual(['hello']);

      // Second call with same words - should use cache
      const result2 = await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
      expect(result2.known).toEqual(['itwêw']);
      expect(result2.unknown).toEqual(['hello']);
    });

    it('should only request unknown words from API', async () => {
      // First request
      const mockResponse1 = { 'itwêw': ['data'], 'hello': [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse1)
      });

      await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request with mix of known and unknown words
      const mockResponse2 = { 'êkwa': ['data'], 'world': [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse2)
      });

      const result = await spellCheckerService.check(['itwêw', 'hello', 'êkwa', 'world']);
      
      // Should only request the unknown words
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('êkwa') && expect.stringContaining('world')
        })
      );

      expect(result.known).toEqual(['itwêw', 'êkwa']);
      expect(result.unknown).toEqual(['hello', 'world']);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await spellCheckerService.check(['itwêw', 'hello']);
      
      // On error, should treat all words as unknown
      expect(result.known).toEqual([]);
      expect(result.unknown).toEqual(['itwêw', 'hello']);
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await spellCheckerService.check(['itwêw', 'hello']);
      
      // On error, should treat all words as unknown
      expect(result.known).toEqual([]);
      expect(result.unknown).toEqual(['itwêw', 'hello']);
    });

    it('should deduplicate identical concurrent requests', async () => {
      const mockResponse = { 'itwêw': ['data'], 'hello': [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Make multiple concurrent requests with same words
      const promises = [
        spellCheckerService.check(['itwêw', 'hello']),
        spellCheckerService.check(['itwêw', 'hello']),
        spellCheckerService.check(['itwêw', 'hello'])
      ];

      const results = await Promise.all(promises);
      
      // Should only make one API call despite multiple concurrent requests
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // All results should be identical
      results.forEach(result => {
        expect(result.known).toEqual(['itwêw']);
        expect(result.unknown).toEqual(['hello']);
      });
    });
  });

  describe('addKnownWords', () => {
    it('should add words to known cache', async () => {
      spellCheckerService.addKnownWords(['itwêw', 'êkwa']);
      
      // These words should now be cached as known
      const result = await spellCheckerService.check(['itwêw', 'êkwa', 'hello']);
      
      // Should only request 'hello' from API
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('hello')
        })
      );
    });
  });

  describe('getKnownWords', () => {
    it('should return current known words', () => {
      spellCheckerService.addKnownWords(['itwêw', 'êkwa']);
      const knownWords = spellCheckerService.getKnownWords();
      expect(knownWords).toContain('itwêw');
      expect(knownWords).toContain('êkwa');
    });
  });
}); 