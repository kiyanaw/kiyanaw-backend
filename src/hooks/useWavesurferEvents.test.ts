import { renderHook } from '@testing-library/react';
import { useWavesurferEvents } from './useWavesurferEvents';
import { useEditorStore } from '../stores/useEditorStore';
import { wavesurferService } from '../services/wavesurferService';
import { services } from '../services';
import { CreateRegion } from '../use-cases/create-region';

// Mock the dependencies
jest.mock('../stores/useEditorStore');
jest.mock('../services/wavesurferService');
jest.mock('../services');
jest.mock('../use-cases/create-region');

describe('useWavesurferEvents', () => {
  // Mock implementations
  const mockExecute = jest.fn();
  const mockClearAllListeners = jest.fn();
  const mockOn = jest.fn();
  const mockStore = {
    setFullTranscriptionData: jest.fn(),
    cleanup: jest.fn(),
  };
  const mockRegions = [
    { id: 'region1', start: 0, end: 10 },
    { id: 'region2', start: 15, end: 25 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock CreateRegion constructor and methods
    (CreateRegion as jest.MockedClass<typeof CreateRegion>).mockImplementation(() => ({
      execute: mockExecute,
      validate: jest.fn(),
    } as any));

    // Mock useEditorStore hook to return regions
    (useEditorStore as any).mockImplementation((selector: any) => {
      if (selector) {
        return selector({ regions: mockRegions });
      }
      return mockRegions;
    });

    // Mock useEditorStore.getState()
    (useEditorStore.getState as jest.Mock).mockReturnValue(mockStore);

    // Mock wavesurferService methods
    (wavesurferService.clearAllListeners as jest.Mock).mockImplementation(mockClearAllListeners);
    (wavesurferService.on as jest.Mock).mockImplementation(mockOn);
  });

  describe('debouncing behavior with useRef', () => {
    it('should initialize event listeners when transcriptionId is provided for the first time', () => {
      const transcriptionId = 'test-transcription-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledWith('region-created', expect.any(Function));
    });

    it('should NOT reinitialize event listeners when the same transcriptionId is used', () => {
      const transcriptionId = 'test-transcription-1';

      // First render
      const { rerender } = renderHook(
        ({ id }) => useWavesurferEvents(id),
        { initialProps: { id: transcriptionId } }
      );

      // Clear mocks after first render
      jest.clearAllMocks();

      // Re-render with the same transcriptionId
      rerender({ id: transcriptionId });

      expect(mockClearAllListeners).not.toHaveBeenCalled();
      expect(mockOn).not.toHaveBeenCalled();
    });

    it('should reinitialize event listeners when transcriptionId changes', () => {
      const initialId = 'test-transcription-1';
      const newId = 'test-transcription-2';

      const { rerender } = renderHook(
        ({ id }) => useWavesurferEvents(id),
        { initialProps: { id: initialId } }
      );

      // Verify first initialization
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);

      // Clear mocks and change to new ID
      jest.clearAllMocks();
      rerender({ id: newId });

      // Verify second initialization
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledWith('region-created', expect.any(Function));
    });

    it('should handle multiple rapid re-renders with the same transcriptionId correctly', () => {
      const transcriptionId = 'test-transcription-1';

      const { rerender } = renderHook(
        ({ id }) => useWavesurferEvents(id),
        { initialProps: { id: transcriptionId } }
      );

      // Multiple re-renders with same ID
      rerender({ id: transcriptionId });
      rerender({ id: transcriptionId });
      rerender({ id: transcriptionId });

      // Should only initialize once (from initial render)
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined transcriptionId correctly', () => {
      const transcriptionId = undefined as any;

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Similar to useTranscription, undefined !== undefined is false on first call
      // because lastCalledRef.current starts as undefined
      expect(mockClearAllListeners).not.toHaveBeenCalled();
      expect(mockOn).not.toHaveBeenCalled();
    });
  });

  describe('event listener management', () => {
    it('should clear all existing listeners before registering new ones', () => {
      const transcriptionId = 'test-transcription-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);
      
      // Verify clearAllListeners is called before registering new listeners
      const clearCallOrder = mockClearAllListeners.mock.invocationCallOrder[0];
      const onCallOrder = mockOn.mock.invocationCallOrder[0];
      expect(clearCallOrder).toBeLessThan(onCallOrder);
    });

    it('should register region-created event listener with correct parameters', () => {
      const transcriptionId = 'test-transcription-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      expect(mockOn).toHaveBeenCalledWith('region-created', expect.any(Function));
    });

    it('should log initialization message', () => {
      const transcriptionId = 'test-transcription-1';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      renderHook(() => useWavesurferEvents(transcriptionId));

      expect(consoleSpy).toHaveBeenCalledWith('initializing for transcription:', transcriptionId);
      
      consoleSpy.mockRestore();
    });
  });

  describe('region-created event handling', () => {
    it('should create and execute CreateRegion use case when region-created event fires', () => {
      const transcriptionId = 'test-transcription-1';
      const eventData = {
        id: 'new-region-id',
        start: 5.5,
        end: 12.3,
      };

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get the event handler function that was registered
      const eventHandler = mockOn.mock.calls[0][1];

      // Simulate the event firing
      eventHandler(eventData);

      expect(CreateRegion).toHaveBeenCalledWith({
        transcriptionId,
        newRegion: {
          id: eventData.id,
          start: eventData.start,
          end: eventData.end,
        },
        regions: mockRegions,
        services,
        store: mockStore,
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should handle region-created event with different data correctly', () => {
      const transcriptionId = 'test-transcription-2';
      const eventData = {
        id: 'another-region-id',
        start: 0,
        end: 30.75,
      };

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get the event handler function
      const eventHandler = mockOn.mock.calls[0][1];

      // Simulate the event
      eventHandler(eventData);

      expect(CreateRegion).toHaveBeenCalledWith({
        transcriptionId,
        newRegion: {
          id: eventData.id,
          start: eventData.start,
          end: eventData.end,
        },
        regions: mockRegions,
        services,
        store: mockStore,
      });
    });

    it('should log event data when region-created fires', () => {
      const transcriptionId = 'test-transcription-1';
      const eventData = { id: 'test-region', start: 1, end: 2 };
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get and call the event handler
      const eventHandler = mockOn.mock.calls[0][1];
      eventHandler(eventData);

      expect(consoleSpy).toHaveBeenCalledWith('got event here', eventData);
      
      consoleSpy.mockRestore();
    });

    it('should get fresh store state and regions for each event', () => {
      const transcriptionId = 'test-transcription-1';
      const eventData = { id: 'test-region', start: 1, end: 2 };

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get and call the event handler
      const eventHandler = mockOn.mock.calls[0][1];
      eventHandler(eventData);

      // Verify fresh store state is retrieved
      expect(useEditorStore.getState).toHaveBeenCalled();
      
      // Verify regions from useEditorStore selector are used
      expect(CreateRegion).toHaveBeenCalledWith(
        expect.objectContaining({
          regions: mockRegions,
          store: mockStore,
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should work correctly when transcriptionId changes from undefined to defined', () => {
      const { rerender } = renderHook(
        ({ id }) => useWavesurferEvents(id),
        { initialProps: { id: undefined as any } }
      );

      // Should not initialize on undefined
      expect(mockClearAllListeners).not.toHaveBeenCalled();
      expect(mockOn).not.toHaveBeenCalled();

      // Change to defined value
      rerender({ id: 'defined-transcription-id' });

      // Should initialize now
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);
    });

    it('should work correctly when transcriptionId changes from defined to undefined', () => {
      const { rerender } = renderHook(
        ({ id }) => useWavesurferEvents(id),
        { initialProps: { id: 'defined-transcription-id' } }
      );

      // Should initialize on first defined value
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);

      // Clear mocks
      jest.clearAllMocks();

      // Change to undefined
      rerender({ id: undefined as any });

      // Should initialize again because 'defined-transcription-id' !== undefined
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);
    });

    it('should handle empty string transcriptionId', () => {
      const transcriptionId = '';

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Should initialize with empty string
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(1);

      // Verify event handler works with empty transcriptionId
      const eventHandler = mockOn.mock.calls[0][1];
      const eventData = { id: 'test-region', start: 1, end: 2 };
      eventHandler(eventData);

      expect(CreateRegion).toHaveBeenCalledWith(
        expect.objectContaining({
          transcriptionId: '',
        })
      );
    });
  });
}); 