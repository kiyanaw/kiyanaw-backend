import { LoadTranscriptions } from './load-transcriptions';
import { LoadTranscriptionsFromCache } from './load-transcriptions-from-cache';
import { SyncLatestTranscriptions } from './sync-latest-transcriptions';
import { services } from '../services';
import { TranscriptionModel } from '../services/adt';
import { useTranscriptionsStore } from '../stores/useTranscriptionsStore';

// Mock the services
jest.mock('../services', () => ({
  services: {
    transcriptionService: {
      loadAll: jest.fn(),
    },
  },
}));

// Mock the ADT
jest.mock('../services/adt', () => ({
  TranscriptionModel: jest.fn(),
}));

// Mock the use-cases
jest.mock('./load-transcriptions-from-cache');
jest.mock('./sync-latest-transcriptions');

// Mock the store
jest.mock('../stores/useTranscriptionsStore', () => ({
  useTranscriptionsStore: {
    getState: jest.fn(),
  },
}));

describe('LoadTranscriptions', () => {
  const mockStore = {
    setTranscriptions: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
  };

  const mockTranscriptionModels = [
    new TranscriptionModel({
      id: 'transcription-1',
      title: 'First Transcription',
      author: 'user1',
      authorFriendly: 'User One',
      type: 'audio',
      source: 'https://example.com/audio1.mp3',
      length: 120,
      coverage: 0.8,
      isPrivate: false,
      disableAnalyzer: false,
      userLastUpdated: 'user1'
    }),
    new TranscriptionModel({
      id: 'transcription-2',
      title: 'Second Transcription',
      author: 'user2',
      authorFriendly: 'User Two',
      type: 'video',
      source: 'https://example.com/video1.mp4',
      length: 240,
      coverage: 0.6,
      isPrivate: true,
      disableAnalyzer: true,
      userLastUpdated: 'user2'
    }),
  ];

  const mockTranscriptionService = services.transcriptionService as jest.Mocked<typeof services.transcriptionService>;
  const MockLoadTranscriptionsFromCache = LoadTranscriptionsFromCache as jest.MockedClass<typeof LoadTranscriptionsFromCache>;
  const MockSyncLatestTranscriptions = SyncLatestTranscriptions as jest.MockedClass<typeof SyncLatestTranscriptions>;
  const mockUseTranscriptionsStore = useTranscriptionsStore as jest.Mocked<typeof useTranscriptionsStore>;

  const mockCacheResult = {
    transcriptions: mockTranscriptionModels,
    cacheStats: { count: 2, lastSyncedAt: '2023-01-01T00:00:00.000Z' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful response for legacy fallback
    mockTranscriptionService.loadAll.mockResolvedValue(mockTranscriptionModels);
    
    // Setup mock store state
    mockUseTranscriptionsStore.getState.mockReturnValue({
      transcriptions: mockTranscriptionModels,
      loading: false,
      error: null,
    } as any);
    
    // Setup mock use-case instances
    const mockCacheUseCase = {
      execute: jest.fn().mockResolvedValue(mockCacheResult),
    };
    const mockSyncUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    };
    
    MockLoadTranscriptionsFromCache.mockImplementation(() => mockCacheUseCase as any);
    MockSyncLatestTranscriptions.mockImplementation(() => mockSyncUseCase as any);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      expect(useCase).toBeInstanceOf(LoadTranscriptions);
    });

    it('should store config correctly', () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      expect(useCase['config']).toBe(config);
    });
  });

  describe('validate', () => {
    it('should not throw error with valid config', () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error when services is missing', () => {
      const config = { services: undefined as any, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('services are required');
    });

    it('should throw error when services is null', () => {
      const config = { services: null as any, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('services are required');
    });

    it('should throw error when store is missing', () => {
      const config = { services, store: undefined as any };
      const useCase = new LoadTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('store is required');
    });

    it('should throw error when store is null', () => {
      const config = { services, store: null as any };
      const useCase = new LoadTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('store is required');
    });

    it('should throw error when both services and store are missing', () => {
      const config = { services: undefined as any, store: undefined as any };
      const useCase = new LoadTranscriptions(config);
      
      expect(() => useCase.validate()).toThrow('services are required');
    });
  });

  describe('execute', () => {
    it('should call validate before proceeding', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should execute two-stage loading by default', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await useCase.execute();
      
      expect(MockLoadTranscriptionsFromCache).toHaveBeenCalledWith(config);
      expect(MockSyncLatestTranscriptions).toHaveBeenCalled();
    });

    it('should return transcriptions from store state', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(mockUseTranscriptionsStore.getState).toHaveBeenCalled();
      expect(result).toBe(mockTranscriptionModels);
      expect(result).toHaveLength(2);
    });

    it('should handle empty cache gracefully', async () => {
      const emptyTranscriptions: TranscriptionModel[] = [];
      mockUseTranscriptionsStore.getState.mockReturnValue({
        transcriptions: emptyTranscriptions,
        loading: false,
        error: null,
      } as any);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(result).toEqual([]);
    });

    it('should handle large cache efficiently', async () => {
      const manyTranscriptions = Array.from({ length: 100 }, (_, i) => 
        new TranscriptionModel({
          id: `transcription-${i}`,
          title: `Transcription ${i}`,
          author: 'user',
          authorFriendly: 'User',
          type: 'audio',
          source: `https://example.com/audio${i}.mp3`,
          length: 120,
          userLastUpdated: 'user'
        })
      );
      mockUseTranscriptionsStore.getState.mockReturnValue({
        transcriptions: manyTranscriptions,
        loading: false,
        error: null,
      } as any);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(result).toHaveLength(100);
    });
  });

  describe('error handling', () => {
    it('should propagate validation errors', async () => {
      const config = { services: undefined as any, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('services are required');
    });

    it('should handle cache loading errors with fallback', async () => {
      const cacheError = new Error('Cache failed');
      const mockCacheUseCase = {
        execute: jest.fn().mockRejectedValue(cacheError),
      };
      MockLoadTranscriptionsFromCache.mockImplementation(() => mockCacheUseCase as any);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      // Should fall back to legacy loading
      expect(mockTranscriptionService.loadAll).toHaveBeenCalled();
      expect(result).toBe(mockTranscriptionModels);
    });

    it('should handle complete failure gracefully', async () => {
      const cacheError = new Error('Cache failed');
      const fallbackError = new Error('Fallback failed');
      
      const mockCacheUseCase = {
        execute: jest.fn().mockRejectedValue(cacheError),
      };
      MockLoadTranscriptionsFromCache.mockImplementation(() => mockCacheUseCase as any);
      mockTranscriptionService.loadAll.mockRejectedValue(fallbackError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('Fallback failed');
      
      expect(mockStore.setError).toHaveBeenCalledWith('Fallback failed');
    });
  });

  describe('integration scenarios', () => {
    it('should complete successful two-stage flow with console logging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 LoadTranscriptions use-case executing (two-stage loading)...');
      expect(consoleSpy).toHaveBeenCalledWith('⚡ Stage 1: Loading from cache...');
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Stage 2: Syncing latest changes...');
      expect(result).toBe(mockTranscriptionModels);
      
      consoleSpy.mockRestore();
    });

    it('should handle concurrent executions with two-stage loading', async () => {
      const config = { services, store: mockStore };
      const useCase1 = new LoadTranscriptions(config);
      const useCase2 = new LoadTranscriptions(config);
      
      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute(),
      ]);
      
      expect(result1).toBe(mockTranscriptionModels);
      expect(result2).toBe(mockTranscriptionModels);
      expect(MockLoadTranscriptionsFromCache).toHaveBeenCalledTimes(2);
      expect(MockSyncLatestTranscriptions).toHaveBeenCalledTimes(2);
    });
  });

  describe('store interaction', () => {
    it('should use store state for final result', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(mockUseTranscriptionsStore.getState).toHaveBeenCalled();
      expect(result).toBe(mockTranscriptionModels);
    });

    it('should handle store access errors gracefully', async () => {
      const storeError = new Error('Store access failed');
      mockUseTranscriptionsStore.getState.mockImplementation(() => {
        throw storeError;
      });
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      // Should fall back to legacy loading when store access fails
      const result = await useCase.execute();
      expect(result).toBe(mockTranscriptionModels);
    });
  });

  describe('two-stage loading', () => {
    it('should execute cache loading first, then background sync', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(MockLoadTranscriptionsFromCache).toHaveBeenCalledWith(config);
      expect(MockSyncLatestTranscriptions).toHaveBeenCalledWith({
        ...config,
        sinceTimestamp: '2023-01-01T00:00:00.000Z',
        isFullSync: false
      });
      expect(result).toBe(mockTranscriptionModels);
    });

    it('should handle full sync when cache is empty', async () => {
      const emptyCacheResult = {
        transcriptions: [],
        cacheStats: { count: 0, lastSyncedAt: null }
      };
      
      const mockCacheUseCase = {
        execute: jest.fn().mockResolvedValue(emptyCacheResult),
      };
      MockLoadTranscriptionsFromCache.mockImplementation(() => mockCacheUseCase as any);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await useCase.execute();
      
      expect(MockSyncLatestTranscriptions).toHaveBeenCalledWith({
        ...config,
        sinceTimestamp: undefined,
        isFullSync: true
      });
    });

    it('should return cached transcriptions immediately', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(mockUseTranscriptionsStore.getState).toHaveBeenCalled();
      expect(result).toBe(mockTranscriptionModels);
    });

    it('should handle background sync errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockSyncUseCase = {
        execute: jest.fn().mockRejectedValue(new Error('Sync failed')),
      };
      MockSyncLatestTranscriptions.mockImplementation(() => mockSyncUseCase as any);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      // Should not throw despite background sync error
      const result = await useCase.execute();
      
      expect(result).toBe(mockTranscriptionModels);
      expect(consoleSpy).toHaveBeenCalledWith('❌ Background sync failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should fall back to legacy loading if two-stage fails', async () => {
      const mockCacheUseCase = {
        execute: jest.fn().mockRejectedValue(new Error('Cache failed')),
      };
      MockLoadTranscriptionsFromCache.mockImplementation(() => mockCacheUseCase as any);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(mockTranscriptionService.loadAll).toHaveBeenCalled();
      expect(mockStore.setTranscriptions).toHaveBeenCalledWith(mockTranscriptionModels);
      expect(result).toBe(mockTranscriptionModels);
    });

    it('should log appropriate messages for two-stage loading', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 LoadTranscriptions use-case executing (two-stage loading)...');
      expect(consoleSpy).toHaveBeenCalledWith('⚡ Stage 1: Loading from cache...');
      expect(consoleSpy).toHaveBeenCalledWith('🔄 Stage 2: Syncing latest changes...');
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ LoadTranscriptions use-case completed: 2 transcriptions loaded (2 from cache, sync running in background)'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle fallback errors properly', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const cacheError = new Error('Cache failed');
      const fallbackError = new Error('Fallback failed');
      
      const mockCacheUseCase = {
        execute: jest.fn().mockRejectedValue(cacheError),
      };
      MockLoadTranscriptionsFromCache.mockImplementation(() => mockCacheUseCase as any);
      mockTranscriptionService.loadAll.mockRejectedValue(fallbackError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('Fallback failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ LoadTranscriptions use-case failed:', cacheError);
      expect(consoleLogSpy).toHaveBeenCalledWith('🔄 Falling back to legacy single-stage loading...');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Fallback loading also failed:', fallbackError);
      expect(mockStore.setError).toHaveBeenCalledWith('Fallback failed');
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
}); 