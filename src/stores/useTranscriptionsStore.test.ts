import { act, renderHook } from '@testing-library/react';
import { useTranscriptionsStore } from './useTranscriptionsStore';

// Mock AWS Amplify DataStore
jest.mock('@aws-amplify/datastore', () => ({
  DataStore: {
    query: jest.fn(),
  },
}));

// Mock the models
jest.mock('../models', () => ({
  Transcription: jest.fn(),
}));

import { DataStore } from '@aws-amplify/datastore';
import { Transcription } from '../models';

const mockDataStore = DataStore as jest.Mocked<typeof DataStore>;

describe('useTranscriptionsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTranscriptionsStore.getState().transcriptions = [];
    useTranscriptionsStore.getState().loading = false;
    useTranscriptionsStore.getState().error = null;
    // Clear mocks
    jest.clearAllMocks();
  });

  it('should have initial state with empty transcriptions, loading false, and no error', () => {
    const { result } = renderHook(() => useTranscriptionsStore());
    
    expect(result.current.transcriptions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set loading to true initially when loadTranscriptions is called', async () => {
    const { result } = renderHook(() => useTranscriptionsStore());
    
    // Mock a successful DataStore query
    mockDataStore.query.mockResolvedValue([
      { id: '1', title: 'Test Transcription' },
    ] as any);

    // Call loadTranscriptions and check loading state immediately
    act(() => {
      result.current.loadTranscriptions();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should load transcriptions successfully and set loading to false', async () => {
    const { result } = renderHook(() => useTranscriptionsStore());
    const mockTranscriptions = [
      { id: '1', title: 'Test Transcription 1' },
      { id: '2', title: 'Test Transcription 2' },
    ];

    mockDataStore.query.mockResolvedValue(mockTranscriptions as any);

    await act(async () => {
      await result.current.loadTranscriptions();
    });

    expect(result.current.transcriptions).toEqual(mockTranscriptions);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockDataStore.query).toHaveBeenCalledWith(Transcription);
  });

  it('should set error and loading to false when DataStore query fails', async () => {
    const { result } = renderHook(() => useTranscriptionsStore());
    const mockError = new Error('Network error');

    mockDataStore.query.mockRejectedValue(mockError);

    await act(async () => {
      await result.current.loadTranscriptions();
    });

    expect(result.current.transcriptions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Failed to load transcriptions');
    expect(mockDataStore.query).toHaveBeenCalledWith(Transcription);
  });
}); 