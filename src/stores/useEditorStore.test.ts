import { act, renderHook } from '@testing-library/react';

// Mock AWS Amplify DataStore
const mockSubscription = {
  unsubscribe: jest.fn(),
};

const mockDataStore = {
  query: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  observe: jest.fn(() => mockSubscription),
  observeQuery: jest.fn(() => mockSubscription),
};

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: mockDataStore,
}));

// Mock the models
jest.mock('../models', () => ({
  Transcription: {
    copyOf: jest.fn((original, mutator) => {
      const draft = { ...original };
      mutator(draft);
      return draft;
    }),
  },
  Region: jest.fn().mockImplementation((data) => data),
  Issue: jest.fn().mockImplementation((data) => data),
}));

// Mock eventBus
jest.mock('../lib/eventBus', () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

// Mock fetch for peaks data
global.fetch = jest.fn();

import { useEditorStore } from './useEditorStore';

describe('useEditorStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useEditorStore.getState();
    store.cleanup();
    useEditorStore.setState({
      transcription: null,
      loading: false,
      error: null,
      saved: false,
      regions: [],
      regionMap: {},
      selectedRegionId: null,
      selectedRegion: null,
      issues: [],
      issueMap: {},
      _subscriptions: [],
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useEditorStore());
    
    expect(result.current.transcription).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.saved).toBe(false);
    expect(result.current.regions).toEqual([]);
    expect(result.current.regionMap).toEqual({});
    expect(result.current.selectedRegionId).toBeNull();
    expect(result.current.selectedRegion).toBeNull();
    expect(result.current.issues).toEqual([]);
    expect(result.current.issueMap).toEqual({});
  });

  it('should call cleanup before loading new data', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    // Set up some subscriptions first
    useEditorStore.setState({
      _subscriptions: [mockSubscription, mockSubscription],
    });

    const mockTranscription = { id: '1', title: 'Test', source: 'test.mp3' };
    mockDataStore.query.mockResolvedValueOnce(mockTranscription);
    mockDataStore.query.mockResolvedValueOnce([]); // regions
    mockDataStore.query.mockResolvedValueOnce([]); // issues
    
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('No peaks'));

    await act(async () => {
      await result.current.loadData('test-id');
    });

    expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('should load transcription data successfully', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockTranscription = { id: '1', title: 'Test', source: 'test.mp3' };
    const mockRegions = [
      { id: 'r1', start: 0, end: 10, text: 'Hello', isNote: false },
      { id: 'r2', start: 15, end: 20, text: 'World', isNote: true },
    ];
    const mockIssues = [
      { id: 'i1', text: 'Issue 1', comments: '[]', createdAt: '2023-01-01' },
    ];

    mockDataStore.query.mockResolvedValueOnce(mockTranscription);
    mockDataStore.query.mockResolvedValueOnce(mockRegions);
    mockDataStore.query.mockResolvedValueOnce(mockIssues);
    
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('No peaks'));

    await act(async () => {
      await result.current.loadData('test-id');
    });

    expect(result.current.transcription).toEqual(mockTranscription);
    expect(result.current.regions).toHaveLength(2);
    expect(result.current.issues).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load peaks data when available', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockTranscription = { id: '1', title: 'Test', source: 'test.mp3' };
    const mockPeaksData = { data: [1, 2, 3, 4] };

    mockDataStore.query.mockResolvedValueOnce(mockTranscription);
    mockDataStore.query.mockResolvedValueOnce([]); // regions
    mockDataStore.query.mockResolvedValueOnce([]); // issues
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve(mockPeaksData),
    });

    await act(async () => {
      await result.current.loadData('test-id');
    });

    expect(result.current.transcription).toEqual({
      ...mockTranscription,
      peaks: mockPeaksData,
    });
  });

  it('should set error when transcription not found', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    mockDataStore.query.mockResolvedValueOnce(null); // transcription not found

    await act(async () => {
      await result.current.loadData('test-id');
    });

    expect(result.current.error).toBe('Failed to load transcription data');
    expect(result.current.loading).toBe(false);
  });

  it('should set up subscriptions after loading data', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockTranscription = { id: '1', title: 'Test', source: 'test.mp3' };
    mockDataStore.query.mockResolvedValueOnce(mockTranscription);
    mockDataStore.query.mockResolvedValueOnce([]);
    mockDataStore.query.mockResolvedValueOnce([]);
    
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('No peaks'));

    await act(async () => {
      await result.current.loadData('test-id');
    });

    expect(mockDataStore.observe).toHaveBeenCalledWith(expect.anything(), 'test-id');
    expect(mockDataStore.observeQuery).toHaveBeenCalledTimes(2); // regions and issues
    expect(result.current._subscriptions).toHaveLength(3);
  });

  it('should cleanup subscriptions', () => {
    const { result } = renderHook(() => useEditorStore());
    
    // Set up some subscriptions
    useEditorStore.setState({
      _subscriptions: [mockSubscription, mockSubscription],
    });

    act(() => {
      result.current.cleanup();
    });

    expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(2);
    expect(result.current._subscriptions).toEqual([]);
  });

  it('should set selected region', () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockRegion = { id: 'r1', text: 'Test' };
    useEditorStore.setState({
      regionMap: { r1: mockRegion },
    });

    act(() => {
      result.current.setSelectedRegion('r1');
    });

    expect(result.current.selectedRegionId).toBe('r1');
    expect(result.current.selectedRegion).toEqual(mockRegion);
  });

  it('should update transcription', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockTranscription = { id: '1', title: 'Test' };
    const updatedTranscription = { id: '1', title: 'Updated Test' };
    
    useEditorStore.setState({ transcription: mockTranscription });
    mockDataStore.save.mockResolvedValueOnce(updatedTranscription);

    await act(async () => {
      await result.current.updateTranscription({ title: 'Updated Test' });
    });

    expect(mockDataStore.save).toHaveBeenCalled();
    expect(result.current.transcription).toEqual(updatedTranscription);
    expect(result.current.saved).toBe(true);
  });

  it('should create region', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockTranscription = { id: '1', title: 'Test' };
    const newRegion = { start: 0, end: 10, text: 'New region' };
    
    useEditorStore.setState({ transcription: mockTranscription });
    mockDataStore.save.mockResolvedValueOnce({ id: 'r1', ...newRegion });

    await act(async () => {
      await result.current.createRegion(newRegion);
    });

    expect(mockDataStore.save).toHaveBeenCalled();
  });

  it('should update region', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockRegion = { id: 'r1', start: 0, end: 10, text: 'Test' };
    mockDataStore.query.mockResolvedValueOnce(mockRegion);
    mockDataStore.save.mockResolvedValueOnce({ ...mockRegion, text: 'Updated' });

    await act(async () => {
      await result.current.updateRegion('r1', { text: 'Updated' });
    });

    expect(mockDataStore.query).toHaveBeenCalledWith(expect.anything(), 'r1');
    expect(mockDataStore.save).toHaveBeenCalled();
  });

  it('should create issue', async () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockTranscription = { id: '1', title: 'Test' };
    const issueData = {
      text: 'Test issue',
      type: 'error',
      owner: 'user1',
      resolved: false,
    };
    
    useEditorStore.setState({ transcription: mockTranscription });
    mockDataStore.query.mockResolvedValueOnce([]); // existing issues
    mockDataStore.save.mockResolvedValueOnce({ id: 'i1', ...issueData });

    await act(async () => {
      await result.current.createIssue(issueData);
    });

    expect(mockDataStore.save).toHaveBeenCalled();
  });

  it('should provide computed getters', () => {
    const { result } = renderHook(() => useEditorStore());
    
    const mockRegion = { id: 'r1', text: 'Test' };
    const mockIssue = { id: 'i1', text: 'Issue', regionId: 'r1' };
    
    useEditorStore.setState({
      regionMap: { r1: mockRegion },
      issueMap: { i1: mockIssue },
      issues: [mockIssue],
    });

    expect(result.current.regionById('r1')).toEqual(mockRegion);
    expect(result.current.issueById('i1')).toEqual(mockIssue);
    expect(result.current.issuesByRegion('r1')).toEqual([mockIssue]);
  });
}); 