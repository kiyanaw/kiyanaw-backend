import { CreateRegion } from './create-region';
import { services } from '../services';

// Mock the services
jest.mock('../services');

describe('CreateRegion', () => {
  const mockCurrentUser = jest.fn();
  const mockAddNewRegion = jest.fn();
  const mockCreateRegion = jest.fn();

  const mockServices = {
    authService: {
      currentUser: mockCurrentUser,
    },
    regionService: {
      createRegion: mockCreateRegion,
    },
  };

  const mockStore = {
    addNewRegion: mockAddNewRegion,
  };

  const validConfig = {
    transcriptionId: 'test-transcription-id',
    newRegion: {
      id: 'region-123',
      start: 5.5,
      end: 12.3,
    },
    regions: [
      { id: 'existing-region-1', start: 0, end: 5 },
      { id: 'existing-region-2', start: 15, end: 20 },
    ],
    services: mockServices as any,
    store: mockStore,
  };

  const mockUser = {
    username: 'test-user',
    id: 'user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser.mockReturnValue(mockUser);
    mockCreateRegion.mockResolvedValue(undefined);
    mockAddNewRegion.mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('should create instance with provided config', () => {
      const useCase = new CreateRegion(validConfig);
      expect(useCase).toBeInstanceOf(CreateRegion);
    });
  });

  describe('validate method - error cases', () => {
    it('should throw error when transcriptionId is empty string', () => {
      const config = { ...validConfig, transcriptionId: '' };
      const useCase = new CreateRegion(config);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });

    it('should throw error when transcriptionId is whitespace only', () => {
      const config = { ...validConfig, transcriptionId: '   ' };
      const useCase = new CreateRegion(config);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });

    it('should throw error when transcriptionId is undefined', () => {
      const config = { ...validConfig, transcriptionId: undefined as any };
      const useCase = new CreateRegion(config);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });

    it('should throw error when transcriptionId is null', () => {
      const config = { ...validConfig, transcriptionId: null as any };
      const useCase = new CreateRegion(config);
      
      expect(() => useCase.validate()).toThrow('transcriptionId is required and cannot be empty');
    });
  });

  describe('validate method - success cases', () => {
    it('should not throw error with valid transcriptionId', () => {
      const useCase = new CreateRegion(validConfig);
      expect(() => useCase.validate()).not.toThrow();
    });
  });

  describe('execute method', () => {
    it('should call validate before execution', async () => {
      const useCase = new CreateRegion(validConfig);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    it('should call store.addNewRegion with new region', async () => {
      const useCase = new CreateRegion(validConfig);
      
      await useCase.execute();
      
      expect(mockAddNewRegion).toHaveBeenCalledTimes(1);
      expect(mockAddNewRegion).toHaveBeenCalledWith(validConfig.newRegion);
    });

    it('should call regionService.createRegion with correct parameters', async () => {
      const useCase = new CreateRegion(validConfig);
      
      await useCase.execute();
      
      expect(mockCreateRegion).toHaveBeenCalledTimes(1);
      expect(mockCreateRegion).toHaveBeenCalledWith(
        validConfig.transcriptionId,
        validConfig.newRegion,
        mockUser.username
      );
    });

    it('should execute in correct order: validate -> store -> service', async () => {
      const useCase = new CreateRegion(validConfig);
      const validateSpy = jest.spyOn(useCase, 'validate');
      
      await useCase.execute();
      
      const validateCallOrder = validateSpy.mock.invocationCallOrder[0];
      const storeCallOrder = mockAddNewRegion.mock.invocationCallOrder[0];
      const serviceCallOrder = mockCreateRegion.mock.invocationCallOrder[0];
      
      expect(validateCallOrder).toBeLessThan(storeCallOrder);
      expect(storeCallOrder).toBeLessThan(serviceCallOrder);
    });
  });

  describe('error handling', () => {
    it('should throw validation error if transcriptionId is invalid', async () => {
      const config = { ...validConfig, transcriptionId: '' };
      const useCase = new CreateRegion(config);
      
      await expect(useCase.execute()).rejects.toThrow('transcriptionId is required and cannot be empty');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete flow with valid data', async () => {
      const useCase = new CreateRegion(validConfig);
      
      await expect(useCase.execute()).resolves.not.toThrow();
      
      expect(mockCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockAddNewRegion).toHaveBeenCalledTimes(1);
      expect(mockCreateRegion).toHaveBeenCalledTimes(1);
    });

    it('should work with different region data', async () => {
      const differentRegion = {
        id: 'different-region-id',
        start: 10.5,
        end: 25.8,
      };
      
      const config = { ...validConfig, newRegion: differentRegion };
      const useCase = new CreateRegion(config);
      
      await useCase.execute();
      
      expect(mockAddNewRegion).toHaveBeenCalledWith(differentRegion);
      expect(mockCreateRegion).toHaveBeenCalledWith(
        validConfig.transcriptionId,
        differentRegion,
        mockUser.username
      );
    });
  });
}); 