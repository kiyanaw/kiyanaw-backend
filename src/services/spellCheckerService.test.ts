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
      expect(result).toEqual({ known: [], unknown: [], suggestions: [] });
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
      expect(callArgs.path).toBe('/bulk-lookup');
      expect(callArgs.options.body).toEqual({
        languageCode: 'crk',
        words: expect.arrayContaining(['itwêw', 'hello', 'êkwa'])
      });
      expect(result.known).toEqual(expect.arrayContaining([
        expect.objectContaining({ word: 'itwêw' }),
        expect.objectContaining({ word: 'êkwa' })
      ]));
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
        path: '/bulk-lookup',
        options: {
          body: {
            languageCode: 'fra',
            words: ['bonjour', 'monde']
          }
        }
      });
      expect(result.known).toEqual(expect.arrayContaining([
        expect.objectContaining({ word: 'bonjour' }),
        expect.objectContaining({ word: 'monde' })
      ]));
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
      expect(result1.known).toEqual(expect.arrayContaining([
        expect.objectContaining({ word: 'itwêw' })
      ]));
      expect(result1.unknown).toEqual(['hello']);

      // Second call with same words - should use cache
      const result2 = await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockPost).toHaveBeenCalledTimes(1); // No additional API call
      expect(result2.known).toEqual(expect.arrayContaining([
        expect.objectContaining({ word: 'itwêw' })
      ]));
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
      expect(lastCallArgs.path).toBe('/bulk-lookup');
      expect(lastCallArgs.options.body).toEqual({
        languageCode: 'crk',
        words: expect.arrayContaining(['êkwa', 'world'])
      });

      expect(result.known).toEqual(expect.arrayContaining([
        expect.objectContaining({ word: 'itwêw', analysis: '', allAnalysis: [] }), // From cache - no analysis
        expect.objectContaining({ word: 'êkwa', analysis: 'data', allAnalysis: ['data'] }) // Fresh from API
      ]));
      expect(result.unknown).toEqual(['hello', 'world']);
    });

    it('should handle API errors gracefully', async () => {
      mockPost.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

      await expect(spellCheckerService.check(['itwêw', 'hello'])).resolves.toEqual({ known: [], unknown: ['itwêw', 'hello'], suggestions: [] });
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
        expect(result.known).toEqual(expect.arrayContaining([
          expect.objectContaining({ word: 'itwêw', analysis: 'data', allAnalysis: ['data'] })
        ]));
        expect(result.unknown).toEqual(['hello']);
      });
    });
  });

  describe('addKnownWords', () => {
    it('should add words to known cache', async () => {
      spellCheckerService.addKnownWords([
        { word: 'itwêw', analysis: 'itwêw+V+AI+Ind+3Sg', allAnalysis: ['itwêw+V+AI+Ind+3Sg'] },
        { word: 'êkwa', analysis: 'êkwa+Ipc', allAnalysis: ['êkwa+Ipc'] }
      ]);
      
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
        path: '/bulk-lookup',
        options: {
          body: {
            languageCode: 'crk',
            words: ['hello']
          }
        }
      });
    });
  });

  describe('getKnownWords', () => {
    it('should return current known words', () => {
      spellCheckerService.addKnownWords([
        { word: 'itwêw', analysis: 'itwêw+V+AI+Ind+3Sg', allAnalysis: ['itwêw+V+AI+Ind+3Sg'] },
        { word: 'êkwa', analysis: 'êkwa+Ipc', allAnalysis: ['êkwa+Ipc'] }
      ]);
      const knownWords = spellCheckerService.getKnownWords();
      expect(knownWords).toContain('itwêw');
      expect(knownWords).toContain('êkwa');
    });
  });

  describe('analyzeRegionText', () => {
    let globalKnownWords: Map<string, any>;

    beforeEach(() => {
      // Create a global known words map
      globalKnownWords = new Map();
      globalKnownWords.set('isi', { 
        word: 'isi', 
        analysis: 'isi+Ipc', 
        allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'] 
      });
      globalKnownWords.set('foo', { 
        word: 'foo', 
        analysis: 'foo+N', 
        allAnalysis: ['foo+N'] 
      });
    });

    it('should create one WordAnalysis entry per word occurrence', async () => {
      const regionText = 'foo isi and another isi';
      const existingAnalysis: any[] = [];

      const result = await spellCheckerService.analyzeRegionText(regionText, 'crk', globalKnownWords, existingAnalysis);

      // Should have 3 entries for known words: foo, isi, isi
      // ('and' and 'another' are not in globalKnownWords)
      expect(result.analysis).toHaveLength(3);
      
      // Check that we have two separate 'isi' entries with different indices
      const isiEntries = result.analysis.filter(item => item.word === 'isi');
      expect(isiEntries).toHaveLength(2);
      expect(isiEntries[0].index).toBe(1); // First 'isi' is at word index 1
      expect(isiEntries[1].index).toBe(4); // Second 'isi' is at word index 4
    });

    it('should set source to "auto" for new words from global cache', async () => {
      const regionText = 'isi foo';
      const existingAnalysis: any[] = [];

      const result = await spellCheckerService.analyzeRegionText(regionText, 'crk', globalKnownWords, existingAnalysis);

      expect(result.analysis).toHaveLength(2);
      expect(result.analysis[0]).toMatchObject({
        word: 'isi',
        source: 'auto',
        index: 0
      });
      expect(result.analysis[1]).toMatchObject({
        word: 'foo',
        source: 'auto',
        index: 1
      });
    });

    it('should preserve source "user" from existing analysis', async () => {
      const regionText = 'isi foo isi';
      const existingAnalysis = [
        { word: 'isi', analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'user' as const, index: 0 },
        { word: 'foo', analysis: 'foo+N', allAnalysis: ['foo+N'], source: 'auto' as const, index: 1 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'auto' as const, index: 2 }
      ];

      const result = await spellCheckerService.analyzeRegionText(regionText, 'crk', globalKnownWords, existingAnalysis);

      expect(result.analysis).toHaveLength(3);
      
      // First 'isi' should preserve 'user' source
      expect(result.analysis[0]).toMatchObject({
        word: 'isi',
        source: 'user',
        analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO',
        index: 0
      });
      
      // Second 'foo' should preserve 'auto' source
      expect(result.analysis[1]).toMatchObject({
        word: 'foo',
        source: 'auto',
        index: 1
      });
      
      // Third 'isi' should preserve 'auto' source
      expect(result.analysis[2]).toMatchObject({
        word: 'isi',
        source: 'auto',
        index: 2
      });
    });

    it('should handle duplicate words with different user selections', async () => {
      const regionText = 'isi isi isi';
      const existingAnalysis = [
        { word: 'isi', analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'user' as const, index: 0 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'auto' as const, index: 1 },
        { word: 'isi', analysis: 'isi+Ipc', allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'], source: 'user' as const, index: 2 }
      ];

      const result = await spellCheckerService.analyzeRegionText(regionText, 'crk', globalKnownWords, existingAnalysis);

      expect(result.analysis).toHaveLength(3);
      
      // First 'isi' - user selected first analysis
      expect(result.analysis[0]).toMatchObject({
        word: 'isi',
        source: 'user',
        analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO',
        index: 0
      });
      
      // Second 'isi' - auto selected
      expect(result.analysis[1]).toMatchObject({
        word: 'isi',
        source: 'auto',
        analysis: 'isi+Ipc',
        index: 1
      });
      
      // Third 'isi' - user selected second analysis
      expect(result.analysis[2]).toMatchObject({
        word: 'isi',
        source: 'user',
        analysis: 'isi+Ipc',
        index: 2
      });
    });

    it('should not carry over source from one region to another', async () => {
      // Create a global cache with a user-selected word
      const globalWithUserSelection = new Map(globalKnownWords);
      globalWithUserSelection.set('test', {
        word: 'test',
        analysis: 'test+N',
        allAnalysis: ['test+N', 'test+V'],
        source: 'user'
      });

      const regionText = 'test';
      const existingAnalysis: any[] = [];

      const result = await spellCheckerService.analyzeRegionText(regionText, 'crk', globalWithUserSelection, existingAnalysis);

      expect(result.analysis).toHaveLength(1);
      // Should be 'auto' in new region, not 'user'
      expect(result.analysis[0]).toMatchObject({
        word: 'test',
        source: 'auto',
        index: 0
      });
    });
  });
}); 
