import { DeleteRegion } from './delete-region';

describe('DeleteRegion', () => {
  const mockServices = {
    wavesurferService: {
      getRegionsPlugin: jest.fn(),
      updateRegionIndices: jest.fn(),
      pause: jest.fn(),
      clearRegionBoundedPlayback: jest.fn(),
    },
    regionService: {
      deleteRegion: jest.fn(),
    },
    authService: {
      currentUser: jest.fn(),
    },
    transcriptionService: {
      updateTranscription: jest.fn(),
    },
  };

  const mockStore = {
    regionById: jest.fn(),
    deleteRegion: jest.fn(),
    transcription: {
      id: 'transcription123',
      title: 'Test Transcription',
      length: 120,
    },
    regions: [],
    calculateTranscriptionMetadata: jest.fn(() => ({ regionCount: 1, coverage: 0.5 })),
    setTranscription: jest.fn(),
    setSaveStatus: jest.fn(),
    getState: jest.fn(() => ({
      regionById: jest.fn(() => ({ transcriptionId: 'transcription123' })),
    })),
  };

  const mockUser = {
    username: 'testuser',
    userId: 'user123',
  };

  const mockRegion = {
    id: 'region123',
    start: 10,
    end: 20,
    regionText: 'Test region',
    transcriptionId: 'transcription123',
  };

  const validConfig = {
    regionId: 'region123',
    transcriptionId: 'transcription123',
    user: mockUser,
    services: mockServices as any,
    store: mockStore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockServices.authService.currentUser.mockReturnValue(mockUser);
    mockStore.regionById.mockReturnValue(mockRegion);
  });

  describe('validate', () => {
    it('should throw error when regionId is missing', () => {
      const useCase = new DeleteRegion({
        ...validConfig,
        regionId: '',
      });

      expect(() => useCase.validate()).toThrow('Region ID is required');
    });

    it('should throw error when transcriptionId is missing', () => {
      const useCase = new DeleteRegion({
        ...validConfig,
        transcriptionId: '',
      });

      expect(() => useCase.validate()).toThrow('Transcription ID is required');
    });

    it('should throw error when user is not authenticated', () => {
      mockServices.authService.currentUser.mockReturnValue(null);
      const useCase = new DeleteRegion(validConfig);

      expect(() => useCase.validate()).toThrow('User must be authenticated to delete a region');
    });

    it('should throw error when region does not exist', () => {
      mockStore.regionById.mockReturnValue(null);
      const useCase = new DeleteRegion(validConfig);

      expect(() => useCase.validate()).toThrow('Region not found');
    });

    it('should pass validation when all requirements are met', () => {
      const useCase = new DeleteRegion(validConfig);

      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should successfully delete region with proper sequence', async () => {
      const mockRegionsPlugin = {
        getRegions: jest.fn().mockReturnValue([
          { id: 'region123', remove: jest.fn() },
          { id: 'other-region', remove: jest.fn() },
        ]),
      };
      mockServices.wavesurferService.getRegionsPlugin.mockReturnValue(mockRegionsPlugin);
      mockServices.regionService.deleteRegion.mockResolvedValue(undefined);

      const useCase = new DeleteRegion(validConfig);
      await useCase.execute();

      // Verify sequence: wavesurfer → indices → store → backend
      const wsRegion = mockRegionsPlugin.getRegions()[0];
      expect(wsRegion.remove).toHaveBeenCalled();
      expect(mockServices.wavesurferService.updateRegionIndices).toHaveBeenCalled();
      expect(mockStore.deleteRegion).toHaveBeenCalledWith('region123');
      expect(mockServices.regionService.deleteRegion).toHaveBeenCalledWith('region123');
    });

    it('should handle missing wavesurfer region gracefully', async () => {
      const mockRegionsPlugin = {
        getRegions: jest.fn().mockReturnValue([]), // No matching region
      };
      mockServices.wavesurferService.getRegionsPlugin.mockReturnValue(mockRegionsPlugin);
      mockServices.regionService.deleteRegion.mockResolvedValue(undefined);

      const useCase = new DeleteRegion(validConfig);
      await useCase.execute();

      // Should still proceed with store and backend deletion
      expect(mockStore.deleteRegion).toHaveBeenCalledWith('region123');
      expect(mockServices.regionService.deleteRegion).toHaveBeenCalledWith('region123');
    });

    it('should handle missing regions plugin gracefully', async () => {
      mockServices.wavesurferService.getRegionsPlugin.mockReturnValue(null);
      mockServices.regionService.deleteRegion.mockResolvedValue(undefined);

      const useCase = new DeleteRegion(validConfig);
      await useCase.execute();

      // Should still proceed with store and backend deletion
      expect(mockStore.deleteRegion).toHaveBeenCalledWith('region123');
      expect(mockServices.regionService.deleteRegion).toHaveBeenCalledWith('region123');
    });

    it('should throw error when backend deletion fails', async () => {
      const mockRegionsPlugin = {
        getRegions: jest.fn().mockReturnValue([
          { id: 'region123', remove: jest.fn() },
        ]),
      };
      mockServices.wavesurferService.getRegionsPlugin.mockReturnValue(mockRegionsPlugin);
      mockServices.regionService.deleteRegion.mockRejectedValue(new Error('Network error'));

      const useCase = new DeleteRegion(validConfig);

      await expect(useCase.execute()).rejects.toThrow('Network error');

      // Should still have attempted all operations
      expect(mockStore.deleteRegion).toHaveBeenCalled();
      expect(mockServices.regionService.deleteRegion).toHaveBeenCalled();
    });

    it('should call validate before executing', async () => {
      mockServices.authService.currentUser.mockReturnValue(null); // Invalid state
      const useCase = new DeleteRegion(validConfig);

      await expect(useCase.execute()).rejects.toThrow('User must be authenticated to delete a region');

      // Should not proceed with deletion if validation fails
      expect(mockStore.deleteRegion).not.toHaveBeenCalled();
      expect(mockServices.regionService.deleteRegion).not.toHaveBeenCalled();
    });

    it('should stop playback before deleting region', async () => {
      const mockRegionsPlugin = {
        getRegions: jest.fn().mockReturnValue([
          { id: 'region123', remove: jest.fn() },
        ]),
      };
      mockServices.wavesurferService.getRegionsPlugin.mockReturnValue(mockRegionsPlugin);
      mockServices.regionService.deleteRegion.mockResolvedValue(undefined);

      const useCase = new DeleteRegion(validConfig);
      await useCase.execute();

      // Verify playback stopping methods are called
      expect(mockServices.wavesurferService.pause).toHaveBeenCalled();
      expect(mockServices.wavesurferService.clearRegionBoundedPlayback).toHaveBeenCalled();
      
      // Verify region deletion also happens
      expect(mockRegionsPlugin.getRegions()[0].remove).toHaveBeenCalled();
      expect(mockServices.regionService.deleteRegion).toHaveBeenCalledWith('region123');
    });
  });
}); 