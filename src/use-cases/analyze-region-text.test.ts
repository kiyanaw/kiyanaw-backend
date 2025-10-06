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

jest.mock('./update-region', () => ({
  UpdateRegionUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn()
  }))
}));

import { AnalyzeRegionTextUseCase } from './analyze-region-text';
import { UpdateRegionUseCase } from './update-region';
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
  regionById: jest.fn().mockReturnValue({
    id: 'region-1',
    regionAnalysis: [],
    transcriptionId: 'transcription-1'
  }),
  getRegionVersion: jest.fn().mockReturnValue(1),
  setRegionVersion: jest.fn(),
  isPendingEdit: jest.fn().mockReturnValue(false),
  startPendingEdit: jest.fn(),
  endPendingEdit: jest.fn(),
  updatePendingEditActivity: jest.fn(),
  setSaveStatus: jest.fn(),
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
  authService: {
    currentUser: jest.fn().mockReturnValue({ username: 'testuser' })
  },
  userService: {
    currentUser: jest.fn().mockReturnValue({ username: 'testuser' })
  },
  storeService: mockStore
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
      expect(mockStore.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.arrayContaining([
        expect.objectContaining({ word: 'hello' }),
        expect.objectContaining({ word: 'êkwa' })
      ]));
      
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
        known: [{ word: 'tâpwê', analysis: 'tâpwê+IPC', allAnalysis: ['tâpwê+IPC'] }],
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

      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['itwêw', 'êkwa', 'tâpwê'], 'crk', false); // all words checked
      expect(mockStore.addKnownWords).toHaveBeenCalledWith([{ word: 'tâpwê', analysis: 'tâpwê+IPC', allAnalysis: ['tâpwê+IPC'] }]);
      expect(mockStore.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.arrayContaining([
        expect.objectContaining({ word: 'itwêw' }),
        expect.objectContaining({ word: 'êkwa' }),
        expect.objectContaining({ word: 'tâpwê' })
      ]));
      
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
        known: [{ word: 'kinwês', analysis: 'kinwês+N+A', allAnalysis: ['kinwês+N+A'] }],
        unknown: ['omâmâ'] // Different result for Northern Michif
      });

      jest.useFakeTimers();
      const promise = useCase.execute();
      jest.advanceTimersByTime(500);
      await promise;

      // Should use 'crgn' language code instead of default 'crk' (all words passed)
      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['hello', 'kinwês', 'omâmâ'], 'crgn', false);
      expect(storeWithCrgn.addKnownWords).toHaveBeenCalledWith([{ word: 'kinwês', analysis: 'kinwês+N+A', allAnalysis: ['kinwês+N+A'] }]);
      expect(storeWithCrgn.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.arrayContaining([
        expect.objectContaining({ word: 'hello' }),
        expect.objectContaining({ word: 'kinwês' })
      ]));
      
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

    it('should handle legacy string[] regionAnalysis and upgrade it to new format', async () => {
      jest.useFakeTimers();
      
      // Mock a region with legacy string[] analysis
      const storeWithLegacyData = {
        ...mockStore,
        transcription: { lang: 'crk' },
        knownWords: new Set(['hello']), // Some words known globally
        regionById: jest.fn().mockReturnValue({
          id: 'region-1',
          regionAnalysis: ['hello', 'tânisi'], // LEGACY FORMAT - string array
          transcriptionId: 'transcription-1'
        }),
        setRegionAnalysis: jest.fn(),
        addKnownWords: jest.fn()
      };

      // Mock spell checker to return detailed analysis for the unknown word
      mockSpellCheckerService.tokenize.mockReturnValue(['hello', 'tânisi']);
      mockSpellCheckerService.check.mockResolvedValue({
        known: [{ word: 'tânisi', analysis: 'tânisi+IPC', allAnalysis: ['tânisi+IPC'] }],
        unknown: []
      });

      const useCase = new AnalyzeRegionTextUseCase({
        regionId: 'region-1',
        text: 'hello tânisi',
        services: mockServices,
        store: storeWithLegacyData
      });

      const promise = useCase.execute();
      jest.advanceTimersByTime(500);
      await promise;

      // Should call spell checker with forceAnalysis=true for legacy upgrade (ALL words checked)
      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['hello', 'tânisi'], 'crk', true);
      
      // Should update store with new WordAnalysis format
      expect(storeWithLegacyData.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.arrayContaining([
        expect.objectContaining({ word: 'hello' }), // Both words get fresh analysis
        expect.objectContaining({ word: 'tânisi', analysis: 'tânisi+IPC', allAnalysis: ['tânisi+IPC'] })
      ]));

      // Should add new known words to global cache
      expect(storeWithLegacyData.addKnownWords).toHaveBeenCalledWith([{ word: 'tânisi', analysis: 'tânisi+IPC', allAnalysis: ['tânisi+IPC'] }]);
      
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
          known: [{ word: 'tânisi', analysis: 'tânisi+IPC', allAnalysis: ['tânisi+IPC'] }], // New word discovered as known
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

      // Verify spell checking was performed (checks all words, not just unknown, in normal mode with forceAnalysis=false)
      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['hello', 'world', 'tânisi'], 'crk', false);
      
      // Verify store was updated with all known words
      expect(storeWithPartialWords.addKnownWords).toHaveBeenCalledWith([{ word: 'tânisi', analysis: 'tânisi+IPC', allAnalysis: ['tânisi+IPC'] }]);
      expect(storeWithPartialWords.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.arrayContaining([
        expect.objectContaining({ word: 'hello' }),
        expect.objectContaining({ word: 'world' }),
        expect.objectContaining({ word: 'tânisi' })
      ]));
      
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
        known: [{ word: 'world', analysis: 'world+N', allAnalysis: ['world+N'] }],
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
      
      // But store should still be updated (only 'world' has analysis, 'hello' is from cache)
      expect(storeWithWords.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.arrayContaining([
        expect.objectContaining({ word: 'world', analysis: 'world+N', allAnalysis: ['world+N'] })
      ]));
      
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
      // check() is called but returns empty known since all words are cached without FST data
      mockSpellCheckerService.check.mockResolvedValue({
        known: [],
        unknown: []
      });

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

      // NOTE: With the new implementation, check() is ALWAYS called, even with all cached words
      // This is because we pass all words to check(), which returns cached analysis
      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['hello', 'world', 'tânisi'], 'crk', false);
      
      // But RTE formatting should still be applied with cached words
      expect(mockRteServiceImport.applyHighlighting).toHaveBeenCalledWith(
        'region-1:main', 
        {
          knownWords: ['hello', 'world', 'tânisi'],
          issues: []
        }
      );
      
      expect(storeWithAllWords.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.arrayContaining([
        expect.objectContaining({ word: 'hello' }),
        expect.objectContaining({ word: 'world' }),
        expect.objectContaining({ word: 'tânisi' })
      ]));
      
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