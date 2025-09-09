import { LoadTranscriptionsFromCache } from './load-transcriptions-from-cache';
import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

// Mock the services
jest.mock('../services', () => ({
  services: {
    transcriptionService: {
      loadFromCache: jest.fn(),
      getCacheStats: jest.fn(),
    },
  },
}));

// Mock the ADT
jest.mock('../services/adt', () => ({
  TranscriptionModel: jest.fn(),
}));

describe('LoadTranscriptionsFromCache', () => {
  const mockStore = {
    setTranscriptions: jest.fn(),
    updateCacheStats: jest.fn(),
  };

  const mockTranscriptionModels = [
    new TranscriptionModel({
      id: 'transcription-1',
      title: 'Cached Transcription',
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
    mockTranscriptionService.loadFromCache.mockResolvedValue(mockTranscriptionModels);
    mockTranscriptionService.getCacheStats.mockResolvedValue(mockCacheStats);
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      expect(useCase).toBeInstanceOf(LoadTranscriptionsFromCache);
    });
  });

  describe('validate', () => {
    it('should not throw error with valid config', () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error when services is missing', () => {
      const config = { services: undefined as any, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      expect(() => useCase.validate()).toThrow('services are required');
    });

    it('should throw error when store is missing', () => {
      const config = { services, store: undefined as any };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      expect(() => useCase.validate()).toThrow('store is required');
    });
  });

  describe('execute', () => {
    it('should call validate before proceeding', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should call loadFromCache and getCacheStats', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      await useCase.execute();
      
      expect(mockTranscriptionService.loadFromCache).toHaveBeenCalledTimes(1);
      expect(mockTranscriptionService.getCacheStats).toHaveBeenCalledTimes(1);
    });

    it('should update store with cached transcriptions and stats', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      await useCase.execute();
      
      expect(mockStore.setTranscriptions).toHaveBeenCalledWith(mockTranscriptionModels);
      expect(mockStore.updateCacheStats).toHaveBeenCalledWith(mockCacheStats);
    });

    it('should return transcriptions and cache stats', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      const result = await useCase.execute();
      
      expect(result).toEqual({
        transcriptions: mockTranscriptionModels,
        cacheStats: mockCacheStats
      });
    });

    it('should handle empty cache gracefully', async () => {
      const emptyTranscriptions: TranscriptionModel[] = [];
      const emptyCacheStats = { count: 0, lastSyncedAt: null };
      
      mockTranscriptionService.loadFromCache.mockResolvedValue(emptyTranscriptions);
      mockTranscriptionService.getCacheStats.mockResolvedValue(emptyCacheStats);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      const result = await useCase.execute();
      
      expect(result).toEqual({
        transcriptions: [],
        cacheStats: emptyCacheStats
      });
      expect(mockStore.setTranscriptions).toHaveBeenCalledWith([]);
      expect(mockStore.updateCacheStats).toHaveBeenCalledWith(emptyCacheStats);
    });

    it('should handle cache errors gracefully', async () => {
      const cacheError = new Error('Cache read failed');
      mockTranscriptionService.loadFromCache.mockRejectedValue(cacheError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      const result = await useCase.execute();
      
      expect(result).toEqual({
        transcriptions: [],
        cacheStats: { count: 0, lastSyncedAt: null }
      });
      expect(mockStore.updateCacheStats).toHaveBeenCalledWith({ count: 0, lastSyncedAt: null });
    });

    it('should log success messages', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('⚡ LoadTranscriptionsFromCache use-case executing...');
      expect(consoleSpy).toHaveBeenCalledWith('⚡ LoadTranscriptionsFromCache completed: 1 transcriptions from cache');
      
      consoleSpy.mockRestore();
    });

    it('should log error messages on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const cacheError = new Error('Cache error');
      mockTranscriptionService.loadFromCache.mockRejectedValue(cacheError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptionsFromCache(config);
      
      await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ LoadTranscriptionsFromCache use-case failed:', cacheError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('concurrent execution', () => {
    it('should handle concurrent cache loads', async () => {
      const config = { services, store: mockStore };
      const useCase1 = new LoadTranscriptionsFromCache(config);
      const useCase2 = new LoadTranscriptionsFromCache(config);
      
      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute(),
      ]);
      
      expect(result1).toEqual({
        transcriptions: mockTranscriptionModels,
        cacheStats: mockCacheStats
      });
      expect(result2).toEqual({
        transcriptions: mockTranscriptionModels,
        cacheStats: mockCacheStats
      });
      expect(mockTranscriptionService.loadFromCache).toHaveBeenCalledTimes(2);
      expect(mockStore.setTranscriptions).toHaveBeenCalledTimes(2);
    });
  });
});
