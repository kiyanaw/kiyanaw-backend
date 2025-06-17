import { LoadTranscription } from './load-transcription';
import { services } from '../services';

// Mock the services
jest.mock('../services', () => ({
  services: {
    authService: {
      currentUser: jest.fn(),
    },
    transcriptionService: {
      loadInFull: jest.fn(),
    },
    wavesurferService: {
      load: jest.fn(),
      setRegions: jest.fn(),
    },
  },
}));

describe('LoadTranscription', () => {
  const mockTranscriptionId = 'test-transcription-id';
  const mockUser = { username: 'test-user', id: 'user-123' };
  const mockStore = {
    setFullTranscriptionData: jest.fn(),
  };
  const mockTranscriptionData = {
    transcription: {
      id: mockTranscriptionId,
      title: 'Test Transcription',
      source: 'test-audio.mp3',
    },
    peaks: [0.1, 0.2, 0.3, 0.4],
    regions: [
      { id: 'region-1', start: 10, end: 20 },
      { id: 'region-2', start: 25, end: 35 },
    ],
  };

  const mockConfig = {
    transcriptionId: mockTranscriptionId,
    services,
    store: mockStore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console.log to avoid output during tests
    jest.spyOn(console, 'log').mockImplementation();
    
    // Reset all mock implementations to clean state
    mockStore.setFullTranscriptionData.mockImplementation(() => {});
    
    // Setup default mocks
    (services.authService.currentUser as jest.Mock).mockReturnValue(mockUser);
    (services.transcriptionService.loadInFull as jest.Mock).mockResolvedValue(mockTranscriptionData);
    (services.wavesurferService.load as jest.Mock).mockImplementation(() => {});
    (services.wavesurferService.setRegions as jest.Mock).mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should have correct constructor signature', () => {
      expect(typeof LoadTranscription).toBe('function');
      expect(LoadTranscription.length).toBe(1); // Should accept 1 parameter
    });

    it('should store config correctly', () => {
      const useCase = new LoadTranscription(mockConfig);
      
      expect((useCase as any).config).toBe(mockConfig);
    });

    it('should accept config with all required properties', () => {
      expect(() => new LoadTranscription(mockConfig)).not.toThrow();
    });

    it('should handle different transcriptionIds', () => {
      const configWithDifferentId = {
        ...mockConfig,
        transcriptionId: 'different-id-123',
      };
      
      const useCase = new LoadTranscription(configWithDifferentId);
      expect((useCase as any).config.transcriptionId).toBe('different-id-123');
    });

    it('should handle different service configurations', () => {
      const customServices = { ...services };
      const configWithCustomServices = {
        ...mockConfig,
        services: customServices,
      };
      
      const useCase = new LoadTranscription(configWithCustomServices);
      expect((useCase as any).config.services).toBe(customServices);
    });

    it('should handle different store implementations', () => {
      const customStore = { setFullTranscriptionData: jest.fn() };
      const configWithCustomStore = {
        ...mockConfig,
        store: customStore,
      };
      
      const useCase = new LoadTranscription(configWithCustomStore);
      expect((useCase as any).config.store).toBe(customStore);
    });
  });

  describe('validate', () => {
    it('should have correct method signature', () => {
      const useCase = new LoadTranscription(mockConfig);
      expect(typeof useCase.validate).toBe('function');
      expect(useCase.validate.length).toBe(0); // Should accept 0 parameters
    });

    it('should pass validation with valid transcriptionId', () => {
      const useCase = new LoadTranscription(mockConfig);
      
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error when transcriptionId is empty string', () => {
      const configWithEmptyId = { ...mockConfig, transcriptionId: '' };
      const useCase = new LoadTranscription(configWithEmptyId);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });

    it('should throw error when transcriptionId is whitespace only', () => {
      const configWithWhitespaceId = { ...mockConfig, transcriptionId: '   ' };
      const useCase = new LoadTranscription(configWithWhitespaceId);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });

    it('should throw error when transcriptionId is null', () => {
      const configWithNullId = { ...mockConfig, transcriptionId: null as any };
      const useCase = new LoadTranscription(configWithNullId);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });

    it('should throw error when transcriptionId is undefined', () => {
      const configWithUndefinedId = { ...mockConfig, transcriptionId: undefined as any };
      const useCase = new LoadTranscription(configWithUndefinedId);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });
  });

  describe('execute', () => {
    it('should have correct method signature', () => {
      const useCase = new LoadTranscription(mockConfig);
      expect(typeof useCase.execute).toBe('function');
      expect(useCase.execute.length).toBe(0); // Should accept 0 parameters
    });

    it('should be an async method', () => {
      const useCase = new LoadTranscription(mockConfig);
      const result = useCase.execute();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should call validate first', async () => {
      const useCase = new LoadTranscription(mockConfig);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should load transcription data through transcriptionService', async () => {
      const useCase = new LoadTranscription(mockConfig);
      
      await useCase.execute();
      
      expect(services.transcriptionService.loadInFull).toHaveBeenCalledWith(mockTranscriptionId);
    });

    it('should set transcription data in store', async () => {
      const useCase = new LoadTranscription(mockConfig);
      
      await useCase.execute();
      
      expect(mockStore.setFullTranscriptionData).toHaveBeenCalledWith(mockTranscriptionData);
    });

    it('should load wavesurfer with source and peaks', async () => {
      const useCase = new LoadTranscription(mockConfig);
      
      await useCase.execute();
      
      expect(services.wavesurferService.load).toHaveBeenCalledWith(
        mockTranscriptionData.transcription.source,
        mockTranscriptionData.peaks
      );
    });

    it('should set regions in wavesurfer', async () => {
      const useCase = new LoadTranscription(mockConfig);
      
      await useCase.execute();
      
      expect(services.wavesurferService.setRegions).toHaveBeenCalledWith(mockTranscriptionData.regions);
    });

    it('should log successful data loading', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const useCase = new LoadTranscription(mockConfig);
      
      await useCase.execute();
      
      expect(consoleSpy).toHaveBeenCalledWith('>>> loaded in full');
    });

    it('should execute all steps successfully', async () => {
      const useCase = new LoadTranscription(mockConfig);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      // Verify all methods were called
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(services.transcriptionService.loadInFull).toHaveBeenCalledTimes(1);
      expect(mockStore.setFullTranscriptionData).toHaveBeenCalledTimes(1);
      expect(services.wavesurferService.load).toHaveBeenCalledTimes(1);
      expect(services.wavesurferService.setRegions).toHaveBeenCalledTimes(1);
    });

    describe('error handling', () => {
      it('should propagate validation errors', async () => {
        const configWithInvalidId = { ...mockConfig, transcriptionId: '' };
        const useCase = new LoadTranscription(configWithInvalidId);
        
        await expect(useCase.execute()).rejects.toThrow('transcriptionId is required and cannot be empty');
      });

      it('should propagate transcriptionService errors', async () => {
        const serviceError = new Error('Failed to load transcription');
        (services.transcriptionService.loadInFull as jest.Mock).mockRejectedValue(serviceError);
        const useCase = new LoadTranscription(mockConfig);
        
        await expect(useCase.execute()).rejects.toThrow('Failed to load transcription');
      });

      it('should propagate store errors', async () => {
        const storeError = new Error('Failed to set transcription data');
        mockStore.setFullTranscriptionData.mockImplementation(() => {
          throw storeError;
        });
        const useCase = new LoadTranscription(mockConfig);
        
        await expect(useCase.execute()).rejects.toThrow('Failed to set transcription data');
      });

      it('should propagate wavesurfer load errors', async () => {
        const wavesurferError = new Error('Failed to load wavesurfer');
        (services.wavesurferService.load as jest.Mock).mockImplementation(() => {
          throw wavesurferError;
        });
        const useCase = new LoadTranscription(mockConfig);
        
        await expect(useCase.execute()).rejects.toThrow('Failed to load wavesurfer');
      });

      it('should propagate wavesurfer setRegions errors', async () => {
        const regionsError = new Error('Failed to set regions');
        (services.wavesurferService.setRegions as jest.Mock).mockImplementation(() => {
          throw regionsError;
        });
        const useCase = new LoadTranscription(mockConfig);
        
        await expect(useCase.execute()).rejects.toThrow('Failed to set regions');
      });
    });

    describe('integration scenarios', () => {
      it('should handle transcription data without peaks', async () => {
        const dataWithoutPeaks = { ...mockTranscriptionData, peaks: undefined };
        (services.transcriptionService.loadInFull as jest.Mock).mockResolvedValue(dataWithoutPeaks);
        const useCase = new LoadTranscription(mockConfig);
        
        await useCase.execute();
        
        expect(services.wavesurferService.load).toHaveBeenCalledWith(
          mockTranscriptionData.transcription.source,
          undefined
        );
      });

      it('should handle transcription data without regions', async () => {
        const dataWithoutRegions = { ...mockTranscriptionData, regions: undefined };
        (services.transcriptionService.loadInFull as jest.Mock).mockResolvedValue(dataWithoutRegions);
        const useCase = new LoadTranscription(mockConfig);
        
        await useCase.execute();
        
        expect(services.wavesurferService.setRegions).toHaveBeenCalledWith(undefined);
      });

      it('should handle empty regions array', async () => {
        const dataWithEmptyRegions = { ...mockTranscriptionData, regions: [] };
        (services.transcriptionService.loadInFull as jest.Mock).mockResolvedValue(dataWithEmptyRegions);
        const useCase = new LoadTranscription(mockConfig);
        
        await useCase.execute();
        
        expect(services.wavesurferService.setRegions).toHaveBeenCalledWith([]);
      });

      it('should handle different audio source formats', async () => {
        const dataWithDifferentSource = {
          ...mockTranscriptionData,
          transcription: { ...mockTranscriptionData.transcription, source: 'test-audio.wav' },
        };
        (services.transcriptionService.loadInFull as jest.Mock).mockResolvedValue(dataWithDifferentSource);
        const useCase = new LoadTranscription(mockConfig);
        
        await useCase.execute();
        
        expect(services.wavesurferService.load).toHaveBeenCalledWith('test-audio.wav', mockTranscriptionData.peaks);
      });

      it('should handle complete successful flow', async () => {
        const useCase = new LoadTranscription(mockConfig);
        
        await expect(useCase.execute()).resolves.toBeUndefined();
        
        // Verify all services were called
        expect(services.transcriptionService.loadInFull).toHaveBeenCalled();
        expect(mockStore.setFullTranscriptionData).toHaveBeenCalled();
        expect(services.wavesurferService.load).toHaveBeenCalled();
        expect(services.wavesurferService.setRegions).toHaveBeenCalled();
      });
    });
  });
}); 