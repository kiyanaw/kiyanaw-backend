import { checkAndUpgradeLegacyAnalysis } from './legacyAnalysisUpgrader';

// Mock the AnalyzeRegionTextUseCase
const mockExecute = jest.fn().mockResolvedValue(undefined);
jest.mock('../use-cases/analyze-region-text', () => ({
  AnalyzeRegionTextUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute
  }))
}));

// Mock the services
jest.mock('./index', () => ({
  services: {
    storeService: {
      regionById: jest.fn().mockReturnValue(null),
      transcription: { lang: 'crk' } // Default to having language available
    }
  }
}));

import { AnalyzeRegionTextUseCase } from '../use-cases/analyze-region-text';
import { services } from './index';

const mockAnalyzeRegionTextUseCase = AnalyzeRegionTextUseCase as jest.MockedClass<typeof AnalyzeRegionTextUseCase>;
const mockServices = services as any;

describe('legacyAnalysisUpgrader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upgrade legacy string[] analysis', async () => {
    // Mock a region with legacy string[] analysis
    mockServices.storeService.regionById.mockReturnValue({
      id: 'region-1',
      regionText: 'hello tânisi',
      regionAnalysis: ['hello', 'tânisi'], // LEGACY FORMAT
      transcriptionId: 'transcription-1'
    });

    await checkAndUpgradeLegacyAnalysis('region-1', 'hello tânisi');

    // Should have created and executed AnalyzeRegionTextUseCase
    expect(mockAnalyzeRegionTextUseCase).toHaveBeenCalledWith({
      regionId: 'region-1',
      text: 'hello tânisi',
      services,
      store: services.storeService
    });

    expect(mockExecute).toHaveBeenCalled();
  });

  it('should not upgrade new format analysis', async () => {
    // Mock a region with new WordAnalysis[] format
    mockServices.storeService.regionById.mockReturnValue({
      id: 'region-1',
      regionText: 'hello tânisi',
      regionAnalysis: [
        { word: 'hello', analysis: 'hello+IPC', allAnalysis: ['hello+IPC'] },
        { word: 'tânisi', analysis: 'tânisi+IPC', allAnalysis: ['tânisi+IPC'] }
      ],
      transcriptionId: 'transcription-1'
    });

    await checkAndUpgradeLegacyAnalysis('region-1', 'hello tânisi');

    // Should not have created AnalyzeRegionTextUseCase
    expect(mockAnalyzeRegionTextUseCase).not.toHaveBeenCalled();
  });

  it('should handle regions with no analysis', async () => {
    // Mock a region with no analysis
    mockServices.storeService.regionById.mockReturnValue({
      id: 'region-1',
      regionText: 'hello tânisi',
      regionAnalysis: [],
      transcriptionId: 'transcription-1'
    });

    await checkAndUpgradeLegacyAnalysis('region-1', 'hello tânisi');

    // Should not have created AnalyzeRegionTextUseCase
    expect(mockAnalyzeRegionTextUseCase).not.toHaveBeenCalled();
  });

  it('should handle missing regions gracefully', async () => {
    mockServices.storeService.regionById.mockReturnValue(null);

    // Should not throw
    await expect(checkAndUpgradeLegacyAnalysis('region-1', 'hello tânisi')).resolves.toBeUndefined();
    
    expect(mockAnalyzeRegionTextUseCase).not.toHaveBeenCalled();
  });

  it('should retry when transcription language is not available yet', async () => {
    jest.useFakeTimers();
    
    // Mock a region with legacy analysis but no transcription language initially
    const regionWithLegacyData = {
      id: 'region-1',
      regionText: 'hello tânisi',
      regionAnalysis: ['hello', 'tânisi'], // LEGACY FORMAT
      transcriptionId: 'transcription-1'
    };

    mockServices.storeService.regionById.mockReturnValue(regionWithLegacyData);
    
    // First call - no language available
    mockServices.storeService.transcription = { lang: null };

    const promise = checkAndUpgradeLegacyAnalysis('region-1', 'hello tânisi');

    // Should not have called AnalyzeRegionTextUseCase immediately
    expect(mockAnalyzeRegionTextUseCase).not.toHaveBeenCalled();

    // Simulate language becoming available
    mockServices.storeService.transcription = { lang: 'crk' };

    // Fast forward the retry timeout
    jest.advanceTimersByTime(100);
    
    await promise;

    // Should have called AnalyzeRegionTextUseCase on retry
    expect(mockAnalyzeRegionTextUseCase).toHaveBeenCalledWith({
      regionId: 'region-1',
      text: 'hello tânisi',
      services,
      store: services.storeService
    });

    jest.useRealTimers();
  });
});
