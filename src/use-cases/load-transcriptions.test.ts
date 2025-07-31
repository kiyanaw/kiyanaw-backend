import { LoadTranscriptions } from './load-transcriptions';
import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

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
    }),
  ];

  const mockTranscriptionService = services.transcriptionService as jest.Mocked<typeof services.transcriptionService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful response
    mockTranscriptionService.loadAll.mockResolvedValue(mockTranscriptionModels);
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

    it('should call transcriptionService.loadAll', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockTranscriptionService.loadAll).toHaveBeenCalledTimes(1);
      expect(mockTranscriptionService.loadAll).toHaveBeenCalledWith();
    });

    it('should update store with loaded transcriptions', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.setTranscriptions).toHaveBeenCalledTimes(1);
      expect(mockStore.setTranscriptions).toHaveBeenCalledWith(mockTranscriptionModels);
    });

    it('should return loaded transcriptions', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(result).toBe(mockTranscriptionModels);
      expect(result).toHaveLength(2);
    });

    it('should handle empty transcriptions list', async () => {
      const emptyTranscriptions: TranscriptionModel[] = [];
      mockTranscriptionService.loadAll.mockResolvedValue(emptyTranscriptions);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(result).toEqual([]);
      expect(mockStore.setTranscriptions).toHaveBeenCalledWith([]);
    });

    it('should handle large numbers of transcriptions', async () => {
      const manyTranscriptions = Array.from({ length: 100 }, (_, i) => 
        new TranscriptionModel({
          id: `transcription-${i}`,
          title: `Transcription ${i}`,
          author: 'user',
          authorFriendly: 'User',
          type: 'audio',
          source: `https://example.com/audio${i}.mp3`,
          length: 120,
        })
      );
      mockTranscriptionService.loadAll.mockResolvedValue(manyTranscriptions);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(result).toHaveLength(100);
      expect(mockStore.setTranscriptions).toHaveBeenCalledWith(manyTranscriptions);
    });
  });

  describe('error handling', () => {
    it('should propagate validation errors', async () => {
      const config = { services: undefined as any, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('services are required');
      
      expect(mockTranscriptionService.loadAll).not.toHaveBeenCalled();
      expect(mockStore.setTranscriptions).not.toHaveBeenCalled();
    });

    it('should handle transcriptionService.loadAll errors', async () => {
      const serviceError = new Error('GraphQL connection failed');
      mockTranscriptionService.loadAll.mockRejectedValue(serviceError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('GraphQL connection failed');
      
      expect(mockStore.setError).toHaveBeenCalledWith('GraphQL connection failed');
      expect(mockStore.setTranscriptions).not.toHaveBeenCalled();
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      mockTranscriptionService.loadAll.mockRejectedValue(timeoutError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('Network timeout');
      
      expect(mockStore.setError).toHaveBeenCalledWith('Network timeout');
    });

    it('should handle authorization errors', async () => {
      const authError = new Error('Access denied');
      mockTranscriptionService.loadAll.mockRejectedValue(authError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('Access denied');
      
      expect(mockStore.setError).toHaveBeenCalledWith('Access denied');
    });

    it('should handle unknown errors gracefully', async () => {
      const unknownError = 'Something went wrong';
      mockTranscriptionService.loadAll.mockRejectedValue(unknownError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toBe(unknownError);
      
      expect(mockStore.setError).toHaveBeenCalledWith('Failed to load transcriptions');
    });

    it('should not update store with transcriptions on error', async () => {
      const serviceError = new Error('Service failed');
      mockTranscriptionService.loadAll.mockRejectedValue(serviceError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      try {
        await useCase.execute();
      } catch {
        // Expected to throw
      }
      
      expect(mockStore.setTranscriptions).not.toHaveBeenCalled();
      expect(mockStore.setError).toHaveBeenCalledWith('Service failed');
    });
  });

  describe('integration scenarios', () => {
    it('should complete successful flow with console logging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      const result = await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 LoadTranscriptions use-case executing...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ LoadTranscriptions use-case completed: 2 transcriptions loaded');
      expect(result).toBe(mockTranscriptionModels);
      
      consoleSpy.mockRestore();
    });

    it('should handle error flow with console logging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const serviceError = new Error('Test error');
      mockTranscriptionService.loadAll.mockRejectedValue(serviceError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      try {
        await useCase.execute();
      } catch {
        // Expected to throw
      }
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ LoadTranscriptions use-case failed:', serviceError);
      
      consoleSpy.mockRestore();
    });

    it('should work with different store implementations', async () => {
      const customStore = {
        setTranscriptions: jest.fn(),
        setError: jest.fn(),
        customMethod: jest.fn(),
      };
      
      const config = { services, store: customStore };
      const useCase = new LoadTranscriptions(config);
      
      await useCase.execute();
      
      expect(customStore.setTranscriptions).toHaveBeenCalledWith(mockTranscriptionModels);
      expect(customStore.setError).not.toHaveBeenCalled();
    });

    it('should handle concurrent executions', async () => {
      const config = { services, store: mockStore };
      const useCase1 = new LoadTranscriptions(config);
      const useCase2 = new LoadTranscriptions(config);
      
      const [result1, result2] = await Promise.all([
        useCase1.execute(),
        useCase2.execute(),
      ]);
      
      expect(result1).toBe(mockTranscriptionModels);
      expect(result2).toBe(mockTranscriptionModels);
      expect(mockTranscriptionService.loadAll).toHaveBeenCalledTimes(2);
      expect(mockStore.setTranscriptions).toHaveBeenCalledTimes(2);
    });
  });

  describe('store interaction', () => {
    it('should call store methods in correct order on success', async () => {
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await useCase.execute();
      
      expect(mockStore.setTranscriptions).toHaveBeenCalledWith(mockTranscriptionModels);
      expect(mockStore.setError).not.toHaveBeenCalled();
    });

    it('should call store error method on failure', async () => {
      const serviceError = new Error('Service error');
      mockTranscriptionService.loadAll.mockRejectedValue(serviceError);
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      try {
        await useCase.execute();
      } catch {
        // Expected to throw
      }
      
      expect(mockStore.setError).toHaveBeenCalledWith('Service error');
      expect(mockStore.setTranscriptions).not.toHaveBeenCalled();
    });

    it('should handle store method failures gracefully', async () => {
      mockStore.setTranscriptions.mockImplementation(() => {
        throw new Error('Store update failed');
      });
      
      const config = { services, store: mockStore };
      const useCase = new LoadTranscriptions(config);
      
      await expect(useCase.execute()).rejects.toThrow('Store update failed');
      
      expect(mockTranscriptionService.loadAll).toHaveBeenCalled();
    });
  });
}); 