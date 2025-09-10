import { NavigateIssueRegions } from './navigate-issue-regions';
import { SelectAndPlayRegion } from './select-and-play-region';

// Mock the SelectAndPlayRegion
jest.mock('./select-and-play-region');
const MockSelectAndPlayRegion = SelectAndPlayRegion as jest.MockedClass<typeof SelectAndPlayRegion>;

// Mock services
jest.mock('../services', () => ({
  services: {
    wavesurferService: {
      seekToRegion: jest.fn(),
      play: jest.fn(),
    },
    browserService: {
      updateUrl: jest.fn(),
      setSelectedRegion: jest.fn(),
    },
  },
}));

describe('NavigateIssueRegions', () => {
  const mockStore = {
    regionById: jest.fn(),
    setSelectedRegion: jest.fn(),
    transcription: { id: 'transcription-1', title: 'Test Transcription' },
    regions: [],
    issuesByRegionMap: {},
    selectedRegionId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockSelectAndPlayRegion.mockClear();
  });

  it('should navigate to next region with unresolved issues', () => {
    // Setup mock state
    mockStore.regions = [
      { id: 'region-1' },
      { id: 'region-2' },
      { id: 'region-3' },
    ];
    mockStore.issuesByRegionMap = {
      'region-1': [{ resolved: true }], // resolved
      'region-2': [{ resolved: false }], // unresolved
      'region-3': [{ resolved: false }], // unresolved
    };
    mockStore.selectedRegionId = 'region-1';

    const useCase = new NavigateIssueRegions({
      direction: 'next',
      store: mockStore,
    });

    const result = useCase.execute();

    expect(result).toBe('region-2');
    expect(MockSelectAndPlayRegion).toHaveBeenCalledWith({
      regionId: 'region-2',
      services: expect.anything(),
      store: mockStore,
    });
  });

  it('should navigate to previous region with unresolved issues', () => {
    // Setup mock state
    mockStore.regions = [
      { id: 'region-1' },
      { id: 'region-2' },
      { id: 'region-3' },
    ];
    mockStore.issuesByRegionMap = {
      'region-1': [{ resolved: false }], // unresolved
      'region-2': [{ resolved: true }], // resolved
      'region-3': [{ resolved: false }], // unresolved
    };
    mockStore.selectedRegionId = 'region-3';

    const useCase = new NavigateIssueRegions({
      direction: 'prev',
      store: mockStore,
    });

    const result = useCase.execute();

    expect(result).toBe('region-1');
    expect(MockSelectAndPlayRegion).toHaveBeenCalledWith({
      regionId: 'region-1',
      services: expect.anything(),
      store: mockStore,
    });
  });

  it('should wrap around when no regions found in direction', () => {
    // Setup mock state
    mockStore.regions = [
      { id: 'region-1' },
      { id: 'region-2' },
      { id: 'region-3' },
    ];
    mockStore.issuesByRegionMap = {
      'region-1': [{ resolved: false }], // unresolved
      'region-2': [{ resolved: true }], // resolved
      'region-3': [{ resolved: true }], // resolved
    };
    mockStore.selectedRegionId = 'region-3'; // at end, going next should wrap to region-1

    const useCase = new NavigateIssueRegions({
      direction: 'next',
      store: mockStore,
    });

    const result = useCase.execute();

    expect(result).toBe('region-1');
    expect(MockSelectAndPlayRegion).toHaveBeenCalledWith({
      regionId: 'region-1',
      services: expect.anything(),
      store: mockStore,
    });
  });

  it('should return null when no regions with unresolved issues exist', () => {
    // Setup mock state
    mockStore.regions = [
      { id: 'region-1' },
      { id: 'region-2' },
    ];
    mockStore.issuesByRegionMap = {
      'region-1': [{ resolved: true }], // resolved
      'region-2': [{ resolved: true }], // resolved
    };
    mockStore.selectedRegionId = 'region-1';

    const useCase = new NavigateIssueRegions({
      direction: 'next',
      store: mockStore,
    });

    const result = useCase.execute();

    expect(result).toBe(null);
    expect(MockSelectAndPlayRegion).not.toHaveBeenCalled();
  });

  it('should return null when no regions exist', () => {
    // Setup mock state
    mockStore.regions = [];
    mockStore.issuesByRegionMap = {};
    mockStore.selectedRegionId = null;

    const useCase = new NavigateIssueRegions({
      direction: 'next',
      store: mockStore,
    });

    const result = useCase.execute();

    expect(result).toBe(null);
    expect(MockSelectAndPlayRegion).not.toHaveBeenCalled();
  });
});