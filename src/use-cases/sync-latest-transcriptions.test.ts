import { SyncLatestTranscriptions } from './sync-latest-transcriptions';
import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

// Mock the services
jest.mock('../services', () => ({
  services: {
    transcriptionService: {
      syncLatestChanges: jest.fn(),
      getCacheStats: jest.fn(),
    },
  },
}));

// Mock the ADT
jest.mock('../services/adt', () => ({
  TranscriptionModel: jest.fn(),
}));

describe('SyncLatestTranscriptions', () => {
  const mockStore = {
    setSyncStatus: jest.fn(),
    setOwnedSyncStatus: jest.fn(),
    setSharedSyncStatus: jest.fn(),
    mergeTranscriptions: jest.fn(),
    updateCacheStats: jest.fn(),
    setError: jest.fn(),
  };

  const mockTranscriptionModels = [
    new TranscriptionModel({
      id: 'transcription-1',
      title: 'Synced Transcription',
      author: 'user1',
      authorFriendly: 'User One',
      type: 'audio',
      source: 'https://example.com/audio1.mp3',
      length: 120,
      coverage: 0.8,
      userLastUpdated: 'user1'
    }),
  ];

  const mockCacheStats = {
    count: 1,
    lastSyncedAt: '2023-01-01T00:00:00.000Z'
  };

  const mockTranscriptionService = services.transcriptionService as jest.Mocked<typeof services.transcriptionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockTranscriptionService.syncLatestChanges.mockResolvedValue(mockTranscriptionModels);
    mockTranscriptionService.getCacheStats.mockResolvedValue(mockCacheStats);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      expect(useCase).toBeInstanceOf(SyncLatestTranscriptions);
    });
  });

  describe('validate', () => {
    it('should not throw error with valid config', () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error when services is missing', () => {
      const config = { services: undefined as any, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('services are required');
    });

    it('should throw error when store is missing', () => {
      const config = { services, store: undefined as any };
      const useCase = new SyncLatestTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('store is required');
    });
  });

  describe('execute', () => {
    it('should call validate before proceeding', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should set syncing status at start', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.setSyncStatus).toHaveBeenCalledWith(true);
      expect(mockStore.setOwnedSyncStatus).toHaveBeenCalledWith('syncing');
      expect(mockStore.setSharedSyncStatus).toHaveBeenCalledWith('syncing');
    });

    it('should call syncLatestChanges with timestamp', async () => {
      const config = { 
        services, 
        store: mockStore, 
        sinceTimestamp: '2023-01-01T00:00:00.000Z' 
      };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockTranscriptionService.syncLatestChanges).toHaveBeenCalledWith('2023-01-01T00:00:00.000Z');
    });

    it('should call syncLatestChanges without timestamp for full sync', async () => {
      const config = { services, store: mockStore, isFullSync: true };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockTranscriptionService.syncLatestChanges).toHaveBeenCalledWith(undefined);
    });

    it('should merge synced transcriptions when new data exists', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.mergeTranscriptions).toHaveBeenCalledWith(mockTranscriptionModels);
    });

    it('should not merge when no new transcriptions', async () => {
      mockTranscriptionService.syncLatestChanges.mockResolvedValue([]);
      
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.mergeTranscriptions).not.toHaveBeenCalled();
    });

    it('should update cache stats after sync', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockTranscriptionService.getCacheStats).toHaveBeenCalled();
      expect(mockStore.updateCacheStats).toHaveBeenCalledWith(mockCacheStats);
    });

    it('should set synced status after successful sync', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.setOwnedSyncStatus).toHaveBeenCalledWith('synced');
      expect(mockStore.setSharedSyncStatus).toHaveBeenCalledWith('synced');
    });

    it('should clear syncing status in finally block', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.setSyncStatus).toHaveBeenCalledWith(false);
    });

    it('should return synced transcriptions', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(result).toBe(mockTranscriptionModels);
    });

    it('should handle sync errors properly', async () => {
      const syncError = new Error('Sync failed');
      mockTranscriptionService.syncLatestChanges.mockRejectedValue(syncError);
      
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('Sync failed');
      
      expect(mockStore.setOwnedSyncStatus).toHaveBeenCalledWith(null);
      expect(mockStore.setSharedSyncStatus).toHaveBeenCalledWith(null);
      expect(mockStore.setError).toHaveBeenCalledWith('Sync failed');
      expect(mockStore.setSyncStatus).toHaveBeenCalledWith(false);
    });

    it('should handle non-Error exceptions', async () => {
      const errorString = 'Unknown error';
      mockTranscriptionService.syncLatestChanges.mockRejectedValue(errorString);
      
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toBe(errorString);
      
      expect(mockStore.setError).toHaveBeenCalledWith('Failed to sync transcriptions');
    });

    it('should log appropriate messages for successful sync with data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const config = { services, store: mockStore, isFullSync: true };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔄 SyncLatestTranscriptions use-case executing (full sync)...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SyncLatestTranscriptions completed: 1 transcriptions synced');
      
      consoleSpy.mockRestore();
    });

    it('should log appropriate messages for successful sync without data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockTranscriptionService.syncLatestChanges.mockResolvedValue([]);
      
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔄 SyncLatestTranscriptions use-case executing (incremental sync)...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SyncLatestTranscriptions completed: No new transcriptions to sync');
      
      consoleSpy.mockRestore();
    });

    it('should log error messages on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const syncError = new Error('Sync error');
      mockTranscriptionService.syncLatestChanges.mockRejectedValue(syncError);
      
      const config = { services, store: mockStore };
      const useCase = new SyncLatestTranscriptions(config);
      
      try {
        await useCase.execute();
      } catch {
        // Expected to throw
      }
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ SyncLatestTranscriptions use-case failed:', syncError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('concurrent execution', () => {
    it('should handle concurrent syncs', async () => {
      const config = { services, store: mockStore };
      const useCase1 = new SyncLatestTranscriptions(config);
      const useCase2 = new SyncLatestTranscriptions(config);
      
      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute(),
      ]);
      
      expect(result1).toBe(mockTranscriptionModels);
      expect(result2).toBe(mockTranscriptionModels);
      expect(mockTranscriptionService.syncLatestChanges).toHaveBeenCalledTimes(2);
    });
  });
});
