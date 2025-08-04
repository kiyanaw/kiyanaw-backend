import { UpdateRegionBounds } from './update-region-bounds';

// Mock smart-timeout to execute immediately and synchronously
let timeoutFunctions: (() => void)[] = [];

jest.mock('smart-timeout', () => ({
  set: (key: string, fn: () => void) => {
    // Store function to be executed later
    timeoutFunctions.push(fn);
    return key;
  },
  clear: jest.fn(),
}));

describe('UpdateRegionBounds', () => {
  let mockServices: any;
  let mockStore: any;
  let config: any;

  beforeEach(() => {
    // Reset timeout functions
    timeoutFunctions = [];
    
    mockServices = {
      regionService: {
        updateRegion: jest.fn().mockResolvedValue({}),
      },
      authService: {
        currentUser: jest.fn().mockReturnValue({ username: 'testuser' }),
      },
      storeService: {
        startPendingEdit: jest.fn(),
        endPendingEdit: jest.fn(),
        regionById: jest.fn(),
        getRegionVersion: jest.fn().mockReturnValue(1),
        updateRegionBounds: jest.fn(),
        setRegionVersion: jest.fn(),
        getBaselineForRegion: jest.fn().mockReturnValue(null),
      },
      transcriptionService: {
        updateTranscription: jest.fn().mockResolvedValue({}),
      },
      userService: {
        currentUser: jest.fn().mockReturnValue({ username: 'testuser' }),
      },
      wavesurferService: {
        setRegionPosition: jest.fn(),
      },
    };

    mockStore = {
      updateRegionBounds: jest.fn(),
      regionById: jest.fn().mockReturnValue({
        id: 'test-region-id',
        start: 1.0,
        end: 2.0,
        transcriptionId: 'test-transcription-id',
        _version: 1
      }),
      getRegionVersion: jest.fn().mockReturnValue(1),
      setRegionVersion: jest.fn(),
      regions: [],
      regionMap: {
        'test-region-id': {
          id: 'test-region-id',
          start: 1.0,
          end: 2.0,
          transcriptionId: 'test-transcription-id',
          _version: 1
        }
      },
      transcription: {
        id: 'test-transcription-id',
        title: 'Test Transcription'
      },
      calculateTranscriptionMetadata: jest.fn().mockReturnValue({ coverage: 0.5 }),
      setTranscription: jest.fn(),
    };

    config = {
      regionId: 'test-region-id',
      newStart: 1.5,
      newEnd: 3.5,
      user: { username: 'testuser' },
      services: mockServices,
      store: mockStore,
    };
  });

  describe('validate', () => {
    it('should validate required fields', () => {
      const useCase = new UpdateRegionBounds(config);
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should throw error if regionId is missing', () => {
      const useCase = new UpdateRegionBounds({ ...config, regionId: '' });
      expect(() => useCase.validate()).toThrow('regionId is required');
    });

    it('should throw error if start time is negative', () => {
      const useCase = new UpdateRegionBounds({ ...config, newStart: -1 });
      expect(() => useCase.validate()).toThrow('start time must be >= 0');
    });

    it('should throw error if end time is not greater than start time', () => {
      const useCase = new UpdateRegionBounds({ ...config, newStart: 3, newEnd: 2 });
      expect(() => useCase.validate()).toThrow('end time must be greater than start time');
    });
  });

  describe('execute', () => {
    it('should update region bounds successfully', async () => {
      const existingRegion = {
        id: 'test-region-id',
        start: 1.0,
        end: 2.0,
        regionText: 'test text',
        transcriptionId: 'test-transcription-id',
        _version: 5
      };

      mockStore.regionById.mockReturnValue(existingRegion);
      mockStore.getRegionVersion.mockReturnValue(5); // Mock version

      const useCase = new UpdateRegionBounds(config);
      useCase.execute(); // Synchronous call

      // Execute any stored timeout functions manually
      for (const fn of timeoutFunctions) {
        await fn();
      }

      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('test-region-id', 1.5, 3.5);
      expect(mockServices.regionService.updateRegion).toHaveBeenCalledWith(
        'test-region-id',
        { start: 1.5, end: 3.5 },
        'testuser',
        5
      );
    });

    it('should skip update if region does not exist', async () => {
      mockStore.regionById.mockReturnValue(null);

      const useCase = new UpdateRegionBounds(config);
      await useCase.execute();

      expect(mockStore.updateRegionBounds).not.toHaveBeenCalled();
      expect(mockServices.regionService.updateRegion).not.toHaveBeenCalled();
    });

    it('should skip update if bounds are unchanged', async () => {
      const existingRegion = {
        id: 'test-region-id',
        start: 1.5,
        end: 3.5,
        regionText: 'test text',
      };

      mockStore.regionById.mockReturnValue(existingRegion);

      const useCase = new UpdateRegionBounds(config);
      await useCase.execute();

      expect(mockStore.updateRegionBounds).not.toHaveBeenCalled();
      expect(mockServices.regionService.updateRegion).not.toHaveBeenCalled();
    });

    it('should handle save error and revert optimistic update', async () => {
      // Reset mocks for this test
      mockStore.updateRegionBounds.mockReset();
      mockServices.regionService.updateRegion.mockReset();
      
      const existingRegion = {
        id: 'test-region-id',
        start: 1.0,
        end: 2.0,
        regionText: 'test text',
        transcriptionId: 'test-transcription-id',
        _version: 5
      };

      mockStore.regionById.mockReturnValue(existingRegion);
      mockStore.getRegionVersion.mockReturnValue(5);

      const useCase = new UpdateRegionBounds(config);
      useCase.execute(); // Synchronous call

      // Set up the rejection after execute() but before timeout execution
      mockServices.regionService.updateRegion.mockRejectedValueOnce(new Error('Save failed'));

      // Should apply optimistic update immediately (check the most recent call)
      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('test-region-id', 1.5, 3.5);

      // Execute any stored timeout functions manually (this will trigger the save and error)
      try {
        for (const fn of timeoutFunctions) {
          await fn();
        }
      } catch (error) {
        // Error is expected and should be handled gracefully by the use case
      }

      // Should have called the API once (which failed) and reverted
      expect(mockServices.regionService.updateRegion).toHaveBeenCalledTimes(1);
      // Should have made both optimistic update and revert calls
      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('test-region-id', 1.5, 3.5); // optimistic
      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('test-region-id', 1.0, 2.0); // revert
    });

    it('should skip save when no current user is authenticated', async () => {
      const existingRegion = {
        id: 'test-region-id',
        start: 1.0,
        end: 2.0,
        regionText: 'test text',
        transcriptionId: 'test-transcription-id',
        _version: 3
      };

      mockStore.regionById.mockReturnValue(existingRegion);
      mockStore.getRegionVersion.mockReturnValue(3); // Mock version
      mockServices.authService.currentUser.mockReturnValue(null);

      const useCase = new UpdateRegionBounds(config);
      useCase.execute(); // Synchronous call

      // Execute any stored timeout functions manually
      for (const fn of timeoutFunctions) {
        await fn();
      }

      // Should apply optimistic update but skip API save due to no authentication
      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('test-region-id', 1.5, 3.5);
      expect(mockServices.regionService.updateRegion).not.toHaveBeenCalled();
    });
  });
}); 