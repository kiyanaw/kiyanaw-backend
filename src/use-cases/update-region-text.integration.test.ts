import { UpdateRegionTextUseCase } from './update-region-text';
import { services } from '../services';

// Mock smart-timeout to execute immediately
jest.mock('smart-timeout', () => ({
  set: (key: string, fn: () => void) => {
    // Execute immediately in tests
    setTimeout(fn, 0);
    return key;
  },
  clear: jest.fn(),
}));

// Mock the services
jest.mock('../services', () => ({
  services: {
    regionService: {
      updateRegion: jest.fn(),
    },
    storeService: {
      endPendingEdit: jest.fn(),
    },
    conflictResolutionService: {
      showConflictDialog: jest.fn(),
    },
    authService: {
      currentUser: jest.fn().mockReturnValue({ username: 'test-user' }),
    },
  }
}));

describe('UpdateRegionTextUseCase - Enhanced Conflict Resolution Integration', () => {
  let mockStore: any;
  let mockRegionService: any;
  let mockConflictResolutionService: any;
  let mockStoreService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock store
    mockStore = {
      regionById: jest.fn(),
      getRegionVersion: jest.fn(),
      setRegionText: jest.fn(),
      setRegionTranslation: jest.fn(),
    };

    // Setup service mocks
    mockRegionService = services.regionService;
    mockConflictResolutionService = services.conflictResolutionService;
    mockStoreService = services.storeService;
  });

  describe('Version Conflict Resolution', () => {
    it('should show conflict dialog even when content is same', async () => {
      // Setup: Region exists with same content but newer version
      const regionId = 'test-region-1';
      const text = 'hello world';
      
      mockStore.regionById.mockReturnValue({
        id: regionId,
        regionText: 'hello world', // Same content
        transcriptionId: 'test-transcription'
      });
      mockStore.getRegionVersion.mockReturnValue(3); // Remote version
      
      // Save fails with version conflict
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion.mockRejectedValueOnce(versionError);
      
      // Mock conflict resolution - user accepts remote
      mockConflictResolutionService.showConflictDialog.mockResolvedValue({
        action: 'accept_remote'
      });

      const useCase = new UpdateRegionTextUseCase({
        regionId,
        text,
        field: 'regionText',
        store: mockStore,
        services
      });

      await useCase.execute();
       
      // Wait for debounced save to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have called updateRegion once (original fails)
      expect(mockRegionService.updateRegion).toHaveBeenCalledTimes(1);
      
      // Should show conflict dialog even with same content
      expect(mockConflictResolutionService.showConflictDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          regionId,
          field: 'regionText',
          localValue: text,
          remoteValue: text, // Same content
          localVersion: 3,
          remoteVersion: 3
        })
      );

      // Should accept remote changes (update store)
      expect(mockStore.setRegionText).toHaveBeenCalledWith(regionId, text);
      
      // Should end pending edit after successful retry
      expect(mockStoreService.endPendingEdit).toHaveBeenCalledWith(regionId, 'regionText');
    });

    it('should show conflict dialog when content differs', async () => {
      // Setup: Region exists with different content
      const regionId = 'test-region-2';
      const userText = 'user typed this';
      const remoteText = 'remote saved this';
      
      mockStore.regionById.mockReturnValue({
        id: regionId,
        regionText: remoteText, // Different content
        transcriptionId: 'test-transcription'
      });
      mockStore.getRegionVersion.mockReturnValue(5); // Remote version
      
      // Save fails with version conflict
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion.mockRejectedValueOnce(versionError);
      
      // User chooses to accept remote changes
      mockConflictResolutionService.showConflictDialog.mockResolvedValueOnce({
        action: 'accept_remote'
      });

      const useCase = new UpdateRegionTextUseCase({
        regionId,
        text: userText,
        field: 'regionText',
        store: mockStore,
        services
             });

       await useCase.execute();
       
       // Wait for debounced save to execute
       await new Promise(resolve => setTimeout(resolve, 10));

       // Should show conflict dialog
       expect(mockConflictResolutionService.showConflictDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          regionId,
          field: 'regionText',
          localValue: userText,
          remoteValue: remoteText,
          localVersion: 5,
          remoteVersion: 5
        })
      );

      // Should update store with remote value when user accepts remote
      expect(mockStore.setRegionText).toHaveBeenCalledWith(regionId, remoteText);
      
      // Should end pending edit
      expect(mockStoreService.endPendingEdit).toHaveBeenCalledWith(regionId, 'regionText');
      
      // Should NOT retry the save (user accepted remote)
      expect(mockRegionService.updateRegion).toHaveBeenCalledTimes(1);
    });

    it('should retry save when user chooses to keep local changes', async () => {
      // Setup: Region exists with different content
      const regionId = 'test-region-3';
      const userText = 'user wants to keep this';
      const remoteText = 'remote has this';
      
      mockStore.regionById.mockReturnValue({
        id: regionId,
        regionText: remoteText,
        transcriptionId: 'test-transcription'
      });
      mockStore.getRegionVersion.mockReturnValue(4);
      
      // First save fails, retry succeeds
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion
        .mockRejectedValueOnce(versionError)
        .mockResolvedValueOnce({});
      
      // User chooses to keep their changes
      mockConflictResolutionService.showConflictDialog.mockResolvedValueOnce({
        action: 'keep_local'
      });

      const useCase = new UpdateRegionTextUseCase({
        regionId,
        text: userText,
        field: 'regionText',
        store: mockStore,
        services
             });

       await useCase.execute();
       
       // Wait for debounced save to execute
       await new Promise(resolve => setTimeout(resolve, 10));

       // Should show conflict dialog
       expect(mockConflictResolutionService.showConflictDialog).toHaveBeenCalled();

      // Should retry save with user's text and fresh version
      expect(mockRegionService.updateRegion).toHaveBeenCalledTimes(2);
      expect(mockRegionService.updateRegion).toHaveBeenNthCalledWith(
        2,
        regionId,
        { regionText: userText },
        'test-user',
        4 // Fresh version
      );
      
             // Should have updated store with user's text initially (responsive UI)
       expect(mockStore.setRegionText).toHaveBeenCalledWith(regionId, userText);
      
      // Should end pending edit after successful save
      expect(mockStoreService.endPendingEdit).toHaveBeenCalledWith(regionId, 'regionText');
    });

    it('should handle translation field conflicts', async () => {
      // Setup: Translation field conflict
      const regionId = 'test-region-4';
      const userTranslation = 'user translation';
      const remoteTranslation = 'remote translation';
      
      mockStore.regionById.mockReturnValue({
        id: regionId,
        translation: remoteTranslation,
        transcriptionId: 'test-transcription'
      });
      mockStore.getRegionVersion.mockReturnValue(2);
      
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion.mockRejectedValueOnce(versionError);
      
      mockConflictResolutionService.showConflictDialog.mockResolvedValueOnce({
        action: 'accept_remote'
      });

      const useCase = new UpdateRegionTextUseCase({
        regionId,
        text: userTranslation,
        field: 'translation',
        store: mockStore,
        services
             });

       await useCase.execute();
       
       // Wait for debounced save to execute
       await new Promise(resolve => setTimeout(resolve, 10));

       // Should handle translation field correctly
      expect(mockConflictResolutionService.showConflictDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'translation',
          localValue: userTranslation,
          remoteValue: remoteTranslation
        })
      );

      // Should update translation field in store
      expect(mockStore.setRegionTranslation).toHaveBeenCalledWith(regionId, remoteTranslation);
    });

    it('should fallback gracefully when conflict resolution fails', async () => {
      // Setup: Conflict resolution throws error
      const regionId = 'test-region-5';
      
      mockStore.regionById.mockReturnValue({
        id: regionId,
        regionText: 'different text',
        transcriptionId: 'test-transcription'
      });
      mockStore.getRegionVersion.mockReturnValue(1);
      
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion.mockRejectedValueOnce(versionError);
      
      // Conflict resolution fails
      mockConflictResolutionService.showConflictDialog.mockRejectedValueOnce(
        new Error('Dialog error')
      );

      const useCase = new UpdateRegionTextUseCase({
        regionId,
        text: 'user text',
        field: 'regionText',
        store: mockStore,
        services
             });

       // Should not throw - graceful fallback
       await useCase.execute();
       
       // Wait for debounced save to execute
       await new Promise(resolve => setTimeout(resolve, 10));

      // Should still end pending edit to prevent UI lock
      expect(mockStoreService.endPendingEdit).toHaveBeenCalledWith(regionId, 'regionText');
    });
  });
}); 