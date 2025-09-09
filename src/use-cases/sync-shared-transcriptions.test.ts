import { SyncSharedTranscriptions } from './sync-shared-transcriptions';
import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

// Mock the services
jest.mock('../services', () => ({
  services: {
    transcriptionService: {
      getCacheStats: jest.fn(),
      loadSharedTranscriptionsOnly: jest.fn(),
    },
  },
}));

// Mock the ADT
jest.mock('../services/adt', () => ({
  TranscriptionModel: jest.fn(),
}));

describe('SyncSharedTranscriptions', () => {
  const mockStore = {
    setSharedSyncStatus: jest.fn(),
    mergeTranscriptions: jest.fn(),
  };

  const mockTranscriptionModels = [
    new TranscriptionModel({
      id: 'transcription-1',
      title: 'Shared Transcription',
      author: 'user2',
      authorFriendly: 'User Two',
      type: 'audio',
      source: 'https://example.com/audio1.mp3',
      length: 120,
      coverage: 0.8,
      userLastUpdated: 'user2'
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
    mockTranscriptionService.getCacheStats.mockResolvedValue(mockCacheStats);
    mockTranscriptionService.loadSharedTranscriptionsOnly.mockResolvedValue(mockTranscriptionModels);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      expect(useCase).toBeInstanceOf(SyncSharedTranscriptions);
    });
  });

  describe('validate', () => {
    it('should not throw error with valid config', () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error when services is missing', () => {
      const config = { services: undefined as any, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('services are required');
    });

    it('should throw error when store is missing', () => {
      const config = { services, store: undefined as any };
      const useCase = new SyncSharedTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('store is required');
    });
  });

  describe('execute', () => {
    it('should call validate before proceeding', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should set syncing status at start', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.setSharedSyncStatus).toHaveBeenCalledWith('syncing');
    });

    it('should get cache stats for incremental sync', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockTranscriptionService.getCacheStats).toHaveBeenCalled();
    });

    it('should call loadSharedTranscriptionsOnly with lastSyncedAt timestamp', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockTranscriptionService.loadSharedTranscriptionsOnly).toHaveBeenCalledWith('2023-01-01T00:00:00.000Z');
    });

    it('should call loadSharedTranscriptionsOnly with undefined when no lastSyncedAt', async () => {
      const emptyCacheStats = { count: 0, lastSyncedAt: null };
      mockTranscriptionService.getCacheStats.mockResolvedValue(emptyCacheStats);
      
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockTranscriptionService.loadSharedTranscriptionsOnly).toHaveBeenCalledWith(undefined);
    });

    it('should merge synced transcriptions when new data exists', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.mergeTranscriptions).toHaveBeenCalledWith(mockTranscriptionModels);
    });

    it('should not merge when no new transcriptions', async () => {
      mockTranscriptionService.loadSharedTranscriptionsOnly.mockResolvedValue([]);
      
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.mergeTranscriptions).not.toHaveBeenCalled();
    });

    it('should set synced status after successful sync', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.setSharedSyncStatus).toHaveBeenCalledWith('synced');
    });

    it('should return synced transcriptions', async () => {
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(result).toBe(mockTranscriptionModels);
    });

    it('should handle sync errors properly', async () => {
      const syncError = new Error('Sync failed');
      mockTranscriptionService.loadSharedTranscriptionsOnly.mockRejectedValue(syncError);
      
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('Sync failed');
      
      expect(mockStore.setSharedSyncStatus).toHaveBeenCalledWith(null);
    });

    it('should log appropriate messages for successful sync with data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔄 SyncSharedTranscriptions executing...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SyncSharedTranscriptions completed: 1 shared transcriptions synced');
      
      consoleSpy.mockRestore();
    });

    it('should log appropriate messages for successful sync without data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockTranscriptionService.loadSharedTranscriptionsOnly.mockResolvedValue([]);
      
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔄 SyncSharedTranscriptions executing...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SyncSharedTranscriptions completed: No new shared transcriptions to sync');
      
      consoleSpy.mockRestore();
    });

    it('should log error messages on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const syncError = new Error('Sync error');
      mockTranscriptionService.loadSharedTranscriptionsOnly.mockRejectedValue(syncError);
      
      const config = { services, store: mockStore };
      const useCase = new SyncSharedTranscriptions(config);
      
      try {
        await useCase.execute();
      } catch {
        // Expected to throw
      }
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ SyncSharedTranscriptions failed:', syncError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('concurrent execution', () => {
    it('should handle concurrent shared syncs', async () => {
      const config = { services, store: mockStore };
      const useCase1 = new SyncSharedTranscriptions(config);
      const useCase2 = new SyncSharedTranscriptions(config);
      
      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute(),
      ]);
      
      expect(result1).toBe(mockTranscriptionModels);
      expect(result2).toBe(mockTranscriptionModels);
      expect(mockTranscriptionService.loadSharedTranscriptionsOnly).toHaveBeenCalledTimes(2);
    });
  });
});
