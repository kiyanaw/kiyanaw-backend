import { LoadTranscription } from './load-transcription';

describe('LoadTranscription', () => {
  const mockTranscriptionService = {
    get: jest.fn(),
  };

  const mockAuthService = {
    currentUser: jest.fn(),
  };

  const mockServices = {
    transcriptionService: mockTranscriptionService,
    authService: mockAuthService,
  };

  const mockBus = {
    emit: jest.fn(),
  };

  const mockStore = {
    setData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should throw error if transcriptionId is empty', () => {
      const useCase = new LoadTranscription({
        transcriptionId: '',
        services: mockServices,
        bus: mockBus,
        store: mockStore,
      });

      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });

    it('should pass validation with valid inputs', () => {
      const useCase = new LoadTranscription({
        transcriptionId: 'test-id',
        services: mockServices,
        bus: mockBus,
        store: mockStore,
      });

      expect(() => useCase.validate()).not.toThrow();
    });

    it('should log user when authService is provided', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockAuthService.currentUser.mockReturnValue({ username: 'test-user' });

      const useCase = new LoadTranscription({
        transcriptionId: 'test-id',
        services: mockServices,
        bus: mockBus,
        store: mockStore,
      });

      useCase.validate();

      expect(consoleSpy).toHaveBeenCalledWith('User loading transcription:', 'test-user');
      consoleSpy.mockRestore();
    });
  });

  describe('execute', () => {
    it('should successfully load and set transcription data', async () => {
      const mockData = {
        transcription: { id: 'test-id', title: 'Test' },
        regions: [],
        issues: [],
      };

      mockTranscriptionService.get.mockResolvedValue(mockData);

      const useCase = new LoadTranscription({
        transcriptionId: 'test-id',
        services: mockServices,
        bus: mockBus,
        store: mockStore,
      });

      await useCase.execute();

      expect(mockBus.emit).toHaveBeenCalledWith('loading-started');
      expect(mockTranscriptionService.get).toHaveBeenCalledWith('test-id');
      expect(mockStore.setData).toHaveBeenCalledWith(mockData);
      expect(mockBus.emit).toHaveBeenCalledWith('loading-succeeded', mockData);
    });

    it('should handle errors and emit loading-failed', async () => {
      const error = new Error('Network error');
      mockTranscriptionService.get.mockRejectedValue(error);

      const useCase = new LoadTranscription({
        transcriptionId: 'test-id',
        services: mockServices,
        bus: mockBus,
        store: mockStore,
      });

      await expect(useCase.execute()).rejects.toThrow('Network error');

      expect(mockBus.emit).toHaveBeenCalledWith('loading-started');
      expect(mockBus.emit).toHaveBeenCalledWith('loading-failed', error);
      expect(mockStore.setData).not.toHaveBeenCalled();
    });


  });
}); 