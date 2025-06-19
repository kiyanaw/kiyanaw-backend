import { PlayRegion } from './play-region';

// Mock the services
jest.mock('../services', () => ({
  services: {
    wavesurferService: {
      seekToTime: jest.fn(),
      play: jest.fn(),
    },
    browserService: {
      updateUrl: jest.fn(),
    },
  },
}));

describe('PlayRegion', () => {
  const mockSeekToTime = jest.fn();
  const mockPlay = jest.fn();
  const mockRegionById = jest.fn();
  const mockUpdateUrl = jest.fn();

  const mockServices = {
    wavesurferService: {
      seekToTime: mockSeekToTime,
      play: mockPlay,
    },
    browserService: {
      updateUrl: mockUpdateUrl,
    },
  };

  const mockStore = {
    regionById: mockRegionById,
    setPlaying: jest.fn(),
    transcription: {
      id: 'transcription-123',
      title: 'Test Transcription',
    },
  };

  const mockRegion = {
    id: 'region-123',
    start: 5.5,
    end: 12.3,
    text: 'Sample region text',
  };

  const validConfig = {
    regionId: 'region-123',
    services: mockServices as any,
    store: mockStore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRegionById.mockReturnValue(mockRegion);
    mockPlay.mockResolvedValue(undefined);
    mockSeekToTime.mockImplementation(() => {});
    mockUpdateUrl.mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('should create instance with provided config', () => {
      const useCase = new PlayRegion(validConfig);
      expect(useCase).toBeInstanceOf(PlayRegion);
    });

    it('should store config correctly', () => {
      const useCase = new PlayRegion(validConfig);
      expect((useCase as any).config).toBe(validConfig);
    });

    it('should handle different regionIds', () => {
      const configWithDifferentId = {
        ...validConfig,
        regionId: 'different-region-456',
      };
      
      const useCase = new PlayRegion(configWithDifferentId);
      expect((useCase as any).config.regionId).toBe('different-region-456');
    });
  });

  describe('validate', () => {
    it('should pass validation with valid regionId', () => {
      const useCase = new PlayRegion(validConfig);
      
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error when regionId is empty string', () => {
      const config = { ...validConfig, regionId: '' };
      const useCase = new PlayRegion(config);
      
      expect(() => useCase.validate()).toThrow('regionId is required');
    });

    it('should throw error when regionId is null', () => {
      const config = { ...validConfig, regionId: null as any };
      const useCase = new PlayRegion(config);
      
      expect(() => useCase.validate()).toThrow('regionId is required');
    });

    it('should throw error when regionId is undefined', () => {
      const config = { ...validConfig, regionId: undefined as any };
      const useCase = new PlayRegion(config);
      
      expect(() => useCase.validate()).toThrow('regionId is required');
    });
  });

  describe('execute', () => {
    it('should be an async method', () => {
      const useCase = new PlayRegion(validConfig);
      const result = useCase.execute();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should call validate first', async () => {
      const useCase = new PlayRegion(validConfig);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should get region from store using regionById', async () => {
      const useCase = new PlayRegion(validConfig);
      
      await useCase.execute();
      
      expect(mockRegionById).toHaveBeenCalledWith(validConfig.regionId);
    });

    it('should throw error when region is not found', async () => {
      mockRegionById.mockReturnValue(null);
      const useCase = new PlayRegion(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(`Region with id ${validConfig.regionId} not found`);
    });

    it('should seek to region start time', async () => {
      const useCase = new PlayRegion(validConfig);
      
      await useCase.execute();
      
      expect(mockSeekToTime).toHaveBeenCalledWith(mockRegion.start);
    });

    it('should call wavesurfer play', async () => {
      const useCase = new PlayRegion(validConfig);
      
      await useCase.execute();
      
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('should update URL with transcription and region IDs', async () => {
      const useCase = new PlayRegion(validConfig);
      
      await useCase.execute();
      
      expect(mockUpdateUrl).toHaveBeenCalledWith('/transcribe-edit/transcription-123/region-123');
    });

    it('should not update URL when transcription is missing', async () => {
      const storeWithoutTranscription = { ...mockStore, transcription: null };
      const configWithoutTranscription = { ...validConfig, store: storeWithoutTranscription };
      const useCase = new PlayRegion(configWithoutTranscription);
      
      await useCase.execute();
      
      expect(mockUpdateUrl).not.toHaveBeenCalled();
    });

    it('should not update URL when transcription ID is missing', async () => {
      const storeWithIncompleteTranscription = { 
        ...mockStore, 
        transcription: { title: 'Test' } 
      };
      const configWithIncompleteTranscription = { 
        ...validConfig, 
        store: storeWithIncompleteTranscription 
      };
      const useCase = new PlayRegion(configWithIncompleteTranscription);
      
      await useCase.execute();
      
      expect(mockUpdateUrl).not.toHaveBeenCalled();
    });

    it('should execute in correct order: validate -> get region -> update URL -> seek -> play', async () => {
      const useCase = new PlayRegion(validConfig);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      const validateCallOrder = validateSpy.mock.invocationCallOrder[0];
      const regionCallOrder = mockRegionById.mock.invocationCallOrder[0];
      const urlCallOrder = mockUpdateUrl.mock.invocationCallOrder[0];
      const seekCallOrder = mockSeekToTime.mock.invocationCallOrder[0];
      const playCallOrder = mockPlay.mock.invocationCallOrder[0];
      
      expect(validateCallOrder).toBeLessThan(regionCallOrder);
      expect(regionCallOrder).toBeLessThan(urlCallOrder);
      expect(urlCallOrder).toBeLessThan(seekCallOrder);
      expect(seekCallOrder).toBeLessThan(playCallOrder);
    });

    it('should handle regions with different start times', async () => {
      const differentRegion = { ...mockRegion, start: 15.7 };
      mockRegionById.mockReturnValue(differentRegion);
      
      const useCase = new PlayRegion(validConfig);
      
      await useCase.execute();
      
      expect(mockSeekToTime).toHaveBeenCalledWith(15.7);
    });
  });

  describe('error handling', () => {
    it('should throw validation error if regionId is invalid', async () => {
      const config = { ...validConfig, regionId: '' };
      const useCase = new PlayRegion(config);
      
      await expect(useCase.execute()).rejects.toThrow('regionId is required');
    });

    it('should throw error if region not found in store', async () => {
      mockRegionById.mockReturnValue(undefined);
      const useCase = new PlayRegion(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow(`Region with id ${validConfig.regionId} not found`);
    });

    it('should propagate wavesurfer play errors', async () => {
      const playError = new Error('Wavesurfer play failed');
      mockPlay.mockRejectedValue(playError);
      
      const useCase = new PlayRegion(validConfig);
      
      await expect(useCase.execute()).rejects.toThrow('Wavesurfer play failed');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete flow with valid data', async () => {
      const useCase = new PlayRegion(validConfig);
      
      await expect(useCase.execute()).resolves.not.toThrow();
      
      expect(mockRegionById).toHaveBeenCalledTimes(1);
      expect(mockUpdateUrl).toHaveBeenCalledTimes(1);
      expect(mockSeekToTime).toHaveBeenCalledTimes(1);
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('should work with different region configurations', async () => {
      const customRegion = {
        id: 'custom-region-789',
        start: 25.8,
        end: 45.2,
        text: 'Custom region content',
      };
      
      const customConfig = { ...validConfig, regionId: 'custom-region-789' };
      mockRegionById.mockReturnValue(customRegion);
      
      const useCase = new PlayRegion(customConfig);
      
      await useCase.execute();
      
      expect(mockRegionById).toHaveBeenCalledWith('custom-region-789');
      expect(mockUpdateUrl).toHaveBeenCalledWith('/transcribe-edit/transcription-123/custom-region-789');
      expect(mockSeekToTime).toHaveBeenCalledWith(25.8);
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('should handle zero start time correctly', async () => {
      const regionAtStart = { ...mockRegion, start: 0 };
      mockRegionById.mockReturnValue(regionAtStart);
      
      const useCase = new PlayRegion(validConfig);
      
      await useCase.execute();
      
      expect(mockSeekToTime).toHaveBeenCalledWith(0);
      expect(mockUpdateUrl).toHaveBeenCalledWith('/transcribe-edit/transcription-123/region-123');
    });

    it('should work without URL update when transcription data is incomplete', async () => {
      const storeWithoutTranscription = { 
        ...mockStore, 
        transcription: null 
      };
      const configWithoutTranscription = { 
        ...validConfig, 
        store: storeWithoutTranscription 
      };
      
      const useCase = new PlayRegion(configWithoutTranscription);
      
      await expect(useCase.execute()).resolves.not.toThrow();
      
      expect(mockRegionById).toHaveBeenCalledTimes(1);
      expect(mockUpdateUrl).not.toHaveBeenCalled();
      expect(mockSeekToTime).toHaveBeenCalledTimes(1);
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });
  });
}); 