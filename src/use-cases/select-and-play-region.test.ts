import { SelectAndPlayRegion } from './select-and-play-region';

describe('SelectAndPlayRegion', () => {
  const mockWavesurferService = {
    seekToRegion: jest.fn(),
    play: jest.fn().mockResolvedValue(undefined),
  };

  const mockBrowserService = {
    updateUrl: jest.fn(),
    setSelectedRegion: jest.fn(),
  };

  const mockServices = {
    wavesurferService: mockWavesurferService,
    browserService: mockBrowserService,
  };

  const mockStore = {
    regionById: jest.fn(),
    transcription: { id: 'test-transcription-id' },
    setSelectedRegion: jest.fn(),
  };

  const validConfig = {
    regionId: 'test-region-id',
    services: mockServices,
    store: mockStore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.regionById.mockReturnValue({ id: 'test-region-id', start: 10.5, end: 20.5 });
  });

  describe('constructor', () => {
    it('should create an instance with valid config', () => {
      const useCase = new SelectAndPlayRegion(validConfig);
      expect(useCase).toBeInstanceOf(SelectAndPlayRegion);
    });
  });

  describe('validate', () => {
    it('should pass when regionId is provided', () => {
      const useCase = new SelectAndPlayRegion(validConfig);
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should fail when regionId is not provided', () => {
      const configWithoutRegionId = {
        ...validConfig,
        regionId: '',
      };

      const useCase = new SelectAndPlayRegion(configWithoutRegionId);
      expect(() => useCase.validate()).toThrow('regionId is required');
    });
  });

  describe('execute', () => {
    it('should fail when region is not found in store', async () => {
      const useCase = new SelectAndPlayRegion({
        ...validConfig,
        store: {
          ...mockStore,
          regionById: jest.fn().mockReturnValue(null),
        },
      });

      await expect(useCase.execute()).rejects.toThrow('Region with id test-region-id not found');
    });

    it('should update URL when transcription has an id', async () => {
      const useCase = new SelectAndPlayRegion(validConfig);
      await useCase.execute();

      expect(mockBrowserService.updateUrl).toHaveBeenCalledWith('/transcribe-edit/test-transcription-id/test-region-id');
    });

    it('should update selected region in store', async () => {
      const useCase = new SelectAndPlayRegion(validConfig);
      await useCase.execute();

      expect(mockStore.setSelectedRegion).toHaveBeenCalledWith('test-region-id');
    });

    it('should apply selected region styling', async () => {
      const useCase = new SelectAndPlayRegion(validConfig);
      await useCase.execute();

      expect(mockBrowserService.setSelectedRegion).toHaveBeenCalledWith('test-region-id');
    });

    it('should seek to region start time', async () => {
      const useCase = new SelectAndPlayRegion(validConfig);
      await useCase.execute();

      expect(mockWavesurferService.seekToRegion).toHaveBeenCalledWith({ id: 'test-region-id', start: 10.5, end: 20.5 });
    });

    it('should play audio after seeking', async () => {
      const useCase = new SelectAndPlayRegion(validConfig);
      await useCase.execute();

      expect(mockWavesurferService.play).toHaveBeenCalled();
    });

    it('should execute operations in correct order', async () => {
      const callOrder: string[] = [];

      const mockStoreWithTracking = {
        ...mockStore,
        setSelectedRegion: jest.fn(() => callOrder.push('setSelectedRegion')),
      };

      const mockWavesurferServiceWithTracking = {
        seekToRegion: jest.fn(() => callOrder.push('seekToRegion')),
        play: jest.fn(() => {
          callOrder.push('play');
          return Promise.resolve();
        }),
      };

      const mockBrowserServiceWithTracking = {
        updateUrl: jest.fn(() => callOrder.push('updateUrl')),
        setSelectedRegion: jest.fn(() => callOrder.push('setBrowserSelectedRegion')),
      };

      const useCase = new SelectAndPlayRegion({
        ...validConfig,
        store: mockStoreWithTracking,
        services: {
          wavesurferService: mockWavesurferServiceWithTracking,
          browserService: mockBrowserServiceWithTracking,
        },
      });

      await useCase.execute();

      expect(callOrder).toEqual(['updateUrl', 'setSelectedRegion', 'setBrowserSelectedRegion', 'seekToRegion', 'play']);
    });

    it('should not update URL when transcription is missing', async () => {
      const useCase = new SelectAndPlayRegion({
        ...validConfig,
        store: {
          ...mockStore,
          transcription: null,
        },
      });

      await useCase.execute();

      expect(mockBrowserService.updateUrl).not.toHaveBeenCalled();
      // Should still apply styling regardless of URL update
      expect(mockBrowserService.setSelectedRegion).toHaveBeenCalledWith('test-region-id');
    });

    it('should not update URL when transcription id is missing', async () => {
      const useCase = new SelectAndPlayRegion({
        ...validConfig,
        store: {
          ...mockStore,
          transcription: { id: null },
        },
      });

      await useCase.execute();

      expect(mockBrowserService.updateUrl).not.toHaveBeenCalled();
      // Should still apply styling regardless of URL update
      expect(mockBrowserService.setSelectedRegion).toHaveBeenCalledWith('test-region-id');
    });

    it('should handle play method throwing error', async () => {
      const useCase = new SelectAndPlayRegion({
        ...validConfig,
        services: {
          ...mockServices,
          wavesurferService: {
            ...mockWavesurferService,
            play: jest.fn().mockRejectedValue(new Error('Play failed')),
          },
        },
      });

      await expect(useCase.execute()).rejects.toThrow('Play failed');

      // Should still have updated store and applied styling before the error
      expect(mockStore.setSelectedRegion).toHaveBeenCalledWith('test-region-id');
      expect(mockBrowserService.setSelectedRegion).toHaveBeenCalledWith('test-region-id');
    });

    it('should handle seekToTime method throwing error', async () => {
      const useCase = new SelectAndPlayRegion({
        ...validConfig,
        services: {
          ...mockServices,
          wavesurferService: {
            ...mockWavesurferService,
            seekToRegion: jest.fn(() => {
              throw new Error('Seek failed');
            }),
          },
        },
      });

      await expect(useCase.execute()).rejects.toThrow('Seek failed');

      // Should still have updated store and applied styling before the error
      expect(mockStore.setSelectedRegion).toHaveBeenCalledWith('test-region-id');
      expect(mockBrowserService.setSelectedRegion).toHaveBeenCalledWith('test-region-id');
    });

    it('should validate before executing', async () => {
      const useCase = new SelectAndPlayRegion({
        ...validConfig,
        regionId: '',
      });

      await expect(useCase.execute()).rejects.toThrow('regionId is required');

      // Should not call any services or store updates if validation fails
      expect(mockStore.setSelectedRegion).not.toHaveBeenCalled();
      expect(mockBrowserService.setSelectedRegion).not.toHaveBeenCalled();
      expect(mockWavesurferService.seekToRegion).not.toHaveBeenCalled();
      expect(mockWavesurferService.play).not.toHaveBeenCalled();
    });

    it('should work with different region data', async () => {
      const useCase = new SelectAndPlayRegion({
        ...validConfig,
        regionId: 'different-region-id',
        store: {
          ...mockStore,
          regionById: jest.fn().mockReturnValue({ id: 'different-region-id', start: 42.7, end: 50.3 }),
        },
      });

      await useCase.execute();

      expect(mockStore.setSelectedRegion).toHaveBeenCalledWith('different-region-id');
      expect(mockBrowserService.setSelectedRegion).toHaveBeenCalledWith('different-region-id');
      expect(mockWavesurferService.seekToRegion).toHaveBeenCalledWith({ id: 'different-region-id', start: 42.7, end: 50.3 });
    });
  });
}); 