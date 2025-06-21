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
      seekToRegion: jest.fn(),
    },
    browserService: {
      getRegionIdFromUrl: jest.fn(),
      setSelectedRegion: jest.fn(),
    },
    spellCheckerService: {
      addKnownWords: jest.fn(),
    },
  },
}));

describe('LoadTranscription', () => {
  const mockTranscriptionId = 'test-transcription-id';
  const mockUser = { username: 'test-user', id: 'user-123' };
  const mockStore = {
    setFullTranscriptionData: jest.fn(),
    addKnownWords: jest.fn(),
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

  let useCase: LoadTranscription;

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
    (services.wavesurferService.seekToRegion as jest.Mock).mockImplementation(() => {});
    (services.browserService.getRegionIdFromUrl as jest.Mock).mockReturnValue(null);

    useCase = new LoadTranscription({
      transcriptionId: mockTranscriptionId,
      services: services,
      store: mockStore
    });
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
      expect((useCase as any).config.transcriptionId).toBe(mockConfig.transcriptionId);
      expect((useCase as any).config.services).toBe(services);
      expect((useCase as any).config.store).toBe(mockStore);
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
      expect(typeof useCase.validate).toBe('function');
      expect(useCase.validate.length).toBe(0); // Should accept 0 parameters
    });

    it('should pass validation with valid transcriptionId', () => {
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
      expect(typeof useCase.execute).toBe('function');
      expect(useCase.execute.length).toBe(0); // Should accept 0 parameters
    });

    it('should be an async method', () => {
      const result = useCase.execute();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should call validate first', async () => {
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should load transcription data through transcriptionService', async () => {
      await useCase.execute();
      
      expect(services.transcriptionService.loadInFull).toHaveBeenCalledWith(mockTranscriptionId);
    });

    it('should set transcription data in store', async () => {
      await useCase.execute();
      
      expect(mockStore.setFullTranscriptionData).toHaveBeenCalledWith(mockTranscriptionData, null);
    });

    it('should load wavesurfer with source and peaks', async () => {
      await useCase.execute();
      
      expect(services.wavesurferService.load).toHaveBeenCalledWith(
        mockTranscriptionData.transcription.source,
        mockTranscriptionData.peaks
      );
    });

    it('should set regions in wavesurfer', async () => {
      await useCase.execute();
      
      expect(services.wavesurferService.setRegions).toHaveBeenCalledWith(mockTranscriptionData.regions);
    });



    it('should execute all steps successfully', async () => {
      await useCase.execute();
      
      // Verify all methods were called
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
        await useCase.execute();
        
        // Verify all services were called
        expect(services.transcriptionService.loadInFull).toHaveBeenCalled();
        expect(mockStore.setFullTranscriptionData).toHaveBeenCalled();
        expect(services.wavesurferService.load).toHaveBeenCalled();
        expect(services.wavesurferService.setRegions).toHaveBeenCalled();
      });

      it('should handle URL region selection when regionId is present', async () => {
        const selectedRegionId = 'region-1';
        (services.browserService.getRegionIdFromUrl as jest.Mock).mockReturnValue(selectedRegionId);
        const useCase = new LoadTranscription(mockConfig);
        
        await useCase.execute();
        
        // Should call browserService to get regionId
        expect(services.browserService.getRegionIdFromUrl).toHaveBeenCalled();
        
        // Should pass regionId to store
        expect(mockStore.setFullTranscriptionData).toHaveBeenCalledWith(mockTranscriptionData, selectedRegionId);
        
        // Should seek to the region's start time
        expect(services.wavesurferService.seekToRegion).toHaveBeenCalledWith({ id: 'region-1', start: 10, end: 20 }); // region-1 starts at 10
        
        // Should apply selected region styling
        expect(services.browserService.setSelectedRegion).toHaveBeenCalledWith(selectedRegionId);
      });

      it('should handle when no regionId is in URL', async () => {
        (services.browserService.getRegionIdFromUrl as jest.Mock).mockReturnValue(null);
        const useCase = new LoadTranscription(mockConfig);
        
        await useCase.execute();
        
        // Should call browserService to get regionId
        expect(services.browserService.getRegionIdFromUrl).toHaveBeenCalled();
        
        // Should pass null to store
        expect(mockStore.setFullTranscriptionData).toHaveBeenCalledWith(mockTranscriptionData, null);
        
        // Should not seek
        expect(services.wavesurferService.seekToRegion).not.toHaveBeenCalled();
        
        // Should not apply selected region styling
        expect(services.browserService.setSelectedRegion).not.toHaveBeenCalled();
      });
      
      it('should not apply styling when regionId is not found in regions', async () => {
        const unknownRegionId = 'unknown-region';
        (services.browserService.getRegionIdFromUrl as jest.Mock).mockReturnValue(unknownRegionId);
        const useCase = new LoadTranscription(mockConfig);
        
        await useCase.execute();
        
        // Should call browserService to get regionId
        expect(services.browserService.getRegionIdFromUrl).toHaveBeenCalled();
        
        // Should still pass regionId to store
        expect(mockStore.setFullTranscriptionData).toHaveBeenCalledWith(mockTranscriptionData, unknownRegionId);
        
        // Should not seek since region was not found
        expect(services.wavesurferService.seekToRegion).not.toHaveBeenCalled();
        
        // Should not apply selected region styling since region was not found
        expect(services.browserService.setSelectedRegion).not.toHaveBeenCalled();
      });
    });
  });

  describe('extractKnownWordsFromRegions', () => {
    it('should extract known words from regions with regionAnalysis', async () => {
      const mockData = {
        transcription: { source: 'test.mp4' },
        peaks: [],
        regions: [
          {
            id: 'region1',
            regionAnalysis: ['itwêw', 'êkwa']
          },
          {
            id: 'region2',
            regionAnalysis: ['tâpwê', 'itwêw'] // duplicate should be deduplicated
          },
          {
            id: 'region3',
            // no regionAnalysis
          },
          {
            id: 'region4',
            regionAnalysis: [] // empty array
          }
        ],
        issues: []
      };

             (services.transcriptionService.loadInFull as jest.Mock).mockResolvedValue(mockData);
       (services.browserService.getRegionIdFromUrl as jest.Mock).mockReturnValue(null);

       await useCase.execute();

       // Verify spell checker service was called with deduplicated known words
       expect(services.spellCheckerService.addKnownWords).toHaveBeenCalledWith([
         'itwêw', 'êkwa', 'tâpwê'
       ]);

      // Verify store was updated with known words
      expect(mockStore.addKnownWords).toHaveBeenCalledWith([
        'itwêw', 'êkwa', 'tâpwê'
      ]);
    });

    it('should not call spell checker when no known words exist', async () => {
      const mockData = {
        transcription: { source: 'test.mp4' },
        peaks: [],
        regions: [
          { id: 'region1' }, // no regionAnalysis
          { id: 'region2', regionAnalysis: [] } // empty array
        ],
        issues: []
      };

             (services.transcriptionService.loadInFull as jest.Mock).mockResolvedValue(mockData);
       (services.browserService.getRegionIdFromUrl as jest.Mock).mockReturnValue(null);

       await useCase.execute();

       // Should not call spell checker or store when no known words
       expect(services.spellCheckerService.addKnownWords).not.toHaveBeenCalled();
      expect(mockStore.addKnownWords).not.toHaveBeenCalled();
    });

    it('should handle regions with non-array regionAnalysis gracefully', async () => {
      const mockData = {
        transcription: { source: 'test.mp4' },
        peaks: [],
        regions: [
          {
            id: 'region1',
            regionAnalysis: 'not-an-array' // Invalid data
          },
          {
            id: 'region2',
            regionAnalysis: ['valid', 'words']
          }
        ],
        issues: []
      };

             (services.transcriptionService.loadInFull as jest.Mock).mockResolvedValue(mockData);
       (services.browserService.getRegionIdFromUrl as jest.Mock).mockReturnValue(null);

       await useCase.execute();

       // Should only extract from valid arrays
       expect(services.spellCheckerService.addKnownWords).toHaveBeenCalledWith([
         'valid', 'words'
       ]);
    });
  });
}); 