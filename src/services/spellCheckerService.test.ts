import { spellCheckerService } from './spellCheckerService';

// Mock aws-amplify/api
jest.mock('aws-amplify/api', () => ({
  post: jest.fn()
}));

// Get the mocked function
const mockPost = jest.mocked(require('aws-amplify/api').post);

describe('SpellCheckerService', () => {
  beforeEach(() => {
    spellCheckerService.clearCache();
    mockPost.mockClear();
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

    it('should handle hyphenated words', () => {
      const text = 'kâ-kîsikâk and nîso-pîkiskwêwin';
      const tokens = spellCheckerService.tokenize(text);
      expect(tokens).toEqual(['kâ-kîsikâk', 'and', 'nîso-pîkiskwêwin']);
    });
  });

  describe('check', () => {
    it('should return empty arrays for empty input', async () => {
      const result = await spellCheckerService.check([]);
      expect(result).toEqual({ known: [], unknown: [] });
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('should make API call for unknown words with default language code', async () => {
      const mockResponse = {
        'itwêw': ['some', 'data'],
        'hello': [],
        'êkwa': ['analysis']
      };

      const mockRestOperation = {
        response: {
          body: {
            json: () => Promise.resolve(mockResponse)
          }
        }
      };

      mockPost.mockReturnValueOnce(mockRestOperation);

      const result = await spellCheckerService.check(['itwêw', 'hello', 'êkwa']);
      
      expect(mockPost).toHaveBeenCalledTimes(1);
      const callArgs = mockPost.mock.calls[0][0];
      expect(callArgs.apiName).toBe('spellcheck');
      expect(callArgs.path).toBe('/crk/bulk-lookup');
      expect(callArgs.options.body).toEqual(expect.arrayContaining(['itwêw', 'hello', 'êkwa']));
      expect(result.known).toEqual(['itwêw', 'êkwa']);
      expect(result.unknown).toEqual(['hello']);
    });

    it('should make API call with specified language code', async () => {
      const mockResponse = {
        'bonjour': ['some', 'data'],
        'monde': ['analysis']
      };

      const mockRestOperation = {
        response: {
          body: {
            json: () => Promise.resolve(mockResponse)
          }
        }
      };

      mockPost.mockReturnValueOnce(mockRestOperation);

      const result = await spellCheckerService.check(['bonjour', 'monde'], 'fra');
      
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith({
        apiName: 'spellcheck',
        path: '/fra/bulk-lookup',
        options: {
          body: ['bonjour', 'monde']
        }
      });
      expect(result.known).toEqual(['bonjour', 'monde']);
      expect(result.unknown).toEqual([]);
    });

    it('should use cache for subsequent requests', async () => {
      const mockResponse = {
        'itwêw': ['data'],
        'hello': []
      };

      const mockRestOperation = {
        response: {
          body: {
            json: () => Promise.resolve(mockResponse)
          }
        }
      };

      mockPost.mockReturnValueOnce(mockRestOperation);

      // First call - should hit API
      const result1 = await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(result1.known).toEqual(['itwêw']);
      expect(result1.unknown).toEqual(['hello']);

      // Second call with same words - should use cache
      const result2 = await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockPost).toHaveBeenCalledTimes(1); // No additional API call
      expect(result2.known).toEqual(['itwêw']);
      expect(result2.unknown).toEqual(['hello']);
    });

    it('should only request unknown words from API', async () => {
      // First request
      const mockResponse1 = { 'itwêw': ['data'], 'hello': [] };
      const mockRestOperation1 = {
        response: {
          body: {
            json: () => Promise.resolve(mockResponse1)
          }
        }
      };
      mockPost.mockReturnValueOnce(mockRestOperation1);

      await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockPost).toHaveBeenCalledTimes(1);

      // Second request with mix of known and unknown words
      const mockResponse2 = { 'êkwa': ['data'], 'world': [] };
      const mockRestOperation2 = {
        response: {
          body: {
            json: () => Promise.resolve(mockResponse2)
          }
        }
      };
      mockPost.mockReturnValueOnce(mockRestOperation2);

      const result = await spellCheckerService.check(['itwêw', 'hello', 'êkwa', 'world']);
      
      // Should only request the unknown words
      expect(mockPost).toHaveBeenCalledTimes(2);
      const lastCallArgs = mockPost.mock.calls[1][0];
      expect(lastCallArgs.apiName).toBe('spellcheck');
      expect(lastCallArgs.path).toBe('/crk/bulk-lookup');
      expect(lastCallArgs.options.body).toEqual(expect.arrayContaining(['êkwa', 'world']));

      expect(result.known).toEqual(['itwêw', 'êkwa']);
      expect(result.unknown).toEqual(['hello', 'world']);
    });

    it('should handle API errors gracefully', async () => {
      mockPost.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

      await expect(spellCheckerService.check(['itwêw', 'hello'])).resolves.toEqual({ known: [], unknown: ['itwêw', 'hello'] });
    });

    it('should deduplicate identical concurrent requests', async () => {
      const mockResponse = { 'itwêw': ['data'], 'hello': [] };
      const mockRestOperation = {
        response: {
          body: {
            json: () => Promise.resolve(mockResponse)
          }
        }
      };
      mockPost.mockReturnValueOnce(mockRestOperation);

      // Make multiple concurrent requests with same words
      const promises = [
        spellCheckerService.check(['itwêw', 'hello']),
        spellCheckerService.check(['itwêw', 'hello']),
        spellCheckerService.check(['itwêw', 'hello'])
      ];

      const results = await Promise.all(promises);
      
      // Should only make one API call despite multiple concurrent requests
      expect(mockPost).toHaveBeenCalledTimes(1);
      
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
      
      // Mock the API response for the 'hello' word
      const mockResponse = { 'hello': [] };
      const mockRestOperation = {
        response: {
          body: {
            json: () => Promise.resolve(mockResponse)
          }
        }
      };
      mockPost.mockReturnValueOnce(mockRestOperation);
      
      // These words should now be cached as known
      const result = await spellCheckerService.check(['itwêw', 'êkwa', 'hello']);
      
      // Should only request 'hello' from API
      expect(mockPost).toHaveBeenCalledWith({
        apiName: 'spellcheck',
        path: '/crk/bulk-lookup',
        options: {
          body: ['hello']
        }
      });
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
