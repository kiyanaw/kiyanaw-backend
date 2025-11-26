import { regionSaveManager } from './regionSaveManager';
import { services } from './index';
import Timeout from 'smart-timeout';
import type { WordAnalysis } from './adt';

// Mock services
jest.mock('./index', () => ({
  services: {
    storeService: {
      transcription: { lang: 'crk' },
      getKnownWords: jest.fn(() => new Map()),
      regionById: jest.fn(() => ({ transcriptionId: 'trans-1' })),
      setRegionAnalysis: jest.fn(),
      setRegionSuggestions: jest.fn(),
      addKnownWords: jest.fn(),
      getIssuesForRegion: jest.fn(() => []),
      startPendingEdit: jest.fn(),
      endPendingEdit: jest.fn(),
      updatePendingEditActivity: jest.fn(),
      isPendingEdit: jest.fn(() => false),
      getRegionVersion: jest.fn(() => 1),
      setRegionVersion: jest.fn(),
      setRegionText: jest.fn(),
      setRegionTranslation: jest.fn(),
      setSaveStatus: jest.fn(),
    },
    spellCheckerService: {
      tokenize: jest.fn((text: string) => text.split(/\s+/).filter(Boolean)),
      check: jest.fn(),
      analyzeRegionText: jest.fn(),
    },
    rteService: {
      hasEditor: jest.fn(() => false),
      applyHighlighting: jest.fn(),
    },
    authService: {
      currentUser: jest.fn(() => ({ username: 'testuser' })),
    },
    regionService: {
      updateRegion: jest.fn(),
    },
  },
}));

// Mock Timeout
jest.mock('smart-timeout');

// Mock UpdateTranscriptionUseCase
jest.mock('../use-cases/update-transcription', () => ({
  UpdateTranscriptionUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock issueHighlightService
jest.mock('./issueHighlightService', () => ({
  issueHighlightService: {
    convertIssuesToHighlights: jest.fn(() => []),
  },
}));

describe('RegionSaveManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    regionSaveManager.__clearAll();
    
    // Reset mock implementations
    (services.storeService.transcription as { lang: string }).lang = 'crk';
    (services.storeService.getKnownWords as jest.Mock).mockReturnValue(new Map());
  });

  describe('Queue Management', () => {
    it('should create queue on first text change', () => {
      regionSaveManager.queueTextChange('region-1', 'test');
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue).toBeDefined();
      expect(queue?.pendingChanges.regionText).toBe('test');
      expect(queue?.lastChangeSource).toBe('text');
    });

    it('should update existing queue on subsequent text changes', () => {
      regionSaveManager.queueTextChange('region-1', 'first');
      regionSaveManager.queueTextChange('region-1', 'second');
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue?.pendingChanges.regionText).toBe('second');
    });

    it('should create/update queue for translation changes', () => {
      regionSaveManager.queueTranslationChange('region-1', 'translation');
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue).toBeDefined();
      expect(queue?.pendingChanges.translation).toBe('translation');
      expect(queue?.lastChangeSource).toBe('translation');
    });

    it('should merge multiple changes to same region', () => {
      regionSaveManager.queueTextChange('region-1', 'text');
      regionSaveManager.queueTranslationChange('region-1', 'translation');
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue?.pendingChanges.regionText).toBe('text');
      expect(queue?.pendingChanges.translation).toBe('translation');
    });

    it('should keep changes to different regions independent', () => {
      regionSaveManager.queueTextChange('region-1', 'text1');
      regionSaveManager.queueTextChange('region-2', 'text2');
      
      const queue1 = regionSaveManager.__getQueueForTesting('region-1');
      const queue2 = regionSaveManager.__getQueueForTesting('region-2');
      
      expect(queue1?.pendingChanges.regionText).toBe('text1');
      expect(queue2?.pendingChanges.regionText).toBe('text2');
    });
  });

  describe('Timer Coordination', () => {
    it('should start both spell check and save timers on text change', () => {
      regionSaveManager.queueTextChange('region-1', 'test');
      
      expect(Timeout.set).toHaveBeenCalledWith(
        'spell-check-region-1',
        expect.any(Function),
        500
      );
      expect(Timeout.set).toHaveBeenCalledWith(
        'region-save-region-1',
        expect.any(Function),
        3000
      );
    });

    it('should reset timers on subsequent changes', () => {
      regionSaveManager.queueTextChange('region-1', 'first');
      regionSaveManager.queueTextChange('region-1', 'second');
      
      expect(Timeout.clear).toHaveBeenCalled();
      expect(Timeout.set).toHaveBeenCalledTimes(4); // 2 spell check + 2 save timers
    });

    it('should start only save timer for translation changes', () => {
      jest.clearAllMocks();
      regionSaveManager.queueTranslationChange('region-1', 'translation');
      
      // Should only set save timer, not spell check timer
      expect(Timeout.set).toHaveBeenCalledTimes(1);
      expect(Timeout.set).toHaveBeenCalledWith(
        'region-save-region-1',
        expect.any(Function),
        3000
      );
    });

    it('should use unique timer keys per region', () => {
      regionSaveManager.queueTextChange('region-1', 'test1');
      regionSaveManager.queueTextChange('region-2', 'test2');
      
      expect(Timeout.set).toHaveBeenCalledWith(
        'spell-check-region-1',
        expect.any(Function),
        500
      );
      expect(Timeout.set).toHaveBeenCalledWith(
        'spell-check-region-2',
        expect.any(Function),
        500
      );
    });
  });

  describe('Spell Check Integration', () => {
    it('should store spell check promise in queue', async () => {
      const mockAnalysis: WordAnalysis[] = [
        { word: 'test', analysis: 'analysis', allAnalysis: [] }
      ];
      
      (services.spellCheckerService.analyzeRegionText as jest.Mock).mockResolvedValue({
        analysis: mockAnalysis,
        newlyKnown: mockAnalysis,
        suggestions: []
      });
      
      regionSaveManager.queueTextChange('region-1', 'test');
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      
      // Trigger spell check timer manually
      const spellCheckCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0] === 'spell-check-region-1'
      )?.[1];
      
      if (spellCheckCallback) {
        await spellCheckCallback();
      }
      
      expect(queue?.spellCheckPromise).toBeDefined();
    });

    it('should update pendingChanges when spell check completes', async () => {
      const mockAnalysis: WordAnalysis[] = [
        { word: 'test', analysis: 'analysis', allAnalysis: [] }
      ];
      
      (services.spellCheckerService.analyzeRegionText as jest.Mock).mockResolvedValue({
        analysis: mockAnalysis,
        newlyKnown: mockAnalysis,
        suggestions: []
      });
      
      regionSaveManager.queueTextChange('region-1', 'test');
      
      // Trigger spell check timer
      const spellCheckCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0] === 'spell-check-region-1'
      )?.[1];
      
      if (spellCheckCallback) {
        await spellCheckCallback();
      }
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue?.pendingChanges.regionAnalysis).toEqual(mockAnalysis);
    });

    it('should handle spell check failure gracefully', async () => {
      (services.spellCheckerService.analyzeRegionText as jest.Mock).mockRejectedValue(
        new Error('API error')
      );
      
      regionSaveManager.queueTextChange('region-1', 'test');
      
      // Trigger spell check timer
      const spellCheckCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0] === 'spell-check-region-1'
      )?.[1];
      
      // Should not throw when spell check fails
      await expect(spellCheckCallback()).resolves.not.toThrow();
      
      // Queue should still exist (system didn't crash)
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue).toBeDefined();
      // Analysis should be empty array on error (graceful degradation)
      expect(queue?.pendingChanges.regionAnalysis).toEqual([]);
    });

    it('should skip spell check if no language set', async () => {
      (services.storeService.transcription as { lang: string | null }).lang = null;
      
      regionSaveManager.queueTextChange('region-1', 'test');
      
      // Trigger spell check timer
      const spellCheckCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0] === 'spell-check-region-1'
      )?.[1];
      
      if (spellCheckCallback) {
        await spellCheckCallback();
      }
      
      expect(services.spellCheckerService.analyzeRegionText).not.toHaveBeenCalled();
    });
  });

  describe('Flush Logic', () => {
    it('should call regionService.updateRegion', async () => {
      regionSaveManager.queueTextChange('region-1', 'test');
      
      // Trigger save timer
      const saveCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0] === 'region-save-region-1'
      )?.[1];
      
      if (saveCallback) {
        await saveCallback();
      }
      
      expect(services.regionService.updateRegion).toHaveBeenCalledWith(
        'region-1',
        expect.objectContaining({
          regionText: 'test'
        }),
        'testuser',
        1 // version
      );
    });

    it('should clear queue after flush', async () => {
      regionSaveManager.queueTextChange('region-1', 'test');
      
      // Trigger save timer
      const saveCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0] === 'region-save-region-1'
      )?.[1];
      
      if (saveCallback) {
        await saveCallback();
      }
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue).toBeUndefined();
    });

    it('should include analysis in save if available', async () => {
      const mockAnalysis: WordAnalysis[] = [
        { word: 'test', analysis: 'analysis', allAnalysis: [] }
      ];
      
      (services.spellCheckerService.analyzeRegionText as jest.Mock).mockResolvedValue({
        analysis: mockAnalysis,
        newlyKnown: mockAnalysis,
        suggestions: []
      });
      
      regionSaveManager.queueTextChange('region-1', 'test');
      
      // Trigger spell check first
      const spellCheckCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0] === 'spell-check-region-1'
      )?.[1];
      
      if (spellCheckCallback) {
        await spellCheckCallback();
      }
      
      // Then trigger save
      const saveCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0] === 'region-save-region-1'
      )?.[1];
      
      if (saveCallback) {
        await saveCallback();
      }
      
      expect(services.regionService.updateRegion).toHaveBeenCalledWith(
        'region-1',
        expect.objectContaining({
          regionAnalysis: mockAnalysis
        }),
        'testuser',
        1
      );
    });
  });

  describe('Edge Cases', () => {
    it('should allow canceling pending saves', () => {
      regionSaveManager.queueTextChange('region-1', 'test');
      
      expect(regionSaveManager.hasPendingSaves('region-1')).toBe(true);
      
      regionSaveManager.cancelPendingSaves('region-1');
      
      expect(regionSaveManager.hasPendingSaves('region-1')).toBe(false);
    });

    it('should report pending saves correctly', () => {
      expect(regionSaveManager.hasPendingSaves('region-1')).toBe(false);
      
      regionSaveManager.queueTextChange('region-1', 'test');
      
      expect(regionSaveManager.hasPendingSaves('region-1')).toBe(true);
    });

    it('should handle concurrent text and translation changes', () => {
      regionSaveManager.queueTextChange('region-1', 'text');
      regionSaveManager.queueTranslationChange('region-1', 'translation');
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue?.pendingChanges.regionText).toBe('text');
      expect(queue?.pendingChanges.translation).toBe('translation');
      expect(queue?.lastChangeSource).toBe('translation'); // Last change wins
    });

    it('should clean up properly with __clearAll', () => {
      regionSaveManager.queueTextChange('region-1', 'test1');
      regionSaveManager.queueTextChange('region-2', 'test2');
      
      expect(regionSaveManager.hasPendingSaves('region-1')).toBe(true);
      expect(regionSaveManager.hasPendingSaves('region-2')).toBe(true);
      
      regionSaveManager.__clearAll();
      
      expect(regionSaveManager.hasPendingSaves('region-1')).toBe(false);
      expect(regionSaveManager.hasPendingSaves('region-2')).toBe(false);
    });
  });

  describe('Bounds Changes (Phase 2)', () => {
    it('should queue bounds changes', () => {
      regionSaveManager.queueBoundsChange('region-1', 10, 20);
      
      const queue = regionSaveManager.__getQueueForTesting('region-1');
      expect(queue?.pendingChanges.start).toBe(10);
      expect(queue?.pendingChanges.end).toBe(20);
      expect(queue?.lastChangeSource).toBe('bounds');
    });

    it('should use 2500ms debounce for bounds', () => {
      regionSaveManager.queueBoundsChange('region-1', 10, 20);
      
      expect(Timeout.set).toHaveBeenCalledWith(
        'region-save-region-1',
        expect.any(Function),
        2500
      );
    });
  });

  describe('Analysis Merging (Bug Fix)', () => {
    it('should preserve existing analysis for cached words', async () => {
      // Setup: Region has existing analysis
      const existingAnalysis: WordAnalysis[] = [
        { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] },
        { word: 'ana', analysis: 'ana+Pron', allAnalysis: ['ana+Pron'] },
        { word: 'êkwa', analysis: 'êkwa+Ipc', allAnalysis: ['êkwa+Ipc'] },
      ];
      
      (services.storeService.regionById as jest.Mock).mockReturnValue({
        transcriptionId: 'trans-1',
        regionAnalysis: existingAnalysis
      });
      
      // "awa" and "ana" are in cache with full analysis
      const cacheMap = new Map<string, WordAnalysis>();
      cacheMap.set('awa', { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] });
      cacheMap.set('ana', { word: 'ana', analysis: 'ana+Pron', allAnalysis: ['ana+Pron'] });
      (services.storeService.getKnownWords as jest.Mock).mockReturnValue(cacheMap);
      
      // API returns analysis for unknown words
      (services.spellCheckerService.analyzeRegionText as jest.Mock).mockResolvedValue({
        analysis: [
          { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] }, // From cache
          { word: 'ana', analysis: 'ana+Pron', allAnalysis: ['ana+Pron'] }, // From cache
          { word: 'êkwa', analysis: 'êkwa+Ipc+Updated', allAnalysis: ['êkwa+Ipc+Updated'] }, // Updated
          { word: 'new', analysis: 'new+N', allAnalysis: ['new+N'] } // New
        ],
        newlyKnown: [
          { word: 'êkwa', analysis: 'êkwa+Ipc+Updated', allAnalysis: ['êkwa+Ipc+Updated'] },
          { word: 'new', analysis: 'new+N', allAnalysis: ['new+N'] }
        ],
        suggestions: []
      });
      
      // Queue text change with all words
      regionSaveManager.queueTextChange('region-1', 'awa ana êkwa new');
      
      // Trigger spell check timer
      const spellCheckCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0].startsWith('spell-check-')
      )?.[1];
      await spellCheckCallback();
      
      // Verify merged analysis was set
      expect(services.storeService.setRegionAnalysis).toHaveBeenCalledWith(
        'region-1',
        expect.arrayContaining([
          { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] }, // Preserved
          { word: 'ana', analysis: 'ana+Pron', allAnalysis: ['ana+Pron'] }, // Preserved
          { word: 'êkwa', analysis: 'êkwa+Ipc+Updated', allAnalysis: ['êkwa+Ipc+Updated'] }, // Updated
          { word: 'new', analysis: 'new+N', allAnalysis: ['new+N'] } // New
        ])
      );
    });

    it('should not lose analysis when all words are cached', async () => {
      // Setup: Region has existing analysis
      const existingAnalysis: WordAnalysis[] = [
        { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] },
        { word: 'ana', analysis: 'ana+Pron', allAnalysis: ['ana+Pron'] },
      ];
      
      (services.storeService.regionById as jest.Mock).mockReturnValue({
        transcriptionId: 'trans-1',
        regionAnalysis: existingAnalysis
      });
      
      // ALL words are in cache with full analysis
      const cacheMap = new Map<string, WordAnalysis>();
      cacheMap.set('awa', { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] });
      cacheMap.set('ana', { word: 'ana', analysis: 'ana+Pron', allAnalysis: ['ana+Pron'] });
      (services.storeService.getKnownWords as jest.Mock).mockReturnValue(cacheMap);
      
      // API is NOT called (all words cached)
      (services.spellCheckerService.analyzeRegionText as jest.Mock).mockResolvedValue({
        analysis: [
          { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] },
          { word: 'ana', analysis: 'ana+Pron', allAnalysis: ['ana+Pron'] }
        ],
        newlyKnown: [],
        suggestions: []
      });
      
      // Queue text change
      regionSaveManager.queueTextChange('region-1', 'awa ana');
      
      // Trigger spell check timer
      const spellCheckCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0].startsWith('spell-check-')
      )?.[1];
      await spellCheckCallback();
      
      // Verify existing analysis was preserved (not empty array!)
      expect(services.storeService.setRegionAnalysis).toHaveBeenCalledWith(
        'region-1',
        expect.arrayContaining([
          { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] },
          { word: 'ana', analysis: 'ana+Pron', allAnalysis: ['ana+Pron'] }
        ])
      );
      
      // Should NOT be empty
      const call = (services.storeService.setRegionAnalysis as jest.Mock).mock.calls[0];
      expect(call[1].length).toBe(2);
    });

    it('should skip words with empty existing analysis', async () => {
      // Setup: Region has mix of complete and incomplete analysis
      const existingAnalysis = [
        { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] }, // Complete
        { word: 'bad', analysis: '', allAnalysis: [] }, // Incomplete - should be skipped
      ];
      
      (services.storeService.regionById as jest.Mock).mockReturnValue({
        transcriptionId: 'trans-1',
        regionAnalysis: existingAnalysis
      });
      
      // Both words are in cache (but 'bad' has empty analysis)
      const cacheMap = new Map<string, WordAnalysis>();
      cacheMap.set('awa', { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] });
      // 'bad' is NOT in cache because it has empty analysis
      (services.storeService.getKnownWords as jest.Mock).mockReturnValue(cacheMap);
      
      (services.spellCheckerService.analyzeRegionText as jest.Mock).mockResolvedValue({
        analysis: [
          { word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] }
        ],
        newlyKnown: [],
        suggestions: []
      });
      
      // Queue text change
      regionSaveManager.queueTextChange('region-1', 'awa bad');
      
      // Trigger spell check timer
      const spellCheckCallback = (Timeout.set as jest.Mock).mock.calls.find(
        call => call[0].startsWith('spell-check-')
      )?.[1];
      await spellCheckCallback();
      
      // Verify only complete analysis was preserved
      const call = (services.storeService.setRegionAnalysis as jest.Mock).mock.calls[0];
      const savedAnalysis = call[1];
      
      expect(savedAnalysis).toContainEqual({ word: 'awa', analysis: 'awa+Ipc', allAnalysis: ['awa+Ipc'] });
      expect(savedAnalysis).not.toContainEqual({ word: 'bad', analysis: '', allAnalysis: [] });
      expect(savedAnalysis.length).toBe(1);
    });
  });

  describe('Unit Tests for Extracted Private Methods', () => {
    describe('determinePrimaryField', () => {
      it('should return regionText when text is changed', () => {
        const changes = { regionText: 'new text', translation: undefined };
        const result = regionSaveManager.__determinePrimaryField(changes);
        expect(result).toBe('regionText');
      });

      it('should return translation when only translation is changed', () => {
        const changes = { translation: 'new translation' };
        const result = regionSaveManager.__determinePrimaryField(changes);
        expect(result).toBe('translation');
      });

      it('should return start when bounds are changed', () => {
        const changes = { start: 10, end: 20 };
        const result = regionSaveManager.__determinePrimaryField(changes);
        expect(result).toBe('start');
      });

      it('should prioritize regionText over translation', () => {
        const changes = { regionText: 'text', translation: 'trans' };
        const result = regionSaveManager.__determinePrimaryField(changes);
        expect(result).toBe('regionText');
      });
    });

    describe('waitForSpellCheckCompletion', () => {
      it('should return immediately if no spell check promise', async () => {
        // Create a queue first
        regionSaveManager.queueTextChange('test-region', 'test');
        const queue = regionSaveManager.__getQueueForTesting('test-region');
        if (!queue) throw new Error('Queue not found');
        
        queue.spellCheckPromise = null;
        
        await expect(regionSaveManager.__waitForSpellCheckCompletion(queue))
          .resolves.toBeUndefined();
      });

      it('should wait for spell check and update pendingChanges', async () => {
        regionSaveManager.queueTextChange('region-1', 'test');
        const queue = regionSaveManager.__getQueueForTesting('region-1');
        if (!queue) throw new Error('Queue not found');
        
        const mockAnalysis: WordAnalysis[] = [
          { word: 'test', analysis: 'test+N', allAnalysis: ['test+N'] }
        ];
        
        queue.spellCheckPromise = Promise.resolve(mockAnalysis);
        
        await regionSaveManager.__waitForSpellCheckCompletion(queue);
        
        expect(queue.pendingChanges.regionAnalysis).toEqual(mockAnalysis);
      });

      it('should handle spell check timeout gracefully', async () => {
        regionSaveManager.queueTextChange('region-1', 'test');
        const queue = regionSaveManager.__getQueueForTesting('region-1');
        if (!queue) throw new Error('Queue not found');
        
        // Create a promise that rejects with timeout error
        queue.spellCheckPromise = Promise.reject(new Error('Spell check timeout'));
        
        // Should not throw, should handle timeout gracefully
        await expect(regionSaveManager.__waitForSpellCheckCompletion(queue))
          .resolves.toBeUndefined();
      }, 1000);

      it('should handle spell check errors gracefully', async () => {
        regionSaveManager.queueTextChange('region-1', 'test');
        const queue = regionSaveManager.__getQueueForTesting('region-1');
        if (!queue) throw new Error('Queue not found');
        
        queue.spellCheckPromise = Promise.reject(new Error('API error'));
        
        // Should not throw, should handle error
        await expect(regionSaveManager.__waitForSpellCheckCompletion(queue))
          .resolves.toBeUndefined();
      });
    });

    describe('updateStoreWithRemoteData', () => {
      it('should update store with remote regionText', () => {
        const remoteData = { regionText: 'remote text', _version: 2 };
        
        regionSaveManager.__updateStoreWithRemoteData('region-1', remoteData, 'regionText');
        
        expect(services.storeService.setRegionText).toHaveBeenCalledWith('region-1', 'remote text');
      });

      it('should update store with remote translation', () => {
        const remoteData = { translation: 'remote translation', _version: 2 };
        
        regionSaveManager.__updateStoreWithRemoteData('region-1', remoteData, 'translation');
        
        expect(services.storeService.setRegionTranslation).toHaveBeenCalledWith('region-1', 'remote translation');
      });

      it('should not update store for bounds changes', () => {
        const remoteData = { start: 10, end: 20, _version: 2 };
        
        const setTextSpy = services.storeService.setRegionText as jest.Mock;
        setTextSpy.mockClear();
        
        regionSaveManager.__updateStoreWithRemoteData('region-1', remoteData, 'start');
        
        expect(services.storeService.setRegionText).not.toHaveBeenCalled();
      });
    });

    describe('reapplyHighlighting', () => {
      beforeEach(() => {
        (services.rteService.hasEditor as jest.Mock).mockReturnValue(true);
        (services.storeService.regionById as jest.Mock).mockReturnValue({
          regionAnalysis: [
            { word: 'test', analysis: 'test+N', allAnalysis: ['test+N'] }
          ]
        });
      });

      it('should apply highlighting with known words', async () => {
        await regionSaveManager.__reapplyHighlighting('region-1', 'region-1:main');
        
        expect(services.rteService.applyHighlighting).toHaveBeenCalledWith(
          'region-1:main',
          expect.objectContaining({
            knownWords: ['test'],
            issues: []
          })
        );
      });

      it('should handle empty regionAnalysis', async () => {
        (services.storeService.regionById as jest.Mock).mockReturnValue({
          regionAnalysis: []
        });
        
        await regionSaveManager.__reapplyHighlighting('region-1', 'region-1:main');
        
        expect(services.rteService.applyHighlighting).toHaveBeenCalledWith(
          'region-1:main',
          expect.objectContaining({
            knownWords: [],
            issues: []
          })
        );
      });

      it('should work for translation editor', async () => {
        await regionSaveManager.__reapplyHighlighting('region-1', 'region-1:translation');
        
        expect(services.rteService.applyHighlighting).toHaveBeenCalledWith(
          'region-1:translation',
          expect.objectContaining({
            knownWords: ['test']
          })
        );
      });
    });

    describe('updateTranscriptionMetadata', () => {
      it('should update transcription metadata when region exists', async () => {
        (services.storeService.regionById as jest.Mock).mockReturnValue({
          transcriptionId: 'trans-1'
        });
        
        await regionSaveManager.__updateTranscriptionMetadata('region-1');
        
        const { UpdateTranscriptionUseCase } = require('../use-cases/update-transcription');
        expect(UpdateTranscriptionUseCase).toHaveBeenCalledWith(
          expect.objectContaining({
            transcriptionId: 'trans-1'
          })
        );
      });

      it('should do nothing when region does not exist', async () => {
        (services.storeService.regionById as jest.Mock).mockReturnValue(null);
        
        const { UpdateTranscriptionUseCase } = require('../use-cases/update-transcription');
        UpdateTranscriptionUseCase.mockClear();
        
        await regionSaveManager.__updateTranscriptionMetadata('region-1');
        
        expect(UpdateTranscriptionUseCase).not.toHaveBeenCalled();
      });
    });

    describe('saveRegionChanges', () => {
      beforeEach(() => {
        (services.authService.currentUser as jest.Mock).mockReturnValue({ username: 'testuser' });
        (services.storeService.getRegionVersion as jest.Mock).mockReturnValue(1);
        (services.storeService.regionById as jest.Mock).mockReturnValue({
          transcriptionId: 'trans-1'
        });
        (services.regionService.updateRegion as jest.Mock).mockResolvedValue(undefined);
      });

      it('should save region changes successfully', async () => {
        const changes = { regionText: 'new text' };
        
        await regionSaveManager.__saveRegionChanges('region-1', changes, 'regionText');
        
        expect(services.regionService.updateRegion).toHaveBeenCalledWith(
          'region-1',
          changes,
          'testuser',
          1
        );
        expect(services.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
        expect(services.storeService.endPendingEdit).toHaveBeenCalledWith('region-1', 'regionText');
      });

      it('should skip save when user not authenticated', async () => {
        (services.authService.currentUser as jest.Mock).mockReturnValue(null);
        
        await regionSaveManager.__saveRegionChanges('region-1', { regionText: 'text' }, undefined);
        
        expect(services.regionService.updateRegion).not.toHaveBeenCalled();
      });

      it('should not end pending edit when field not specified', async () => {
        await regionSaveManager.__saveRegionChanges('region-1', { regionText: 'text' }, undefined);
        
        expect(services.storeService.endPendingEdit).not.toHaveBeenCalled();
      });
    });

    describe('handleSaveError', () => {
      beforeEach(() => {
        (services.storeService.getRegionVersion as jest.Mock).mockReturnValue(1);
      });

      it('should rethrow non-conflict errors', async () => {
        const error = new Error('Network error');
        
        // Mock isVersionConflictError to return false
        jest.mock('./versionConflictService', () => ({
          isVersionConflictError: jest.fn(() => false),
          handleVersionConflict: jest.fn()
        }));
        
        await expect(
          regionSaveManager.__handleSaveError(error, 'region-1', { regionText: 'text' }, undefined)
        ).rejects.toThrow('Network error');
      });
    });
  });
});

