import { RefreshMediaCredentials } from './refresh-media-credentials';
import { services } from '../services';

// Mock the services
jest.mock('../services');

describe('RefreshMediaCredentials', () => {
  let mockTranscriptionService: any;
  let mockWavesurferService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock transcriptionService
    mockTranscriptionService = {
      forceFreshCredentials: jest.fn().mockResolvedValue(undefined),
    };

    // Mock wavesurferService
    mockWavesurferService = {
      reloadWithFreshUrl: jest.fn().mockResolvedValue(undefined),
    };

    // Setup services mock
    (services as any).transcriptionService = mockTranscriptionService;
    (services as any).wavesurferService = mockWavesurferService;
  });

  describe('validate', () => {
    it('should throw error when source is missing', () => {
      const useCase = new RefreshMediaCredentials({
        source: '',
        peaks: [1, 2, 3],
        services,
      });

      expect(() => useCase.validate()).toThrow('Media source is required');
    });

    it('should not throw when source is provided', () => {
      const useCase = new RefreshMediaCredentials({
        source: 'https://example.com/media.mp3',
        peaks: [1, 2, 3],
        services,
      });

      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should force fresh credentials and reload media', async () => {
      const useCase = new RefreshMediaCredentials({
        source: 'https://example.com/media.mp3',
        peaks: [1, 2, 3],
        services,
      });

      await useCase.execute();

      expect(mockTranscriptionService.forceFreshCredentials).toHaveBeenCalledTimes(1);
      expect(mockWavesurferService.reloadWithFreshUrl).toHaveBeenCalledWith(
        'https://example.com/media.mp3',
        [1, 2, 3]
      );
    });

    it('should call forceFreshCredentials before reloading media', async () => {
      const callOrder: string[] = [];

      mockTranscriptionService.forceFreshCredentials.mockImplementation(async () => {
        callOrder.push('forceFreshCredentials');
      });

      mockWavesurferService.reloadWithFreshUrl.mockImplementation(async () => {
        callOrder.push('reloadWithFreshUrl');
      });

      const useCase = new RefreshMediaCredentials({
        source: 'https://example.com/media.mp3',
        peaks: [1, 2, 3],
        services,
      });

      await useCase.execute();

      expect(callOrder).toEqual(['forceFreshCredentials', 'reloadWithFreshUrl']);
    });

    it('should throw validation error before making any calls', async () => {
      const useCase = new RefreshMediaCredentials({
        source: '',
        peaks: [1, 2, 3],
        services,
      });

      await expect(useCase.execute()).rejects.toThrow('Media source is required');

      expect(mockTranscriptionService.forceFreshCredentials).not.toHaveBeenCalled();
      expect(mockWavesurferService.reloadWithFreshUrl).not.toHaveBeenCalled();
    });

    it('should propagate error from forceFreshCredentials', async () => {
      const error = new Error('Failed to refresh credentials');
      mockTranscriptionService.forceFreshCredentials.mockRejectedValue(error);

      const useCase = new RefreshMediaCredentials({
        source: 'https://example.com/media.mp3',
        peaks: [1, 2, 3],
        services,
      });

      await expect(useCase.execute()).rejects.toThrow('Failed to refresh credentials');
      expect(mockWavesurferService.reloadWithFreshUrl).not.toHaveBeenCalled();
    });

    it('should propagate error from reloadWithFreshUrl', async () => {
      const error = new Error('Failed to reload media');
      mockWavesurferService.reloadWithFreshUrl.mockRejectedValue(error);

      const useCase = new RefreshMediaCredentials({
        source: 'https://example.com/media.mp3',
        peaks: [1, 2, 3],
        services,
      });

      await expect(useCase.execute()).rejects.toThrow('Failed to reload media');
      expect(mockTranscriptionService.forceFreshCredentials).toHaveBeenCalled();
    });

    it('should work with null peaks', async () => {
      const useCase = new RefreshMediaCredentials({
        source: 'https://example.com/media.mp3',
        peaks: null,
        services,
      });

      await useCase.execute();

      expect(mockWavesurferService.reloadWithFreshUrl).toHaveBeenCalledWith(
        'https://example.com/media.mp3',
        null
      );
    });
  });
});
