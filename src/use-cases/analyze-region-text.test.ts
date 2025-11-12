// Mock the services before importing
jest.mock('../services/rteService', () => ({
  rteService: {
    applyKnownWordsFormatting: jest.fn(),
    applyHighlighting: jest.fn(),
    hasEditor: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('../services/spellCheckerService', () => ({
  spellCheckerService: {
    tokenize: jest.fn(),
    check: jest.fn(),
    addKnownWords: jest.fn(),
    getKnownWords: jest.fn()
  }
}));

import { AnalyzeRegionTextUseCase } from './analyze-region-text';
import { spellCheckerService } from '../services/spellCheckerService';
import { rteService } from '../services/rteService';

// Mock dependencies - use the mocked services
const mockSpellCheckerService = spellCheckerService as jest.Mocked<typeof spellCheckerService>;
const mockRteServiceImport = rteService as jest.Mocked<typeof rteService>;

const mockStateActions = {
  addKnownWords: jest.fn(),
  setRegionAnalysis: jest.fn()
};

const mockStore = {
  knownWords: new Set<string>(['existing', 'word', 'hello', 'êkwa', 'itwêw']),
  transcription: { lang: 'crk' }, // Add transcription with language for spell checking
  setRegionAnalysis: jest.fn(),
  addKnownWords: jest.fn(),
  getIssuesForRegion: jest.fn().mockReturnValue([]),
  regionById: jest.fn().mockReturnValue({ regionAnalysis: [] }),
  getState: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn()
};

const mockServices = {
  spellCheckerService: mockSpellCheckerService,
  rteService: mockRteServiceImport,
  regionService: {
    updateRegion: jest.fn()
  },
  userService: {
    currentUser: jest.fn().mockReturnValue({ username: 'testuser' })
  }
} as any;

describe('AnalyzeRegionTextUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockSpellCheckerService.tokenize.mockReturnValue(['hello', 'world', 'êkwa']);
    mockSpellCheckerService.check.mockResolvedValue({
      known: [], // no newly discovered words from API
      unknown: ['world'] // world is unknown
    });
    mockSpellCheckerService.getKnownWords.mockReturnValue(['hello', 'êkwa', 'itwêw']);
    
    mockStore.getState.mockReturnValue({
      knownWords: new Set(['hello', 'êkwa', 'itwêw']),
      ...mockStateActions
    });
  });

  describe('execute', () => {
    it('should analyze text and update store with known words', async () => {
      jest.useFakeTimers();
      
      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello world êkwa',
        services: mockServices,
        store: mockStore
      });

      const promise = useCase.execute();
      
      // Fast forward the debounce timer
      jest.advanceTimersByTime(2000);
      
      await promise;

      // Should tokenize the text
      expect(mockSpellCheckerService.tokenize).toHaveBeenCalledWith('hello world êkwa');
      
      // Should check tokens for known words with language code
      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['world'], 'crk'); // only unknown words with language
      
      // Should not call addKnownWords since no new words were discovered
      expect(mockStore.addKnownWords).not.toHaveBeenCalled();
      
      // Should set region analysis (with all known words including cached ones)
      expect(mockStore.setRegionAnalysis).toHaveBeenCalledWith('region-1', [
        { word: 'hello', analysis: '', allAnalysis: [] },
        { word: 'êkwa', analysis: '', allAnalysis: [] }
      ]);
      
      jest.useRealTimers();
    });

    it('should handle empty text gracefully', async () => {
      jest.useFakeTimers();
      mockSpellCheckerService.tokenize.mockReturnValue([]);
      
      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: '',
        services: mockServices,
        store: mockStore
      });

      const promise = useCase.execute();
      jest.advanceTimersByTime(2000);
      await promise;

      expect(mockSpellCheckerService.tokenize).toHaveBeenCalledWith('');
      expect(mockSpellCheckerService.check).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should handle whitespace-only text', async () => {
      jest.useFakeTimers();
      mockSpellCheckerService.tokenize.mockReturnValue([]);
      
      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: '   \n\t  ',
        services: mockServices,
        store: mockStore
      });

      const promise = useCase.execute();
      jest.advanceTimersByTime(2000);
      await promise;

      expect(mockSpellCheckerService.tokenize).toHaveBeenCalledWith('   \n\t  ');
      expect(mockSpellCheckerService.check).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should handle Unicode characters correctly', async () => {
      jest.useFakeTimers();
      mockSpellCheckerService.tokenize.mockReturnValue(['itwêw', 'êkwa', 'tâpwê']);
      mockSpellCheckerService.check.mockResolvedValue({
        known: [{ word: 'tâpwê', analysis: '', allAnalysis: [] }],
        unknown: []
      });
      
      // Mock state with some known words
      mockStore.getState.mockReturnValue({
        knownWords: new Set(['itwêw', 'êkwa']),
        ...mockStateActions
      });

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'itwêw êkwa tâpwê',
        services: mockServices,
        store: mockStore
      });

      const promise = useCase.execute();
      jest.advanceTimersByTime(2000);
      await promise;

      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['tâpwê'], 'crk'); // only unknown word with language
      expect(mockStore.addKnownWords).toHaveBeenCalledWith([{ word: 'tâpwê', analysis: '', allAnalysis: [] }]);
      expect(mockStore.setRegionAnalysis).toHaveBeenCalledWith('region-1', [
        { word: 'itwêw', analysis: '', allAnalysis: [] },
        { word: 'êkwa', analysis: '', allAnalysis: [] },
        { word: 'tâpwê', analysis: '', allAnalysis: [] }
      ]);
      
      jest.useRealTimers();
    });

    it('should handle spell checker errors gracefully', async () => {
      jest.useFakeTimers();
      mockSpellCheckerService.check.mockRejectedValue(new Error('API Error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello world',
        services: mockServices,
        store: mockStore
      });

      const promise = useCase.execute();
      jest.advanceTimersByTime(2000);
      await promise;

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error checking unknown words:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
      jest.useRealTimers();
    });

    it('should debounce multiple calls for the same region', async () => {
      jest.useFakeTimers();
      
      const useCase1 = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello',
        services: mockServices,
        store: mockStore
      });

      const useCase2 = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello world',
        services: mockServices,
        store: mockStore
      });

      // Execute both quickly
      const promise1 = useCase1.execute();
      const promise2 = useCase2.execute();

      // Fast forward debounce
      jest.advanceTimersByTime(2000);
      
      await Promise.all([promise1, promise2]);

      // Should only analyze once (the latest)
      expect(mockSpellCheckerService.tokenize).toHaveBeenCalledTimes(1);
      expect(mockSpellCheckerService.tokenize).toHaveBeenCalledWith('hello world');
      
      jest.useRealTimers();
    });

    it('should handle multiple regions independently', async () => {
      jest.useFakeTimers();
      
      const useCase1 = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello',
        services: mockServices,
        store: mockStore
      });

      const useCase2 = new AnalyzeRegionTextUseCase({
        regionId: 'region-2',
        text: 'world',
        services: mockServices,
        store: mockStore
      });

      const promise1 = useCase1.execute();
      const promise2 = useCase2.execute();
      
      jest.advanceTimersByTime(2000);
      
      await Promise.all([promise1, promise2]);

      // Should analyze both regions
      expect(mockSpellCheckerService.tokenize).toHaveBeenCalledTimes(2);
      expect(mockStore.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.any(Array));
      expect(mockStore.setRegionAnalysis).toHaveBeenCalledWith('region-2', expect.any(Array));
      
      jest.useRealTimers();
    });

    it('should skip spell checking when transcription has no language', async () => {
      // Create a store without language
      const storeWithoutLang = {
        ...mockStore,
        transcription: null // No transcription means no language
      };

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello world êkwa',
        services: mockServices,
        store: storeWithoutLang
      });

      jest.useFakeTimers();
      const promise = useCase.execute();
      jest.advanceTimersByTime(500);
      await promise;

      // Should not call spell checker, only set empty analysis
      expect(mockSpellCheckerService.tokenize).not.toHaveBeenCalled();
      expect(mockSpellCheckerService.check).not.toHaveBeenCalled();
      expect(storeWithoutLang.setRegionAnalysis).toHaveBeenCalledWith('region-1', []);
      
      jest.useRealTimers();
    });

    it('should use different language code when transcription language is set to crgn', async () => {
      // Create a store with Northern Michif language and fresh known words cache
      const storeWithCrgn = {
        ...mockStore,
        transcription: { lang: 'crgn' }, // Northern Michif
        knownWords: new Set<string>(['hello']) // Only hello is known, so other words will be checked
      };

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello kinwês omâmâ', // Use Northern Michif words not in cache
        services: mockServices,
        store: storeWithCrgn
      });

      // Mock spell checker to return some words as known for Northern Michif
      mockSpellCheckerService.tokenize.mockReturnValue(['hello', 'kinwês', 'omâmâ']);
      mockSpellCheckerService.check.mockResolvedValue({
        known: [{ word: 'kinwês', analysis: '', allAnalysis: [] }],
        unknown: ['omâmâ'] // Different result for Northern Michif
      });

      jest.useFakeTimers();
      const promise = useCase.execute();
      jest.advanceTimersByTime(500);
      await promise;

      // Should use 'crgn' language code instead of default 'crk'
      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['kinwês', 'omâmâ'], 'crgn');
      expect(storeWithCrgn.addKnownWords).toHaveBeenCalledWith([{ word: 'kinwês', analysis: '', allAnalysis: [] }]);
      expect(storeWithCrgn.setRegionAnalysis).toHaveBeenCalledWith('region-1', [
        { word: 'hello', analysis: '', allAnalysis: [] },
        { word: 'kinwês', analysis: '', allAnalysis: [] }
      ]);
      
      jest.useRealTimers();
    });

    it('should skip spell checking when transcription language is empty', async () => {
      // Create a store with empty language
      const storeWithEmptyLang = {
        ...mockStore,
        transcription: { lang: null }
      };

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello world êkwa',
        services: mockServices,
        store: storeWithEmptyLang
      });

      jest.useFakeTimers();
      const promise = useCase.execute();
      jest.advanceTimersByTime(500);
      await promise;

      // Should not call spell checker, only set empty analysis
      expect(mockSpellCheckerService.tokenize).not.toHaveBeenCalled();
      expect(mockSpellCheckerService.check).not.toHaveBeenCalled();
      expect(storeWithEmptyLang.setRegionAnalysis).toHaveBeenCalledWith('region-1', []);
      
      jest.useRealTimers();
    });
  });

  describe('RTE formatting integration', () => {
    it('should apply RTE formatting when spell checker discovers new known words', async () => {
      jest.useFakeTimers();
      
      // Mock a store with some existing known words but missing the new word
      const storeWithPartialWords = {
        ...mockStore,
        transcription: { lang: 'crk' },
        knownWords: new Set(['hello', 'world']), // Missing 'tânisi'
        setRegionAnalysis: jest.fn(),
        addKnownWords: jest.fn()
      };

      // Mock spell checker to return the new word as known
      mockSpellCheckerService.tokenize.mockReturnValue(['hello', 'world', 'tânisi']);
      mockSpellCheckerService.check.mockResolvedValue({
        known: [{ word: 'tânisi', analysis: '', allAnalysis: [] }], // New word discovered as known
        unknown: []
      });

      // Reset RTE service mocks for this test
      mockRteServiceImport.hasEditor.mockReturnValue(true);
      mockRteServiceImport.applyKnownWordsFormatting.mockClear();

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello world tânisi',
        services: mockServices,
        store: storeWithPartialWords
      });

      const promise = useCase.execute();
      jest.runAllTimers();
      await promise;

      // Verify spell checking was performed
      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['tânisi'], 'crk');
      
      // Verify store was updated with all known words
      expect(storeWithPartialWords.addKnownWords).toHaveBeenCalledWith([{ word: 'tânisi', analysis: '', allAnalysis: [] }]);
      expect(storeWithPartialWords.setRegionAnalysis).toHaveBeenCalledWith('region-1', [
        { word: 'hello', analysis: '', allAnalysis: [] },
        { word: 'world', analysis: '', allAnalysis: [] },
        { word: 'tânisi', analysis: '', allAnalysis: [] }
      ]);
      
      // CRITICAL: Verify RTE formatting was applied with ALL known words (including newly discovered)
      expect(mockRteServiceImport.hasEditor).toHaveBeenCalledWith('region-1:main');
      expect(mockRteServiceImport.applyHighlighting).toHaveBeenCalledWith(
        'region-1:main', 
        {
          knownWords: ['hello', 'world', 'tânisi'],
          issues: []
        }
      );
      
      jest.useRealTimers();
    });

    it('should not apply RTE formatting when no RTE editor exists', async () => {
      jest.useFakeTimers();
      
      const storeWithWords = {
        ...mockStore,
        transcription: { lang: 'crk' },
        knownWords: new Set(['hello']),
        setRegionAnalysis: jest.fn(),
        addKnownWords: jest.fn()
      };

      mockSpellCheckerService.tokenize.mockReturnValue(['hello', 'world']);
      mockSpellCheckerService.check.mockResolvedValue({
        known: [{ word: 'world', analysis: '', allAnalysis: [] }],
        unknown: []
      });

      // Mock RTE service to indicate no editor exists
      mockRteServiceImport.hasEditor.mockReturnValue(false);
      mockRteServiceImport.applyKnownWordsFormatting.mockClear();

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello world',
        services: mockServices,
        store: storeWithWords
      });

      const promise = useCase.execute();
      jest.runAllTimers();
      await promise;

      // Verify RTE check was performed but formatting was not applied
      expect(mockRteServiceImport.hasEditor).toHaveBeenCalledWith('region-1:main');
      expect(mockRteServiceImport.applyKnownWordsFormatting).not.toHaveBeenCalled();
      
      // But store should still be updated
      expect(storeWithWords.setRegionAnalysis).toHaveBeenCalledWith('region-1', [
        { word: 'hello', analysis: '', allAnalysis: [] },
        { word: 'world', analysis: '', allAnalysis: [] }
      ]);
      
      jest.useRealTimers();
    });

    it('should apply RTE formatting with cached words when no API call needed', async () => {
      jest.useFakeTimers();
      
      // Mock store where all words are already known
      const storeWithAllWords = {
        ...mockStore,
        transcription: { lang: 'crk' },
        knownWords: new Set(['hello', 'world', 'tânisi']),
        setRegionAnalysis: jest.fn(),
        addKnownWords: jest.fn()
      };

      mockSpellCheckerService.tokenize.mockReturnValue(['hello', 'world', 'tânisi']);
      // No API call should be made since all words are cached

      mockRteServiceImport.hasEditor.mockReturnValue(true);
      mockRteServiceImport.applyKnownWordsFormatting.mockClear();

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello world tânisi',
        services: mockServices,
        store: storeWithAllWords
      });

      const promise = useCase.execute();
      jest.runAllTimers();
      await promise;

      // Verify no API call was made
      expect(mockSpellCheckerService.check).not.toHaveBeenCalled();
      
      // But RTE formatting should still be applied with cached words
      expect(mockRteServiceImport.applyHighlighting).toHaveBeenCalledWith(
        'region-1:main', 
        {
          knownWords: ['hello', 'world', 'tânisi'],
          issues: []
        }
      );
      
      expect(storeWithAllWords.setRegionAnalysis).toHaveBeenCalledWith('region-1', [
        { word: 'hello', analysis: '', allAnalysis: [] },
        { word: 'world', analysis: '', allAnalysis: [] },
        { word: 'tânisi', analysis: '', allAnalysis: [] }
      ]);
      
      jest.useRealTimers();
    });
  });

  describe('validation', () => {
    it('should throw error for missing regionId', () => {
      const useCase = new AnalyzeRegionTextUseCase({
        regionId: '',
        text: 'hello',
        services: mockServices,
        store: mockStore
      });

      expect(() => useCase.validate()).toThrow('regionId is required');
    });

    it('should throw error for non-string text', () => {
      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: null as any,
        services: mockServices,
        store: mockStore
      });

      expect(() => useCase.validate()).toThrow('text must be a string');
    });
  });
});