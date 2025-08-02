import { UpdateRegionBounds } from './update-region-bounds';

describe('UpdateRegionBounds', () => {
  let mockServices: any;
  let mockStore: any;
  let config: any;

  beforeEach(() => {
    mockServices = {
      regionService: {
        updateRegion: jest.fn().mockResolvedValue({}),
      },
      authService: {
        currentUser: jest.fn().mockReturnValue({ username: 'testuser' }),
      },
    };

    mockStore = {
        updateRegionBounds: jest.fn(),
  regionById: jest.fn(),
  getRegionVersion: jest.fn(),
      regions: [],
      regionMap: {},
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
      };

      mockStore.regionById.mockReturnValue(existingRegion);
      mockStore.getRegionVersion.mockReturnValue(5); // Mock version

      const useCase = new UpdateRegionBounds(config);
      await useCase.execute();

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
      const existingRegion = {
        id: 'test-region-id',
        start: 1.0,
        end: 2.0,
        regionText: 'test text',
      };

      mockStore.regionById.mockReturnValue(existingRegion);
      mockServices.regionService.updateRegion.mockRejectedValue(new Error('Save failed'));

      const useCase = new UpdateRegionBounds(config);
      await useCase.execute();

      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('test-region-id', 1.5, 3.5);
      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('test-region-id', 1.0, 2.0);
    });

    it('should use unknown username if no current user', async () => {
      const existingRegion = {
        id: 'test-region-id',
        start: 1.0,
        end: 2.0,
        regionText: 'test text',
      };

      mockStore.regionById.mockReturnValue(existingRegion);
      mockStore.getRegionVersion.mockReturnValue(3); // Mock version
      mockServices.authService.currentUser.mockReturnValue(null);

      const useCase = new UpdateRegionBounds(config);
      await useCase.execute();

      expect(mockServices.regionService.updateRegion).toHaveBeenCalledWith(
        'test-region-id',
        { start: 1.5, end: 3.5 },
        'unknown',
        3
      );
    });
  });
}); 