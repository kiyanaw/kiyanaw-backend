import { LoadDatabaseStatsUseCase } from './load-database-stats';
import * as databaseService from '../services/databaseService';
import type { DatabaseStats } from '../services/adt';

// Mock the database service
jest.mock('../services/databaseService');
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('LoadDatabaseStatsUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStats: DatabaseStats = {
    totalWords: 1000,
    uniqueLemmas: 250,
    totalTranscriptions: 10,
    wordTypeDistribution: [
      { wordType: 'VTI', count: 500 },
      { wordType: 'VAI', count: 300 }
    ],
    topVerbs: [
      { lemma: 'kiskêyihtam', count: 50 }
    ],
    topNouns: [
      { lemma: 'nâpêw', count: 30 }
    ]
  };

  describe('validate', () => {
    it('should pass validation with no language', () => {
      const useCase = new LoadDatabaseStatsUseCase({});
      expect(() => useCase.validate()).not.toThrow();
    });

    it('should pass validation with valid language codes', () => {
      const useCaseCrk = new LoadDatabaseStatsUseCase({ lang: 'crk' });
      const useCaseCrgn = new LoadDatabaseStatsUseCase({ lang: 'crgn' });
      
      expect(() => useCaseCrk.validate()).not.toThrow();
      expect(() => useCaseCrgn.validate()).not.toThrow();
    });

    it('should throw error for invalid language code', () => {
      const useCase = new LoadDatabaseStatsUseCase({ lang: 'invalid' });
      expect(() => useCase.validate()).toThrow('Invalid language code. Must be one of:');
    });
  });

  describe('execute', () => {
    it('should load stats successfully without language filter', async () => {
      mockDatabaseService.getDatabaseStats.mockResolvedValue(mockStats);
      
      const useCase = new LoadDatabaseStatsUseCase({});
      const result = await useCase.execute();
      
      expect(mockDatabaseService.getDatabaseStats).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockStats);
    });

    it('should load stats successfully with language filter', async () => {
      mockDatabaseService.getDatabaseStats.mockResolvedValue(mockStats);
      
      const useCase = new LoadDatabaseStatsUseCase({ lang: 'crk' });
      const result = await useCase.execute();
      
      expect(mockDatabaseService.getDatabaseStats).toHaveBeenCalledWith('crk');
      expect(result).toEqual(mockStats);
    });

    it('should throw error when service fails', async () => {
      const serviceError = new Error('Service unavailable');
      mockDatabaseService.getDatabaseStats.mockRejectedValue(serviceError);
      
      const useCase = new LoadDatabaseStatsUseCase({});
      
      await expect(useCase.execute()).rejects.toThrow('Service unavailable');
      expect(mockDatabaseService.getDatabaseStats).toHaveBeenCalledWith(undefined);
    });

    it('should call validate before executing', async () => {
      const useCase = new LoadDatabaseStatsUseCase({ lang: 'invalid' });
      
      await expect(useCase.execute()).rejects.toThrow('Invalid language code');
      expect(mockDatabaseService.getDatabaseStats).not.toHaveBeenCalled();
    });
  });
});
