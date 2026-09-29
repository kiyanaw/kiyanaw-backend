import { SnipRegionUseCase } from './snip-region';

jest.mock('../services/regionClipService', () => ({
  getRegionClipUrl: jest.fn(),
}));

import { getRegionClipUrl } from '../services/regionClipService';

const mockGetUrl = getRegionClipUrl as jest.MockedFunction<typeof getRegionClipUrl>;

describe('SnipRegionUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('validate', () => {
    it('rejects when no region is selected', () => {
      expect(() => new SnipRegionUseCase({ regionId: '', canSnip: true }).validate())
        .toThrow('No region selected.');
    });

    it('rejects when the user is not permitted', () => {
      expect(() => new SnipRegionUseCase({ regionId: 'r1', canSnip: false }).validate())
        .toThrow('You do not have permission to download this clip.');
    });

    it('passes for a permitted region', () => {
      expect(() => new SnipRegionUseCase({ regionId: 'r1', canSnip: true }).validate())
        .not.toThrow();
    });
  });

  describe('execute', () => {
    it('returns the presigned URL from the service', async () => {
      mockGetUrl.mockResolvedValue('https://signed.example/clip.mp3');
      const url = await new SnipRegionUseCase({ regionId: 'r1', canSnip: true }).execute();
      expect(url).toBe('https://signed.example/clip.mp3');
      expect(mockGetUrl).toHaveBeenCalledWith('r1');
    });

    it('does not call the service when not permitted', async () => {
      await expect(new SnipRegionUseCase({ regionId: 'r1', canSnip: false }).execute())
        .rejects.toThrow('You do not have permission to download this clip.');
      expect(mockGetUrl).not.toHaveBeenCalled();
    });
  });
});
