import { SubscribeToRegionChangesUseCase } from './subscribe-to-region-changes';
import type { RegionData } from '../services/adt';
import type { RegionSubscriptionEvent } from '../services/regionService';

// Helper function to create mock regions with required _version field
const createMockRegion = (overrides: Partial<RegionData> = {}): RegionData => ({
  id: 'region-1',
  transcriptionId: 'test-transcription',
  start: 10,
  end: 20,
  regionText: 'Test content',
  translation: 'Test translation',
  userLastUpdated: 'test@user.com',
  dateLastUpdated: '2023-01-01T00:00:00Z',
  _version: 1, // Always include version for subscription events
  ...overrides,
});

// Mock services
const mockServices = {
  regionService: {
    subscribeToRegionChanges: jest.fn()
  },
  storeService: {
    addNewRegion: jest.fn(),
    deleteRegion: jest.fn(),
    regionById: jest.fn(),
    updateRegionBounds: jest.fn(),
    setRegionAnalysis: jest.fn(),
    addKnownWords: jest.fn(),
    setRegionText: jest.fn(),
    setRegionTranslation: jest.fn(),
    setRegionVersion: jest.fn(),
    getRegionVersion: jest.fn().mockReturnValue(1), // Add missing mock
    getIssuesForRegion: jest.fn().mockReturnValue([]), // Add missing mock for issues
    addConflictToQueue: jest.fn(),
    removeConflictFromQueue: jest.fn(),
    isPendingEdit: jest.fn(),
    getBaselineForRegion: jest.fn(), // NEW: For baseline comparison logic
    get conflictQueue() { 
      return this._conflictQueue || []; 
    },
    set conflictQueue(value) { 
      this._conflictQueue = value; 
    },
    _conflictQueue: []
  },
  wavesurferService: {
    addRegionWithId: jest.fn(),
    deleteRegion: jest.fn(),
    setRegionPosition: jest.fn()
  },
  flashIndicatorService: {
    flashRegion: jest.fn()
  },
  userService: {
    currentUser: jest.fn()
  },
  rteService: {
    hasEditor: jest.fn(),
    setContent: jest.fn(),
    applyKnownWordsFormatting: jest.fn(),
    applyHighlighting: jest.fn()
  },
  conflictDetectionService: {
    detectConflict: jest.fn()
  }
} as any;

describe('SubscribeToRegionChangesUseCase', () => {
  let useCase: SubscribeToRegionChangesUseCase;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock returns
    mockServices.storeService.isPendingEdit.mockReturnValue(false);
    mockServices.conflictDetectionService.detectConflict.mockReturnValue({
      hasConflict: false,
      conflictType: 'none'
    });
    
    mockUnsubscribe = jest.fn();
    mockServices.regionService.subscribeToRegionChanges.mockReturnValue(mockUnsubscribe);
    
    useCase = new SubscribeToRegionChangesUseCase({
      transcriptionId: 'test-transcription',
      services: mockServices
    });
  });

  describe('validation', () => {
    it('should throw error if transcriptionId is empty', async () => {
      const useCaseWithEmptyId = new SubscribeToRegionChangesUseCase({
        transcriptionId: '',
        services: mockServices
      });

      expect(() => useCaseWithEmptyId.validate()).toThrow('transcriptionId is required');
    });

    it('should throw error if transcriptionId is whitespace', async () => {
      const useCaseWithWhitespace = new SubscribeToRegionChangesUseCase({
        transcriptionId: '   ',
        services: mockServices
      });

      expect(() => useCaseWithWhitespace.validate()).toThrow('transcriptionId is required');
    });

    it('should not throw error for valid transcriptionId', async () => {
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should set up subscription with correct transcriptionId', async () => {
      useCase.execute();

      expect(mockServices.regionService.subscribeToRegionChanges).toHaveBeenCalledWith(
        'test-transcription',
        expect.any(Function)
      );
    });

    it('should return unsubscribe function', async () => {
      const result = useCase.execute();

      expect(result).toBe(mockUnsubscribe);
    });
  });

  describe('event handling', () => {
    let subscriptionCallback: (event: any) => void;

    beforeEach(() => {
      useCase.execute();
      subscriptionCallback = mockServices.regionService.subscribeToRegionChanges.mock.calls[0][1];
    });

    describe('self-event filtering', () => {
      it('should ignore events from current user', async () => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

        const event = {
          mutation: 'UPDATE',
          region: createMockRegion({
            userLastUpdated: 'current@user.com'
          })
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).not.toHaveBeenCalled();
        expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
      });

      it('should process events from other users', async () => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

        const event = {
          mutation: 'UPDATE',
          region: createMockRegion({
            userLastUpdated: 'other@user.com',
            regionText: 'new text'
          })
        };

        mockServices.storeService.regionById.mockReturnValue({
          id: 'region-1',
          regionText: 'old text'
        });

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });
    });

    describe('flash indicator triggering', () => {
      beforeEach(() => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });
      });

      it('should trigger flash for CREATE events', async () => {
        const event = {
          mutation: 'CREATE',
          region: createMockRegion({
            userLastUpdated: 'other@user.com'
          })
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });

      it('should trigger flash for UPDATE events', async () => {
        const event = {
          mutation: 'UPDATE',
          region: createMockRegion({
            userLastUpdated: 'other@user.com'
          })
        };

        mockServices.storeService.regionById.mockReturnValue({ id: 'region-1' });

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });

      it('should trigger flash for DELETE events', async () => {
        const event = {
          mutation: 'DELETE',
          region: createMockRegion({
            userLastUpdated: 'other@user.com'
          })
        };

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });

      it('should not trigger flash if userLastUpdated is missing', async () => {
        const event = {
          mutation: 'UPDATE',
          region: createMockRegion({
            userLastUpdated: undefined // explicitly missing for this test
          })
        };

        mockServices.storeService.regionById.mockReturnValue({ id: 'region-1' });

        await subscriptionCallback(event);

        expect(mockServices.flashIndicatorService.flashRegion).not.toHaveBeenCalled();
      });
    });

    describe('CREATE event handling', () => {
      it('should add region to store and wavesurfer', async () => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

        const region = createMockRegion({
          start: 10,
          end: 20,
          userLastUpdated: 'other@user.com'
        });

        const event = { mutation: 'CREATE', region };

        await subscriptionCallback(event);

        expect(mockServices.storeService.addNewRegion).toHaveBeenCalledWith(region);
        expect(mockServices.wavesurferService.addRegionWithId).toHaveBeenCalledWith({
          id: 'region-1',
          start: 10,
          end: 20
        });
      });
    });

    describe('DELETE event handling', () => {
      it('should remove region from store and wavesurfer', async () => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

        const event = {
          mutation: 'DELETE',
          region: createMockRegion({
            userLastUpdated: 'other@user.com'
          })
        };

        await subscriptionCallback(event);

        expect(mockServices.storeService.deleteRegion).toHaveBeenCalledWith('region-1');
        expect(mockServices.wavesurferService.deleteRegion).toHaveBeenCalledWith('region-1');
      });
    });

    describe('UPDATE event handling', () => {
      beforeEach(() => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });
        
        // Set up default conflict detection behavior for these legacy tests
        mockServices.storeService.isPendingEdit.mockReturnValue(false); // User not editing
        mockServices.conflictDetectionService.detectConflict.mockReturnValue({
          hasConflict: false,
          conflictType: 'none'
        });
      });

      it('should handle bounds changes', async () => {
        const currentRegion = { id: 'region-1', start: 10, end: 20 };
        const updatedRegion = createMockRegion({ 
          start: 15, 
          end: 25, 
          userLastUpdated: 'other@user.com' 
        });

        mockServices.storeService.regionById.mockReturnValue(currentRegion);

        const event = { mutation: 'UPDATE', region: updatedRegion };

        await await subscriptionCallback(event);

        expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 15, 25);
        expect(mockServices.wavesurferService.setRegionPosition).toHaveBeenCalledWith('region-1', {
          start: 15,
          end: 25
        });
      });

      it('should handle region analysis updates', async () => {
        const currentRegion = { id: 'region-1' };
        const updatedRegion = createMockRegion({ 
          regionAnalysis: ['word1', 'word2'],
          userLastUpdated: 'other@user.com'
        });

        mockServices.storeService.regionById.mockReturnValue(currentRegion);

        const event = { mutation: 'UPDATE', region: updatedRegion };

        await await subscriptionCallback(event);

        expect(mockServices.storeService.setRegionAnalysis).toHaveBeenCalledWith('region-1', ['word1', 'word2']);
        expect(mockServices.storeService.addKnownWords).toHaveBeenCalledWith(['word1', 'word2']);
      });

      it('should handle text changes and update RTE if available', async () => {
        const currentRegion = { id: 'region-1', regionText: 'old text' };
        const updatedRegion = createMockRegion({ 
          regionText: 'new text',
          regionAnalysis: ['word1'],
          userLastUpdated: 'other@user.com'
        });

        mockServices.storeService.regionById.mockReturnValue(currentRegion);
        mockServices.rteService.hasEditor.mockReturnValue(true);

        const event = { mutation: 'UPDATE', region: updatedRegion };

        await subscriptionCallback(event);

        expect(mockServices.storeService.setRegionText).toHaveBeenCalledWith('region-1', 'new text');
        expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-1:main');
        expect(mockServices.rteService.setContent).toHaveBeenCalledWith('region-1:main', 'new text');
        expect(mockServices.rteService.applyHighlighting).toHaveBeenCalledWith('region-1:main', {
          knownWords: ['word1'],
          issues: []
        });
      });

      it('should handle translation changes', async () => {
        const currentRegion = { id: 'region-1', translation: 'old translation' };
        const updatedRegion = createMockRegion({ 
          translation: 'new translation',
          userLastUpdated: 'other@user.com'
        });

        mockServices.storeService.regionById.mockReturnValue(currentRegion);

        const event = { mutation: 'UPDATE', region: updatedRegion };

        await subscriptionCallback(event);

        expect(mockServices.storeService.setRegionTranslation).toHaveBeenCalledWith('region-1', 'new translation');
      });

      it('should warn and return early for unknown region', async () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        mockServices.storeService.regionById.mockReturnValue(null);

        const event = {
          mutation: 'UPDATE',
          region: createMockRegion({
            id: 'unknown-region',
            userLastUpdated: 'other@user.com'
          })
        };

        await subscriptionCallback(event);

        expect(consoleSpy).toHaveBeenCalledWith('🔌 Received UPDATE for unknown region:', 'unknown-region');
        expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    it('should warn for unknown mutation types', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });

      const event = {
        mutation: 'UNKNOWN',
        region: createMockRegion({
          userLastUpdated: 'other@user.com'
        })
      };

      await subscriptionCallback(event);

      expect(consoleSpy).toHaveBeenCalledWith('🔌 Unknown mutation type:', 'UNKNOWN');

      consoleSpy.mockRestore();
    });

    describe('version tracking regression tests', () => {
      beforeEach(() => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });
      });

      it('should skip version tracking for self-triggered events', async () => {
        const region = createMockRegion({
          userLastUpdated: 'current@user.com',
          _version: 42
        });

        const event = {
          mutation: 'UPDATE',
          region
        };

        // Mock store methods
        mockServices.storeService.setRegionVersion = jest.fn();

        await subscriptionCallback(event);

        // Should NOT update version tracking for self-triggered events (already handled by UpdateRegionUseCase)
        expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
        
        // Should NOT update content for self-triggered events
        expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
        expect(mockServices.storeService.setRegionTranslation).not.toHaveBeenCalled();
        expect(mockServices.storeService.setRegionAnalysis).not.toHaveBeenCalled();
        
        // Should NOT trigger flash
        expect(mockServices.flashIndicatorService.flashRegion).not.toHaveBeenCalled();
      });

      it('should handle remote events normally (not self-triggered)', async () => {
        const region = createMockRegion({
          userLastUpdated: 'other@user.com',
          regionText: 'new text',
          _version: 43
        });

        const event = {
          mutation: 'UPDATE',
          region
        };

        mockServices.storeService.regionById.mockReturnValue(createMockRegion());
        mockServices.storeService.setRegionVersion = jest.fn();

        await subscriptionCallback(event);

        // Should update version tracking
        expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 43);
        
        // Should update content for remote events
        expect(mockServices.storeService.setRegionText).toHaveBeenCalledWith('region-1', 'new text');
        
        // Should trigger flash for remote events
        expect(mockServices.flashIndicatorService.flashRegion).toHaveBeenCalledWith('region-1', 'other@user.com');
      });

      it('should skip version updates for self-triggered events to prevent conflicts', async () => {
        // This test ensures that self-triggered events do NOT update version tracking
        // because UpdateRegionUseCase already handles version increments correctly
        
        const firstSaveRegion = createMockRegion({
          userLastUpdated: 'current@user.com',
          _version: 71,
          regionAnalysis: ['word1', 'word2', 'word3'] // 3 words
        });

        const secondSaveRegion = createMockRegion({
          userLastUpdated: 'current@user.com', 
          _version: 72,
          regionAnalysis: ['word1', 'word2', 'word3', 'word4'] // 4 words, not 7!
        });

        mockServices.storeService.setRegionVersion = jest.fn();

        // First save subscription (should skip version update)
        await subscriptionCallback({
          mutation: 'UPDATE',
          region: firstSaveRegion
        });

        // Second save subscription (should skip version update)
        await subscriptionCallback({
          mutation: 'UPDATE', 
          region: secondSaveRegion
        });

        // Verify version tracking was NOT updated for self-triggered events
        expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
      });
    });

    describe('selective field protection for parallel editing', () => {
      beforeEach(() => {
        mockServices.userService.currentUser.mockReturnValue({ username: 'current@user.com' });
        mockServices.storeService.regionById.mockReturnValue({
          id: 'region-1',
          regionText: 'current text',
          translation: 'current translation',
          start: 10,
          end: 20,
          regionAnalysis: ['known', 'words']
        });
      });

      it('should protect text while allowing translation updates during text editing', async () => {
        // User is editing text, not translation
        mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
          if (field === 'regionText') return true;
          if (field === 'translation') return false;
          return false; // fallback for any field check
        });

        const updatedRegion = createMockRegion({
          regionText: 'remote text change',
          translation: 'remote translation change',
          userLastUpdated: 'other@user.com'
        });

        const event = { mutation: 'UPDATE', region: updatedRegion };
        await subscriptionCallback(event);

        // Text should be protected (not updated)
        expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
        
        // Translation should be updated
        expect(mockServices.storeService.setRegionTranslation).toHaveBeenCalledWith('region-1', 'remote translation change');
        
        // Version should be updated to allow parallel saves
        expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 1);
      });

      it('should protect translation while allowing text updates during translation editing', async () => {
        // User is editing translation, not text
        mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
          if (field === 'regionText') return false;
          if (field === 'translation') return true;
          return false;
        });

        const updatedRegion = createMockRegion({
          regionText: 'remote text change',
          translation: 'remote translation change',
          userLastUpdated: 'other@user.com'
        });

        const event = { mutation: 'UPDATE', region: updatedRegion };
        await subscriptionCallback(event);

        // Text should be updated
        expect(mockServices.storeService.setRegionText).toHaveBeenCalledWith('region-1', 'remote text change');
        
        // Translation should be protected (not updated)
        expect(mockServices.storeService.setRegionTranslation).not.toHaveBeenCalled();
        
        // Version should be updated to allow parallel saves
        expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 1);
      });

      it('should allow bounds updates during text editing (parallel editing)', async () => {
        // User is editing text only
        mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
          if (field === 'regionText') return true;
          return false;
        });

        const updatedRegion = createMockRegion({
          start: 30,
          end: 40,
          userLastUpdated: 'other@user.com'
        });

        const event = { mutation: 'UPDATE', region: updatedRegion };
        await subscriptionCallback(event);

        // Bounds should be updated
        expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 30, 40);
        expect(mockServices.wavesurferService.setRegionPosition).toHaveBeenCalledWith('region-1', {
          start: 30,
          end: 40
        });
        
        // Version should be updated to allow parallel saves
        expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 1);
      });

      describe('REGRESSION TESTS: Conflict Detection Logic', () => {
        it('CRITICAL: Should NOT update version when both browsers edit SAME FIELD (text)', async () => {
          // REGRESSION: This was broken because regionAnalysis was considered "unprotected change"
          // When both browsers edit text, Browser B should keep old version to force conflict
          
          // User is editing text in Browser B
          mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
            return field === 'regionText'; // Only text is being edited
          });

          // Mock baseline (what text looked like before Browser A's change)
          const baseline = { 
            id: 'region-1', 
            regionText: 'ORIGINAL TEXT', 
            _version: 0 
          };
          mockServices.storeService.getBaselineForRegion.mockReturnValue(baseline);

          // Browser A's text update arrives (with regionAnalysis side effect)
          // IMPORTANT: Only include the fields that actually changed to avoid false unprotected changes
          const updatedRegion = {
            id: 'region-1',
            regionText: 'CHANGED TEXT FROM BROWSER A',  // Text changed
            regionAnalysis: ['new', 'analysis'],        // Side effect - should NOT trigger version update
            userLastUpdated: 'browser.a@user.com',
            _version: 1
          } as any;

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Text should be protected (Browser B is editing it)
          expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
          
          // VERSION SHOULD NOT BE UPDATED - this forces conflict when Browser B tries to save
          expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
          
          // Should log the conflict protection message
          // Note: Can't easily test console.log in this setup, but the logic is tested above
        });

        it('CRITICAL: Should NOT update version when both browsers edit SAME FIELD (translation)', async () => {
          // User is editing translation in Browser B
          mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
            return field === 'translation'; // Only translation is being edited
          });

          // Browser A's translation update arrives
          // IMPORTANT: Only include the fields that actually changed
          const updatedRegion = {
            id: 'region-1',
            translation: 'CHANGED TRANSLATION FROM BROWSER A',
            userLastUpdated: 'browser.a@user.com',
            _version: 1
          } as any;

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Translation should be protected
          expect(mockServices.storeService.setRegionTranslation).not.toHaveBeenCalled();
          
          // VERSION SHOULD NOT BE UPDATED - forces conflict
          expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
        });

        it('CRITICAL: SHOULD update version for DIFFERENT FIELD edits (text vs translation)', async () => {
          // User is editing text in Browser B
          mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
            return field === 'regionText'; // Only text is being edited
          });

          // Browser A updates translation (different field)
          const updatedRegion = {
            id: 'region-1',
            translation: 'Browser A updated translation',
            userLastUpdated: 'browser.a@user.com',
            _version: 1
          } as any;

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Translation should be updated (not protected)
          expect(mockServices.storeService.setRegionTranslation).toHaveBeenCalledWith('region-1', 'Browser A updated translation');
          
          // VERSION SHOULD BE UPDATED - allows parallel save
          expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 1);
        });

        it('CRITICAL: SHOULD update version for DIFFERENT FIELD edits (text vs bounds)', async () => {
          // User is editing text in Browser B
          mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
            return field === 'regionText'; // Only text is being edited
          });

          // Browser A updates bounds (different field)
          const updatedRegion = {
            id: 'region-1',
            start: 30,
            end: 40,
            userLastUpdated: 'browser.a@user.com',
            _version: 1
          } as any;

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Bounds should be updated
          expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 30, 40);
          
          // VERSION SHOULD BE UPDATED - allows parallel save
          expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 1);
        });

        it('CRITICAL: Should NOT protect version when bounds change while user edits text (parallel editing)', async () => {
          // REGRESSION: This was broken - Browser A editing text received Browser B's bounds 
          // change but incorrectly protected version, causing conflict when Browser A tried to save
          
          // Browser A is editing text
          mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
            return field === 'regionText'; // Only text is being edited in Browser A
          });

          // Browser B sends bounds change (with ALL fields included in subscription)
          const updatedRegion = {
            id: 'region-1',
            start: 25,      // Bounds changed
            end: 35,        // Bounds changed  
            regionText: 'current text',  // Same text (not changed, just included in subscription)
            translation: 'current translation', // Same translation
            userLastUpdated: 'browser.b@user.com',
            _version: 2
          } as any;

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Bounds should be updated (not protected)
          expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 25, 35);
          
          // VERSION SHOULD BE UPDATED - this allows Browser A's text save to succeed
          expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
          
          // Text should NOT be updated (Browser A is editing it)
          expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
        });

        describe('COMPREHENSIVE: All Parallel Editing Scenarios (Baseline Comparison)', () => {
          // Test matrix: Browser A editing X, Browser B saves Y → Expected result
          // NEW: Tests use baseline comparison logic
          
          it('CONFLICT: A editing text, B saves text → should block version (force conflict)', async () => {
            // Browser A is editing text
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'regionText';
            });

            // Mock baseline (what region looked like when A started editing)
            const baseline = { id: 'region-1', regionText: 'ORIGINAL TEXT', _version: 1 };
            mockServices.storeService.getBaselineForRegion.mockReturnValue(baseline);

            // Browser B saves text change (subscription contains B's new text)
            const updatedRegion = {
              id: 'region-1',
              regionText: 'DIFFERENT TEXT FROM B',  // Text actually changed from baseline
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            // Text should be protected (A is editing)
            expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
            
            // VERSION SHOULD NOT UPDATE - force conflict when A tries to save
            expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
          });

          it('PARALLEL: A editing text, B saves translation → should update version (allow parallel)', async () => {
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'regionText';
            });

            // Mock baseline (original state)
            const baseline = { id: 'region-1', regionText: 'ORIGINAL TEXT', translation: 'ORIGINAL TRANSLATION', _version: 1 };
            mockServices.storeService.getBaselineForRegion.mockReturnValue(baseline);

            // Browser B saves translation change
            const updatedRegion = {
              id: 'region-1',
              translation: 'NEW TRANSLATION FROM B',  // Translation changed from baseline
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            expect(mockServices.storeService.setRegionTranslation).toHaveBeenCalledWith('region-1', 'NEW TRANSLATION FROM B');
            expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
          });

          it('PARALLEL: A editing text, B saves bounds → should update version (allow parallel)', async () => {
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'regionText';
            });

            // Mock baseline (original bounds)
            const baseline = { id: 'region-1', regionText: 'ORIGINAL TEXT', start: 10, end: 20, _version: 1 };
            mockServices.storeService.getBaselineForRegion.mockReturnValue(baseline);

            // Browser B saves bounds change (THIS IS THE KEY SCENARIO THAT WAS BROKEN)
            const updatedRegion = {
              id: 'region-1',
              start: 30,  // Bounds changed from baseline (10 → 30)
              end: 40,    // Bounds changed from baseline (20 → 40)
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 30, 40);
            expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
          });

          it('PARALLEL: A editing translation, B saves text → should update version (allow parallel)', async () => {
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'translation';
            });

            const updatedRegion = {
              id: 'region-1',
              regionText: 'NEW TEXT FROM B',
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            expect(mockServices.storeService.setRegionText).toHaveBeenCalledWith('region-1', 'NEW TEXT FROM B');
            expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
          });

          it('CONFLICT: A editing translation, B saves translation → should block version (force conflict)', async () => {
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'translation';
            });

            const updatedRegion = {
              id: 'region-1',
              translation: 'DIFFERENT TRANSLATION FROM B',
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            expect(mockServices.storeService.setRegionTranslation).not.toHaveBeenCalled();
            expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
          });

          it('PARALLEL: A editing translation, B saves bounds → should update version (allow parallel)', async () => {
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'translation';
            });

            const updatedRegion = {
              id: 'region-1',
              start: 25,
              end: 35,
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 25, 35);
            expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
          });

          it('PARALLEL: A not editing, B saves anything → should always update version (no protection)', async () => {
            mockServices.storeService.isPendingEdit.mockReturnValue(false); // Not editing anything

            const updatedRegion = {
              id: 'region-1',
              regionText: 'ANY TEXT',
              translation: 'ANY TRANSLATION',
              start: 50,
              end: 60,
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            // Should apply everything normally (no selective protection)
            expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
          });

          it('EDGE CASE: A editing text, B saves mixed changes → should update version (has unprotected changes)', async () => {
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'regionText';
            });

            // Browser B saves both text AND bounds (common in GraphQL subscriptions)
            const updatedRegion = {
              id: 'region-1',
              regionText: 'TEXT FROM B',     // Protected field
              start: 15,                     // Unprotected field
              end: 25,                       // Unprotected field
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            // Text should be protected
            expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
            
            // Bounds should be updated
            expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 15, 25);
            
            // VERSION SHOULD UPDATE - because bounds (unprotected) changed
            expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
          });

          it('EDGE CASE: A editing text, B saves only regionAnalysis → should update version (analysis not protected)', async () => {
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'regionText';
            });

            const updatedRegion = {
              id: 'region-1',
              regionAnalysis: ['new', 'analysis', 'words'],
              userLastUpdated: 'browser.b@user.com',
              _version: 2
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            expect(mockServices.storeService.setRegionAnalysis).toHaveBeenCalledWith('region-1', ['new', 'analysis', 'words']);
            expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 2);
          });
        });

        describe('REGRESSION: Baseline Comparison Fixes', () => {
          it('CRITICAL: Should use baseline comparison to detect actual changes (main fix)', async () => {
            // Browser A is editing text
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'regionText';
            });

            // Mock baseline: original region state when A started editing
            const baseline = { 
              id: 'region-1', 
              regionText: 'ORIGINAL TEXT', 
              start: 10, 
              end: 20, 
              _version: 40 
            };
            mockServices.storeService.getBaselineForRegion.mockReturnValue(baseline);

            // Browser B moves region and subscription arrives
            // GraphQL sends COMPLETE object, not just changes
            const updatedRegion = {
              id: 'region-1',
              regionText: 'ORIGINAL TEXT',       // Same as baseline - text unchanged
              start: 30,                        // Changed from baseline (10 → 30)
              end: 40,                          // Changed from baseline (20 → 40)
              regionAnalysis: ['word1', 'word2'], // Present in subscription
              userLastUpdated: 'browser.b@user.com',
              _version: 41
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            // The NEW logic should:
            // 1. Compare subscription vs baseline (not vs current store)
            // 2. Detect bounds actually changed: baseline.start(10) vs subscription.start(30)
            // 3. Allow version update because bounds are unprotected
            // 4. Enable parallel editing: A can save text with version 41

            expect(mockServices.storeService.updateRegionBounds).toHaveBeenCalledWith('region-1', 30, 40);
            expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 41);
            
            // Text should be protected since A is editing it
            expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
          });

          it('CRITICAL: Should still detect same-field conflicts with baseline comparison', async () => {
            // Browser A is editing text
            mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
              return field === 'regionText';
            });

            // Mock baseline
            const baseline = { 
              id: 'region-1', 
              regionText: 'ORIGINAL TEXT', 
              _version: 40 
            };
            mockServices.storeService.getBaselineForRegion.mockReturnValue(baseline);

            // Browser B also edits text and subscription arrives
            const updatedRegion = {
              id: 'region-1',
              regionText: 'DIFFERENT TEXT FROM B',  // Changed from baseline!
              userLastUpdated: 'browser.b@user.com',
              _version: 41
            } as any;

            const event = { mutation: 'UPDATE', region: updatedRegion };
            await subscriptionCallback(event);

            // Should still block same-field conflicts
            expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
            expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
          });
        });

        it('REGRESSION: regionAnalysis alone should NOT prevent version updates', async () => {
          // User is NOT editing anything
          mockServices.storeService.isPendingEdit.mockReturnValue(false);

          // Remote update with ONLY regionAnalysis change
          const updatedRegion = {
            id: 'region-1',
            regionAnalysis: ['new', 'analysis', 'words'],
            userLastUpdated: 'other@user.com',
            _version: 1
          } as any;

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Should update regionAnalysis
          expect(mockServices.storeService.setRegionAnalysis).toHaveBeenCalledWith('region-1', ['new', 'analysis', 'words']);
          
          // VERSION SHOULD BE UPDATED - regionAnalysis alone is not a conflicting change
          expect(mockServices.storeService.setRegionVersion).toHaveBeenCalledWith('region-1', 1);
        });

        it('REGRESSION: Should NOT detect false changes from null vs empty string differences', async () => {
          // User is editing text (so translation should use baseline comparison)
          mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
            return field === 'regionText';
          });

          // Mock baseline with empty string translation
          const baseline = { 
            id: 'region-1', 
            regionText: 'user typing here',
            translation: '', // Empty string
            _version: 1 
          };
          mockServices.storeService.getBaselineForRegion.mockReturnValue(baseline);

          // Remote subscription arrives with null translation (GraphQL sometimes sends null instead of "")
          const updatedRegion = {
            id: 'region-1',
            regionText: 'remote text change', // Text changed (should be protected)
            translation: null, // null instead of "" - should NOT be considered a change
            userLastUpdated: 'other@user.com',
            _version: 2
          } as any;

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Text should be protected (user is editing it)
          expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
          
          // Translation should NOT be updated (null vs "" should not be considered a change)
          expect(mockServices.storeService.setRegionTranslation).not.toHaveBeenCalled();
          
          // VERSION SHOULD NOT UPDATE - no actual unprotected changes detected
          expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
        });

        it('REGRESSION: Should NOT detect false changes from empty string vs null text differences', async () => {
          // User is editing translation (so text should use baseline comparison)
          mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
            return field === 'translation';
          });

          // Mock baseline with null text
          const baseline = { 
            id: 'region-1', 
            regionText: null, // null text
            translation: 'user typing translation',
            _version: 1 
          };
          mockServices.storeService.getBaselineForRegion.mockReturnValue(baseline);

          // Remote subscription arrives with empty string text
          const updatedRegion = {
            id: 'region-1',
            regionText: '', // Empty string instead of null - should NOT be considered a change
            translation: 'remote translation change', // Translation changed (should be protected)
            userLastUpdated: 'other@user.com',
            _version: 2
          } as any;

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Translation should be protected (user is editing it)
          expect(mockServices.storeService.setRegionTranslation).not.toHaveBeenCalled();
          
          // Text should NOT be updated (null vs "" should not be considered a change)
          expect(mockServices.storeService.setRegionText).not.toHaveBeenCalled();
          
          // VERSION SHOULD NOT UPDATE - no actual unprotected changes detected
          expect(mockServices.storeService.setRegionVersion).not.toHaveBeenCalled();
        });
      });

      describe('RTE synchronization and known words formatting', () => {
        beforeEach(() => {
          mockServices.rteService.hasEditor.mockReturnValue(true);
        });

        it('should update RTE and reapply known words formatting for text changes', async () => {
          // User is not editing anything
          mockServices.storeService.isPendingEdit.mockReturnValue(false);

          const updatedRegion = createMockRegion({
            regionText: 'remote text with known words',
            regionAnalysis: ['known', 'words'],
            userLastUpdated: 'other@user.com'
          });

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // RTE should be updated
          expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-1:main');
          expect(mockServices.rteService.setContent).toHaveBeenCalledWith('region-1:main', 'remote text with known words');
          
          // Known words formatting should be reapplied via applyHighlighting
          expect(mockServices.rteService.applyHighlighting).toHaveBeenCalledWith('region-1:main', {
            knownWords: ['known', 'words'],
            issues: []
          });
        });

        it('should update translation RTE and reapply known words formatting', async () => {
          // User is not editing anything
          mockServices.storeService.isPendingEdit.mockReturnValue(false);

          const updatedRegion = createMockRegion({
            translation: 'remote translation with known words',
            regionAnalysis: ['known', 'words'],
            userLastUpdated: 'other@user.com'
          });

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Translation RTE should be updated
          expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-1:translation');
          expect(mockServices.rteService.setContent).toHaveBeenCalledWith('region-1:translation', 'remote translation with known words');
          
          // Known words formatting should be reapplied via applyHighlighting
          expect(mockServices.rteService.applyHighlighting).toHaveBeenCalledWith('region-1:translation', {
            knownWords: ['known', 'words'],
            issues: []
          });
        });

        it('should use fallback region analysis when updated region has no analysis', async () => {
          // User is not editing anything
          mockServices.storeService.isPendingEdit.mockReturnValue(false);

          const updatedRegion = createMockRegion({
            regionText: 'remote text change',
            // No regionAnalysis in update
            userLastUpdated: 'other@user.com'
          });

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // RTE should be updated
          expect(mockServices.rteService.setContent).toHaveBeenCalledWith('region-1:main', 'remote text change');
          
          // Should use fallback analysis from store via applyHighlighting
          expect(mockServices.rteService.applyHighlighting).toHaveBeenCalledWith('region-1:main', {
            knownWords: ['known', 'words'],
            issues: []
          });
        });

        it('should update RTE during selective protection for non-protected fields', async () => {
          // User is editing text, so translation updates should sync to RTE
          mockServices.storeService.isPendingEdit.mockImplementation((regionId, field) => {
            if (field === 'regionText') return true;
            if (field === 'translation') return false;
            return false;
          });

          const updatedRegion = createMockRegion({
            translation: 'remote translation change',
            regionAnalysis: ['test', 'words'],
            userLastUpdated: 'other@user.com'
          });

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Translation should be updated in store
          expect(mockServices.storeService.setRegionTranslation).toHaveBeenCalledWith('region-1', 'remote translation change');
          
          // Translation RTE should be updated
          expect(mockServices.rteService.hasEditor).toHaveBeenCalledWith('region-1:translation');
          expect(mockServices.rteService.setContent).toHaveBeenCalledWith('region-1:translation', 'remote translation change');
          
          // Known words formatting should be reapplied to translation RTE via applyHighlighting
          expect(mockServices.rteService.applyHighlighting).toHaveBeenCalledWith('region-1:translation', {
            knownWords: ['test', 'words'],
            issues: []
          });
        });

        it('should not update RTE when editor does not exist', async () => {
          mockServices.rteService.hasEditor.mockReturnValue(false);
          mockServices.storeService.isPendingEdit.mockReturnValue(false);

          const updatedRegion = createMockRegion({
            regionText: 'remote text change',
            userLastUpdated: 'other@user.com'
          });

          const event = { mutation: 'UPDATE', region: updatedRegion };
          await subscriptionCallback(event);

          // Store should be updated
          expect(mockServices.storeService.setRegionText).toHaveBeenCalledWith('region-1', 'remote text change');
          
          // RTE should not be updated
          expect(mockServices.rteService.setContent).not.toHaveBeenCalled();
          expect(mockServices.rteService.applyKnownWordsFormatting).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('Simplified Subscription Handling - Always Apply Remote Changes', () => {
    const createMockRegion = (overrides: Partial<RegionData> = {}): RegionData => ({
      id: 'test-region-1',
      start: 10,
      end: 20,
      regionText: 'original text',
      translation: 'original translation',
      transcriptionId: 'test-transcription',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      dateLastUpdated: '2023-01-01T00:00:00Z',
      userLastUpdated: 'other-user',
      isNote: false,
      regionAnalysis: [],
      _version: 1,
      ...overrides
    });

    const mockStoreService = mockServices.storeService;
    const conflictDetectionService = mockServices.conflictDetectionService;

    const createMockSubscriptionEvent = (mutation: 'UPDATE' | 'CREATE' | 'DELETE', region: RegionData): RegionSubscriptionEvent => ({
      mutation,
      region
    });

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      
      // Reset the mock conflict queue
      mockStoreService.conflictQueue = [];
      
      // Set up default mock implementations
      mockStoreService.isPendingEdit.mockReturnValue(false);
      mockStoreService.regionById.mockReturnValue(null);
      (conflictDetectionService.detectConflict as jest.Mock).mockReturnValue({
        hasConflict: false,
        conflictType: 'none'
      });
    });

        it('should protect text content when user is actively typing', async () => {
      const currentRegion = createMockRegion({ regionText: 'local text' });
      const remoteRegion = createMockRegion({ 
        regionText: 'remote text',
        _version: 2 
      });

      // Mock store to return current region
      mockStoreService.regionById.mockReturnValue(currentRegion);
      mockStoreService.isPendingEdit.mockReturnValue(true); // User IS actively typing

      // Mock baseline (what text looked like before user started typing)
      const baseline = createMockRegion({ regionText: 'original text', _version: 1 });
      mockStoreService.getBaselineForRegion.mockReturnValue(baseline);

      const event = createMockSubscriptionEvent('UPDATE', remoteRegion);
      await useCase.handleRegionSubscriptionEvent(event);

      // Should NOT apply text changes (protect user's typing)
      expect(mockStoreService.setRegionText).not.toHaveBeenCalled();
      
      // Should NOT update version to force conflict when same field is edited concurrently
      expect(mockStoreService.setRegionVersion).not.toHaveBeenCalled();
      
      // Should NOT queue conflicts - version conflicts handled at save time
      expect(mockStoreService.addConflictToQueue).not.toHaveBeenCalled();
    });

    it('should apply all changes when user is not actively typing', async () => {
      const currentRegion = createMockRegion({ regionText: 'local text' });
      const remoteRegion = createMockRegion({ 
        regionText: 'remote text',
        _version: 2 
      });

      // Mock store to return current region
      mockStoreService.regionById.mockReturnValue(currentRegion);
      mockStoreService.isPendingEdit.mockReturnValue(false); // User NOT actively typing

      const event = createMockSubscriptionEvent('UPDATE', remoteRegion);
      await useCase.handleRegionSubscriptionEvent(event);

      // Should apply all remote changes including text and version
      expect(mockStoreService.setRegionText).toHaveBeenCalledWith('test-region-1', 'remote text');
      expect(mockStoreService.setRegionVersion).toHaveBeenCalledWith('test-region-1', 2);
      
      // Should NOT queue conflicts - version conflicts handled at save time
      expect(mockStoreService.addConflictToQueue).not.toHaveBeenCalled();
    });

    it('should apply remote changes directly when no conflicts detected', async () => {
      const currentRegion = createMockRegion({ regionText: 'same text' });
      const remoteRegion = createMockRegion({ 
        regionText: 'same text',
        start: 15, // Different bounds
        _version: 2 
      });
      
      mockStoreService.regionById.mockReturnValue(currentRegion);
      mockStoreService.isPendingEdit.mockReturnValue(false);
      
      // Mock no conflicts
      (conflictDetectionService.detectConflict as jest.Mock).mockReturnValue({
        hasConflict: false,
        conflictType: 'none'
      });

      const event = createMockSubscriptionEvent('UPDATE', remoteRegion);
      await useCase.handleRegionSubscriptionEvent(event);

      // Should apply the remote changes
      expect(mockStoreService.updateRegionBounds).toHaveBeenCalledWith('test-region-1', 15, 20);
      expect(mockStoreService.setRegionVersion).toHaveBeenCalledWith('test-region-1', 2);
    });

    // Note: Removed auto-merge test - we now always apply remote changes directly

    // Note: Removed text conflict queuing test - we now always apply remote changes directly

    // Note: Removed complex conflict queue processing tests - we now use simple version-based conflicts

    // Note: Removed complex multi-field conflicts test - we now always apply remote changes directly

    it('REGRESSION: should apply simple remote updates directly when user is not editing (no conflict detection)', async () => {
      // This test ensures we don't break the core functionality again
      const currentRegion = createMockRegion({
        regionText: 'old text',
        _version: 1
      });
      const remoteRegion = createMockRegion({
        regionText: 'old text kiya', // Simple addition like reported in the bug
        regionAnalysis: ['old', 'text', 'kiya'],
        _version: 2
      });

      mockStoreService.regionById.mockReturnValue(currentRegion);
      mockStoreService.isPendingEdit.mockReturnValue(false); // User NOT editing

      const event = createMockSubscriptionEvent('UPDATE', remoteRegion);
      await useCase.handleRegionSubscriptionEvent(event);

      // Should apply changes directly without any conflict detection
      expect(mockStoreService.setRegionText).toHaveBeenCalledWith('test-region-1', 'old text kiya');
      expect(mockStoreService.setRegionAnalysis).toHaveBeenCalledWith('test-region-1', ['old', 'text', 'kiya']);
      expect(mockStoreService.setRegionVersion).toHaveBeenCalledWith('test-region-1', 2);
      
      // Should NOT queue any conflicts
      expect(mockStoreService.addConflictToQueue).not.toHaveBeenCalled();
      
      // Should NOT run conflict detection at all when user isn't editing
      expect(mockServices.conflictDetectionService.detectConflict).not.toHaveBeenCalled();
    });
      });


}); 