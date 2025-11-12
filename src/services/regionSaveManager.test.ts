import { regionSaveManager } from './regionSaveManager';
import { services } from './index';
import Timeout from 'smart-timeout';
import type { WordAnalysis } from './spellCheckerService';

// Mock services
jest.mock('./index', () => ({
  services: {
    storeService: {
      transcription: { lang: 'crk' },
      getKnownWords: jest.fn(() => new Set<string>()),
      regionById: jest.fn(() => ({ transcriptionId: 'trans-1' })),
      setRegionAnalysis: jest.fn(),
      addKnownWords: jest.fn(),
      getIssuesForRegion: jest.fn(() => []),
      startPendingEdit: jest.fn(),
      endPendingEdit: jest.fn(),
      updatePendingEditActivity: jest.fn(),
      isPendingEdit: jest.fn(() => false),
      getRegionVersion: jest.fn(() => 1),
      setRegionVersion: jest.fn(),
    },
    spellCheckerService: {
      tokenize: jest.fn((text: string) => text.split(/\s+/).filter(Boolean)),
      check: jest.fn(),
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
    (services.storeService.getKnownWords as jest.Mock).mockReturnValue(new Set<string>());
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
      
      (services.spellCheckerService.check as jest.Mock).mockResolvedValue({
        known: mockAnalysis,
        unknown: []
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
      
      (services.spellCheckerService.check as jest.Mock).mockResolvedValue({
        known: mockAnalysis,
        unknown: []
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
      (services.spellCheckerService.check as jest.Mock).mockRejectedValue(
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
      
      expect(services.spellCheckerService.check).not.toHaveBeenCalled();
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
      
      (services.spellCheckerService.check as jest.Mock).mockResolvedValue({
        known: mockAnalysis,
        unknown: []
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
});

