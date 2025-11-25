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

  it('should update only the specific occurrence of a duplicate word', async () => {
    const mockRegion = {
      id: 'region-1',
      text: 'isi foo isi',
      transcriptionId: 'transcription-1',
      start: 0,
      end: 1,
      regionAnalysis: [
        {
          word: 'isi',
          analysis: 'isi+Ipc',
          allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
          source: 'auto' as const,
          index: 0,
        },
        {
          word: 'foo',
          analysis: 'foo+N',
          allAnalysis: ['foo+N'],
          source: 'auto' as const,
          index: 1,
        },
        {
          word: 'isi',
          analysis: 'isi+Ipc',
          allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
          source: 'auto' as const,
          index: 2,
        },
      ],
    };

    useEditorStore.setState({
      regions: [mockRegion],
      regionMap: {
        'region-1': mockRegion,
      },
    });

    // Select analysis for the FIRST 'isi' (index 0)
    await selectWordAnalysis('region-1', 0, 'itêw+V+TA+Imp+Imm+2Sg+3SgO');

    // Verify only the first 'isi' was updated
    expect(UpdateRegionUseCase).toHaveBeenCalledWith(
      expect.objectContaining({
        regionId: 'region-1',
        changes: expect.objectContaining({
          regionAnalysis: [
            {
              word: 'isi',
              analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO',
              allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
              source: 'user',
              index: 0,
            },
            {
              word: 'foo',
              analysis: 'foo+N',
              allAnalysis: ['foo+N'],
              source: 'auto',
              index: 1,
            },
            {
              word: 'isi',
              analysis: 'isi+Ipc',
              allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
              source: 'auto',
              index: 2,
            },
          ],
        }),
      })
    );
  });

  it('should handle selecting different analyses for different occurrences of the same word', async () => {
    const mockRegion = {
      id: 'region-1',
      text: 'isi isi isi',
      transcriptionId: 'transcription-1',
      start: 0,
      end: 1,
      regionAnalysis: [
        {
          word: 'isi',
          analysis: 'isi+Ipc',
          allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
          source: 'auto' as const,
          index: 0,
        },
        {
          word: 'isi',
          analysis: 'isi+Ipc',
          allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
          source: 'auto' as const,
          index: 1,
        },
        {
          word: 'isi',
          analysis: 'isi+Ipc',
          allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
          source: 'auto' as const,
          index: 2,
        },
      ],
    };

    useEditorStore.setState({
      regions: [mockRegion],
      regionMap: {
        'region-1': mockRegion,
      },
    });

    // Select first analysis for the first 'isi'
    await selectWordAnalysis('region-1', 0, 'itêw+V+TA+Imp+Imm+2Sg+3SgO');

    // Clear mock to check next call
    jest.clearAllMocks();

    // Update store with the new state after first selection
    const updatedRegion = {
      ...mockRegion,
      regionAnalysis: [
        {
          word: 'isi',
          analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO',
          allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
          source: 'user' as const,
          index: 0,
        },
        {
          word: 'isi',
          analysis: 'isi+Ipc',
          allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
          source: 'auto' as const,
          index: 1,
        },
        {
          word: 'isi',
          analysis: 'isi+Ipc',
          allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
          source: 'auto' as const,
          index: 2,
        },
      ],
    };

    useEditorStore.setState({
      regions: [updatedRegion],
      regionMap: {
        'region-1': updatedRegion,
      },
    });

    // Select second analysis for the third 'isi' (index 2)
    await selectWordAnalysis('region-1', 2, 'isi+Ipc');

    // Verify the third 'isi' was updated and others remain unchanged
    expect(UpdateRegionUseCase).toHaveBeenCalledWith(
      expect.objectContaining({
        regionId: 'region-1',
        changes: expect.objectContaining({
          regionAnalysis: [
            {
              word: 'isi',
              analysis: 'itêw+V+TA+Imp+Imm+2Sg+3SgO',
              allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
              source: 'user',
              index: 0,
            },
            {
              word: 'isi',
              analysis: 'isi+Ipc',
              allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
              source: 'auto',
              index: 1,
            },
            {
              word: 'isi',
              analysis: 'isi+Ipc',
              allAnalysis: ['itêw+V+TA+Imp+Imm+2Sg+3SgO', 'isi+Ipc'],
              source: 'user',
              index: 2,
            },
          ],
        }),
      })
    );
  });
});

