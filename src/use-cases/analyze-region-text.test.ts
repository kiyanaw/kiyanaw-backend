// Mock the services before importing
jest.mock('../services/rteService', () => ({
  rteService: {
    applyKnownWordsFormatting: jest.fn(),
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

// Mock dependencies - use the mocked service
const mockSpellCheckerService = spellCheckerService as jest.Mocked<typeof spellCheckerService>;

const mockRteService = {
  applyKnownWordsFormatting: jest.fn(),
  hasEditor: jest.fn().mockReturnValue(true)
};

const mockStateActions = {
  addKnownWords: jest.fn(),
  setRegionAnalysis: jest.fn()
};

const mockStore = {
  getState: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn()
};

const mockServices = {
  spellCheckerService: mockSpellCheckerService,
  rteService: mockRteService,
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
      
      // Should check tokens for known words
      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['world']); // only unknown words
      
      // Should not call addKnownWords since no new words were discovered
      expect(mockStateActions.addKnownWords).not.toHaveBeenCalled();
      
      // Should set region analysis (with all known words including cached ones)
      expect(mockStateActions.setRegionAnalysis).toHaveBeenCalledWith('region-1', ['hello', 'êkwa']);
      
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
        known: ['tâpwê'],
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

      expect(mockSpellCheckerService.check).toHaveBeenCalledWith(['tâpwê']); // only unknown word
      expect(mockStateActions.addKnownWords).toHaveBeenCalledWith(['tâpwê']);
      expect(mockStateActions.setRegionAnalysis).toHaveBeenCalledWith('region-1', ['itwêw', 'êkwa', 'tâpwê']);
      
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
      expect(mockStateActions.setRegionAnalysis).toHaveBeenCalledWith('region-1', expect.any(Array));
      expect(mockStateActions.setRegionAnalysis).toHaveBeenCalledWith('region-2', expect.any(Array));
      
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