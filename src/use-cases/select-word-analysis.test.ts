import { selectWordAnalysis } from './select-word-analysis';
import { useEditorStore } from '../stores/useEditorStore';
import { UpdateRegionUseCase } from './update-region';

// Mock the update-region module
jest.mock('./update-region', () => ({
  UpdateRegionUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('selectWordAnalysis', () => {
  beforeEach(() => {
    // Clear store
    useEditorStore.getState().cleanup();
    // Clear mocks
    jest.clearAllMocks();
  });

  it('should update the selected analysis and mark as user-selected', async () => {
    const mockRegion = {
      id: 'region-1',
      text: 'anihi test',
      transcriptionId: 'transcription-1',
      start: 0,
      end: 1,
      regionAnalysis: [
        {
          word: 'anihi',
          analysis: 'anihi+Pron+Dem+Med+I+Pl',
          allAnalysis: [
            'anihi+Pron+Dem+Med+I+Pl',
            'anihi+Pron+Dem+Med+A+Obv',
          ],
          source: 'auto' as const,
        },
        {
          word: 'test',
          analysis: 'test+Ipc',
          allAnalysis: ['test+Ipc'],
          source: 'auto' as const,
        },
      ],
    };

    // Set up store with mock region
    useEditorStore.setState({
      regions: [mockRegion],
      regionMap: {
        'region-1': mockRegion,
      },
    });

    // Select the second analysis option
    await selectWordAnalysis('region-1', 0, 'anihi+Pron+Dem+Med+A+Obv');

    // Verify UpdateRegionUseCase was instantiated with correct data
    expect(UpdateRegionUseCase).toHaveBeenCalledWith(
      expect.objectContaining({
        regionId: 'region-1',
        changes: expect.objectContaining({
          regionAnalysis: [
            {
              word: 'anihi',
              analysis: 'anihi+Pron+Dem+Med+A+Obv',
              allAnalysis: [
                'anihi+Pron+Dem+Med+I+Pl',
                'anihi+Pron+Dem+Med+A+Obv',
              ],
              source: 'user',
            },
            {
              word: 'test',
              analysis: 'test+Ipc',
              allAnalysis: ['test+Ipc'],
              source: 'auto',
            },
          ],
        }),
        primaryField: 'regionAnalysis',
      })
    );
  });

  it('should throw error if region not found', async () => {
    await expect(
      selectWordAnalysis('non-existent', 0, 'test')
    ).rejects.toThrow('Region non-existent not found');
  });

  it('should throw error if no analysis data', async () => {
    const mockRegion = {
      id: 'region-1',
      text: 'test',
      transcriptionId: 'transcription-1',
      start: 0,
      end: 1,
      regionAnalysis: [],
    };

    useEditorStore.setState({
      regions: [mockRegion],
      regionMap: {
        'region-1': mockRegion,
      },
    });

    await expect(
      selectWordAnalysis('region-1', 0, 'test')
    ).rejects.toThrow('No analysis data for region region-1');
  });

  it('should throw error if analysis not found at index', async () => {
    const mockRegion = {
      id: 'region-1',
      text: 'test',
      transcriptionId: 'transcription-1',
      start: 0,
      end: 1,
      regionAnalysis: [
        {
          word: 'test',
          analysis: 'test+Ipc',
          allAnalysis: ['test+Ipc'],
          source: 'auto' as const,
        },
      ],
    };

    useEditorStore.setState({
      regions: [mockRegion],
      regionMap: {
        'region-1': mockRegion,
      },
    });

    await expect(
      selectWordAnalysis('region-1', 5, 'test')
    ).rejects.toThrow('No analysis found at index 5 in region region-1');
  });

  it('should throw error if selected analysis not in available analyses', async () => {
    const mockRegion = {
      id: 'region-1',
      text: 'test',
      transcriptionId: 'transcription-1',
      start: 0,
      end: 1,
      regionAnalysis: [
        {
          word: 'test',
          analysis: 'test+Ipc',
          allAnalysis: ['test+Ipc'],
          source: 'auto' as const,
        },
      ],
    };

    useEditorStore.setState({
      regions: [mockRegion],
      regionMap: {
        'region-1': mockRegion,
      },
    });

    await expect(
      selectWordAnalysis('region-1', 0, 'invalid+Analysis')
    ).rejects.toThrow('Selected analysis "invalid+Analysis" not found in available analyses');
  });
});

