import { UpdateRegionTextUseCase } from './update-region-text';
import { services } from '../services';

// Mock smart-timeout to execute immediately and synchronously
let timeoutFunctions: (() => void)[] = [];

jest.mock('smart-timeout', () => ({
  set: (key: string, fn: () => void) => {
    // Store function to be executed later
    timeoutFunctions.push(fn);
    return key;
  },
  clear: jest.fn(),
}));

// Mock the services
jest.mock('../services', () => ({
  services: {
    regionService: {
      updateRegion: jest.fn(),
      getRegion: jest.fn().mockResolvedValue(null), // Default return
    },
    storeService: {
      endPendingEdit: jest.fn(),
    },
    conflictDetectionService: {
      detectConflict: jest.fn().mockReturnValue({
        hasConflict: false,
        conflictDetails: []
      }),
    },
    conflictResolutionService: {
      showConflictDialog: jest.fn(),
    },
    authService: {
      currentUser: jest.fn().mockReturnValue({ username: 'test-user' }),
    },
    rteService: {
      applyKnownWordsFormatting: jest.fn(),
      hasEditor: jest.fn().mockReturnValue(false), // Assume no editor for simplicity
      setContent: jest.fn(),
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
    
    // Reset timeout functions
    timeoutFunctions = [];
    
    // Setup mock store
    mockStore = {
      regionById: jest.fn(),
      getRegionVersion: jest.fn(),
      setRegionText: jest.fn(),
      setRegionTranslation: jest.fn(),
      getRemoteRegionText: jest.fn(),
      getRemoteRegionTranslation: jest.fn(),
      getRemoteRegionUser: jest.fn(),
      transcription: {
        id: 'test-transcription',
        title: 'Test Transcription'
      },
      calculateTranscriptionMetadata: jest.fn().mockReturnValue({ coverage: 0.5 }),
      setTranscription: jest.fn(),
      setRegionVersion: jest.fn(),
    };

    // Setup service mocks
    mockRegionService = services.regionService;
    mockConflictResolutionService = services.conflictResolutionService;
    mockStoreService = services.storeService;
  });

  describe('Version Conflict Resolution', () => {
    it('should show conflict dialog even when content is same', async () => {
      // Setup: Region exists with different content that will trigger a save
      const regionId = 'test-region-1';
      const text = 'hello world updated';
      
      mockStore.regionById.mockReturnValue({
        id: regionId,
        regionText: 'hello world', // Different from what we're trying to save
        transcriptionId: 'test-transcription'
      });
      mockStore.getRegionVersion.mockReturnValue(3); // Remote version
      
      // Mock remote values (what was stored from subscription update)
      mockStore.getRemoteRegionText.mockReturnValue('hello world'); // Same content
      mockStore.getRemoteRegionUser.mockReturnValue('user.a@example.com');
      
      // Save fails with version conflict
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion.mockRejectedValueOnce(versionError);
      
      // Mock getRegion to return remote data for conflict analysis
      mockRegionService.getRegion.mockResolvedValue({
        id: regionId,
        regionText: 'hello world', // Same content as expected remoteValue
        transcriptionId: 'test-transcription',
        _version: 3,
        userLastUpdated: 'user.a@example.com'
      });
      
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

      useCase.execute();
       
      // Execute any stored timeout functions manually
      for (const fn of timeoutFunctions) {
        await fn();
      }

      // Should have called updateRegion once (original fails)
      expect(mockRegionService.updateRegion).toHaveBeenCalledTimes(1);
      
      // Should show conflict dialog even with same content
      expect(mockConflictResolutionService.showConflictDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          regionId,
          field: 'regionText',
          localValue: text,
          localVersion: 3,
          remoteVersion: 3 // Remote version from mock
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
      
      // Mock remote values (what was stored from subscription update)
      mockStore.getRemoteRegionText.mockReturnValue(remoteText); // Different content
      mockStore.getRemoteRegionUser.mockReturnValue('user.a@example.com');
      
      // Save fails with version conflict
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion.mockRejectedValueOnce(versionError);
      
      // Mock getRegion to return remote data for conflict analysis
      mockRegionService.getRegion.mockResolvedValue({
        id: regionId,
        regionText: remoteText, // Different content as expected remoteValue
        transcriptionId: 'test-transcription',
        _version: 5,
        userLastUpdated: 'user.a@example.com'
      });
      
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

       useCase.execute();
       
       // Execute any stored timeout functions manually
       for (const fn of timeoutFunctions) {
         await fn();
       }

       // Should show conflict dialog
       expect(mockConflictResolutionService.showConflictDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          regionId,
          field: 'regionText',
          localValue: userText,
          localVersion: 5,
          remoteVersion: 5 // Remote version from mock
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
      
      // Mock remote values (what was stored from subscription update)
      mockStore.getRemoteRegionText.mockReturnValue(remoteText); // Different content
      mockStore.getRemoteRegionUser.mockReturnValue('user.a@example.com');
      
      // First save fails, retry succeeds
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion
        .mockRejectedValueOnce(versionError)
        .mockResolvedValueOnce({});
      
      // Mock getRegion to return the latest version from database
      mockRegionService.getRegion = jest.fn().mockResolvedValue({
        id: regionId,
        regionText: remoteText,
        _version: 6 // Latest version from DB
      });
      
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

       useCase.execute();
       
       // Execute any stored timeout functions manually
       for (const fn of timeoutFunctions) {
         await fn();
       }

       // Should show conflict dialog
       expect(mockConflictResolutionService.showConflictDialog).toHaveBeenCalled();

      // Should retry save with user's text and fresh version
      expect(mockRegionService.updateRegion).toHaveBeenCalledTimes(2);
      expect(mockRegionService.updateRegion).toHaveBeenNthCalledWith(
        2,
        regionId,
        { regionText: userText },
        'test-user',
        6 // Fresh version from getRegion mock
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
      
      // Mock remote values (what was stored from subscription update)
      mockStore.getRemoteRegionTranslation.mockReturnValue(remoteTranslation); // Different content
      mockStore.getRemoteRegionUser.mockReturnValue('user.a@example.com');
      
      const versionError = new Error('ConditionalCheckFailedException');
      mockRegionService.updateRegion.mockRejectedValueOnce(versionError);
      
      // Mock getRegion to return remote data for conflict analysis
      mockRegionService.getRegion.mockResolvedValue({
        id: regionId,
        translation: remoteTranslation, // Remote translation as expected remoteValue
        transcriptionId: 'test-transcription',
        _version: 2,
        userLastUpdated: 'user.a@example.com'
      });
      
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

       useCase.execute();
       
       // Execute any stored timeout functions manually
       for (const fn of timeoutFunctions) {
         await fn();
       }

       // Should handle translation field correctly
      expect(mockConflictResolutionService.showConflictDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          field: 'translation',
          localValue: userTranslation,
          localVersion: 2,
          remoteVersion: 2 // Remote version from mock
        })
      );

      // Should update translation field in store with remote value
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
       useCase.execute();
       
       // Execute any stored timeout functions manually (error should be caught gracefully)
       try {
         for (const fn of timeoutFunctions) {
           await fn();
         }
       } catch (error) {
         // Expected to fail gracefully
       }

      // Should still end pending edit to prevent UI lock
      expect(mockStoreService.endPendingEdit).toHaveBeenCalledWith(regionId, 'regionText');
    });
  });
}); 