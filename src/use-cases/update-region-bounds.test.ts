import { UpdateRegionBounds } from './update-region-bounds';

jest.mock('../services/regionSaveManager', () => ({
  regionSaveManager: {
    queueBoundsChange: jest.fn(),
  },
}));

import { regionSaveManager } from '../services/regionSaveManager';

describe('UpdateRegionBounds', () => {
  const existingRegion = {
    id: 'test-region-id',
    start: 1.0,
    end: 2.0,
    transcriptionId: 'test-transcription-id',
  };

  const mockServices = {
    storeService: {
      startPendingEdit: jest.fn(),
    },
  };

  const mockStore = {
    regionById: jest.fn(),
    updateRegionBounds: jest.fn(),
  };

  const config = {
    regionId: 'test-region-id',
    newStart: 1.5,
    newEnd: 3.5,
    user: { username: 'testuser', userId: 'u1' },
    services: mockServices as unknown as ConstructorParameters<typeof UpdateRegionBounds>[0]['services'],
    store: mockStore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.regionById.mockReturnValue(existingRegion);
  });

  describe('validate', () => {
    it('should validate required fields', () => {
      expect(() => new UpdateRegionBounds(config).validate()).not.toThrow();
    });

    it('should throw error if regionId is missing', () => {
      expect(() => new UpdateRegionBounds({ ...config, regionId: '' }).validate()).toThrow('regionId is required');
    });

    it('should throw error if start time is negative', () => {
      expect(() => new UpdateRegionBounds({ ...config, newStart: -1 }).validate()).toThrow('start time must be >= 0');
    });

    it('should throw error if end time is not greater than start time', () => {
      expect(() => new UpdateRegionBounds({ ...config, newStart: 3, newEnd: 2 }).validate()).toThrow(
        'end time must be greater than start time'
      );
    });
  });

  describe('execute', () => {
    it('updates the store right away and queues the bounds on the region save queue', () => {
      new UpdateRegionBounds(config).execute();

      expect(mockStore.updateRegionBounds).toHaveBeenCalledWith('test-region-id', 1.5, 3.5);
      expect(mockServices.storeService.startPendingEdit).toHaveBeenCalledWith('test-region-id', 'bounds');
      expect(regionSaveManager.queueBoundsChange).toHaveBeenCalledWith('test-region-id', 1.5, 3.5);
    });

    it('throws if the region does not exist', () => {
      mockStore.regionById.mockReturnValue(null);

      expect(() => new UpdateRegionBounds(config).execute()).toThrow('Region test-region-id not found');
      expect(mockStore.updateRegionBounds).not.toHaveBeenCalled();
      expect(regionSaveManager.queueBoundsChange).not.toHaveBeenCalled();
    });

    it('does nothing if bounds are unchanged', () => {
      mockStore.regionById.mockReturnValue({ ...existingRegion, start: 1.5, end: 3.5 });

      new UpdateRegionBounds(config).execute();

      expect(mockStore.updateRegionBounds).not.toHaveBeenCalled();
      expect(mockServices.storeService.startPendingEdit).not.toHaveBeenCalled();
      expect(regionSaveManager.queueBoundsChange).not.toHaveBeenCalled();
    });
  });
});
