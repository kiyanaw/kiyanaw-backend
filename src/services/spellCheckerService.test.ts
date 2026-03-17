import { spellCheckerService } from './spellCheckerService';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

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
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should make API call for unknown words with default language code', async () => {
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
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/spellcheck/bulk-lookup');
      const body = JSON.parse(options.body);
      expect(body.languageCode).toBe('crk');
      expect(body.words).toEqual(expect.arrayContaining(['itwêw', 'hello', 'êkwa']));
      expect(options.headers['x-api-key']).toBeDefined();
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await spellCheckerService.check(['bonjour', 'monde'], 'fra');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.languageCode).toBe('fra');
      expect(body.words).toEqual(['bonjour', 'monde']);
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call - should hit API
      const result1 = await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1.known).toEqual(expect.arrayContaining([
        expect.objectContaining({ word: 'itwêw' })
      ]));
      expect(result1.unknown).toEqual(['hello']);

      // Second call with same words - should use cache
      const result2 = await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
      expect(result2.known).toEqual(expect.arrayContaining([
        expect.objectContaining({ word: 'itwêw' })
      ]));
      expect(result2.unknown).toEqual(['hello']);
    });

    it('should only request unknown words from API', async () => {
      // First request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'itwêw': ['data'], 'hello': [] })
      });

      await spellCheckerService.check(['itwêw', 'hello']);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request with mix of known and unknown words
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'êkwa': ['data'], 'world': [] })
      });

      const result = await spellCheckerService.check(['itwêw', 'hello', 'êkwa', 'world']);

      // Should only request the unknown words
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [, options] = mockFetch.mock.calls[1];
      const body = JSON.parse(options.body);
      expect(body.words).toEqual(expect.arrayContaining(['êkwa', 'world']));

      expect(result.known).toEqual(expect.arrayContaining([
        expect.objectContaining({ word: 'itwêw', analysis: 'data', allAnalysis: ['data'] }),
        expect.objectContaining({ word: 'êkwa', analysis: 'data', allAnalysis: ['data'] })
      ]));
      expect(result.unknown).toEqual(['hello', 'world']);
    });

    it('should preserve full analysis data in cache for subsequent requests', async () => {
      const mockResponse = {
        'ôma': ['ôma+Ipc', 'ôma+Pron+Dem+Prox+I+Sg'],
        'pitamâ': ['pitamâ+Ipc']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call - should hit API
      const result1 = await spellCheckerService.check(['ôma', 'pitamâ']);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1.known).toEqual([
        { word: 'ôma', analysis: 'ôma+Ipc', allAnalysis: ['ôma+Ipc', 'ôma+Pron+Dem+Prox+I+Sg'] },
        { word: 'pitamâ', analysis: 'pitamâ+Ipc', allAnalysis: ['pitamâ+Ipc'] }
      ]);

      // Second call with same words - should use cache and PRESERVE full analysis
      const result2 = await spellCheckerService.check(['ôma', 'pitamâ']);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call

      expect(result2.known).toEqual([
        { word: 'ôma', analysis: 'ôma+Ipc', allAnalysis: ['ôma+Ipc', 'ôma+Pron+Dem+Prox+I+Sg'] },
        { word: 'pitamâ', analysis: 'pitamâ+Ipc', allAnalysis: ['pitamâ+Ipc'] }
      ]);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(spellCheckerService.check(['itwêw', 'hello'])).resolves.toEqual({ known: [], unknown: ['itwêw', 'hello'], suggestions: [] });
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'hello': [] })
      });

      // These words should now be cached as known
      const result = await spellCheckerService.check(['itwêw', 'êkwa', 'hello']);

      // Should only request 'hello' from API
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.words).toEqual(['hello']);
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

      expect(result.analysis[0]).toMatchObject({
        word: 'isi',
        source: 'user',
        analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO',
        index: 0
      });

      expect(result.analysis[1]).toMatchObject({
        word: 'foo',
        source: 'auto',
        index: 1
      });

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

      expect(result.analysis[0]).toMatchObject({
        word: 'isi',
        source: 'user',
        analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO',
        index: 0
      });

      expect(result.analysis[1]).toMatchObject({
        word: 'isi',
        source: 'auto',
        analysis: 'isi+Ipc',
        index: 1
      });

      expect(result.analysis[2]).toMatchObject({
        word: 'isi',
        source: 'user',
        analysis: 'isi+Ipc',
        index: 2
      });
    });

    it('should not carry over source from one region to another', async () => {
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
      expect(result.analysis[0]).toMatchObject({
        word: 'test',
        source: 'auto',
        index: 0
      });
    });
  });
});
