import { renderHook } from '@testing-library/react';
import { useWavesurferEvents } from './useWavesurferEvents';
import { useEditorStore } from '../stores/useEditorStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { wavesurferService } from '../services/wavesurferService';
import { browserService } from '../services/browserService';
import { services } from '../services';
import { CreateRegion } from '../use-cases/create-region';

// Mock the dependencies
jest.mock('../stores/useEditorStore');
jest.mock('../stores/usePlayerStore');
jest.mock('../services/wavesurferService');
jest.mock('../services/browserService', () => ({
  browserService: {
    addCustomStyle: jest.fn(),
    removeCustomStyle: jest.fn(),
  },
}));
jest.mock('../services', () => ({
  services: {
    browserService: {
      addCustomStyle: jest.fn(),
      removeCustomStyle: jest.fn(),
    },
  },
}));
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
  const mockPlayerStore = {
    setPlaying: jest.fn(),
    setPaused: jest.fn(),
  };
  const mockRegions = [
    { id: 'region1', start: 0, end: 10 },
    { id: 'region2', start: 15, end: 25 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset DOM mocks
    jest.restoreAllMocks();
    
    // Reset browserService mocks
    (browserService.addCustomStyle as jest.Mock).mockClear();
    (browserService.removeCustomStyle as jest.Mock).mockClear();
    
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

    // Mock usePlayerStore.getState()
    (usePlayerStore.getState as jest.Mock).mockReturnValue(mockPlayerStore);

    // Mock wavesurferService methods
    (wavesurferService.clearAllListeners as jest.Mock).mockImplementation(mockClearAllListeners);
    (wavesurferService.on as jest.Mock).mockImplementation(mockOn);
  });

  describe('debouncing behavior with useRef', () => {
    it('should initialize event listeners when transcriptionId is provided for the first time', () => {
      const transcriptionId = 'test-transcription-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(6);
      expect(mockOn).toHaveBeenCalledWith('region-created', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('region-update-end', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('region-in', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('region-out', expect.any(Function));
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
      expect(mockOn).toHaveBeenCalledTimes(6);

      // Clear mocks and change to new ID
      jest.clearAllMocks();
      rerender({ id: newId });

      // Verify second initialization
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(6);
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
      expect(mockOn).toHaveBeenCalledTimes(6);
    });

    it('should handle undefined transcriptionId correctly', () => {
      const transcriptionId = undefined as any;

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Similar to useLoadTranscription, undefined !== undefined is false on first call
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
      expect(mockOn).toHaveBeenCalledTimes(6);
      
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
      expect(mockOn).toHaveBeenCalledTimes(6);
    });

    it('should work correctly when transcriptionId changes from defined to undefined', () => {
      const { rerender } = renderHook(
        ({ id }) => useWavesurferEvents(id),
        { initialProps: { id: 'defined-transcription-id' } }
      );

      // Should initialize on first defined value
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(6);

      // Clear mocks
      jest.clearAllMocks();

      // Change to undefined
      rerender({ id: undefined as any });

      // Should initialize again because 'defined-transcription-id' !== undefined
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(6);
    });

    it('should handle empty string transcriptionId', () => {
      const transcriptionId = '';

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Should initialize with empty string
      expect(mockClearAllListeners).toHaveBeenCalledTimes(1);
      expect(mockOn).toHaveBeenCalledTimes(6);

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

  describe('play and pause event handling', () => {
    it('should call playerStore.setPlaying when play event fires', () => {
      const transcriptionId = 'test-transcription-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Find the play event handler (should be the second registered event)
      const playEventHandler = mockOn.mock.calls.find(call => call[0] === 'play')[1];

      // Simulate the play event firing
      playEventHandler();

      expect(mockPlayerStore.setPlaying).toHaveBeenCalledTimes(1);
    });

    it('should call playerStore.setPaused when pause event fires', () => {
      const transcriptionId = 'test-transcription-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Find the pause event handler (should be the third registered event)
      const pauseEventHandler = mockOn.mock.calls.find(call => call[0] === 'pause')[1];

      // Simulate the pause event firing
      pauseEventHandler();

      expect(mockPlayerStore.setPaused).toHaveBeenCalledTimes(1);
    });

    it('should register both play and pause event listeners', () => {
      const transcriptionId = 'test-transcription-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      expect(mockOn).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('pause', expect.any(Function));
    });


  });

  describe('region playback tracking event handling', () => {
    it('should register both region-in and region-out event listeners', () => {
      const transcriptionId = 'test-transcription-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      expect(mockOn).toHaveBeenCalledWith('region-in', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('region-out', expect.any(Function));
    });

    // TODO: Fix DOM mocking issues and re-enable these tests
    // it('should create stylesheet and add CSS rule when region-in event fires', () => {
    //   // Test implementation here...
    // });

    // it('should clear all CSS rules when region-out event fires', () => {
    //   // Test implementation here...
    // });

    // it('should handle region-out when stylesheet does not exist', () => {
    //   // Test implementation here...
    // });
  });

  describe('inbound region highlighting', () => {
    let mockAddCustomStyle: jest.Mock;
    let mockRemoveCustomStyle: jest.Mock;

    beforeEach(() => {
      // Get references to the mocked functions
      mockAddCustomStyle = browserService.addCustomStyle as jest.Mock;
      mockRemoveCustomStyle = browserService.removeCustomStyle as jest.Mock;
      
      // Set up default return value
      mockAddCustomStyle.mockReturnValue('test-style-id');
    });

    it('should highlight region in list when region-in event fires', () => {
      const transcriptionId = 'test-transcription-1';
      const regionId = 'test-region-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get the region-in event handler
      const regionInHandler = mockOn.mock.calls.find(call => call[0] === 'region-in')[1];

      // Simulate region-in event
      regionInHandler({ regionId });

      expect(mockAddCustomStyle).toHaveBeenCalledWith(
        `div#regionitem-${regionId}`,
        { 'background-color': 'rgba(0, 213, 255, 0.1) !important' }
      );
    });

    it('should clear previous region highlight when new region-in event fires', () => {
      const transcriptionId = 'test-transcription-1';
      const firstRegionId = 'test-region-1';
      const secondRegionId = 'test-region-2';

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get the region-in event handler
      const regionInHandler = mockOn.mock.calls.find(call => call[0] === 'region-in')[1];

      // Simulate first region-in event
      regionInHandler({ regionId: firstRegionId });
      expect(mockAddCustomStyle).toHaveBeenCalledTimes(1);

      // Simulate second region-in event (should clear first)
      regionInHandler({ regionId: secondRegionId });

      // Should remove the previous style and add new one
      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('test-style-id');
      expect(mockAddCustomStyle).toHaveBeenCalledTimes(2);
      expect(mockAddCustomStyle).toHaveBeenNthCalledWith(2,
        `div#regionitem-${secondRegionId}`,
        { 'background-color': 'rgba(0, 213, 255, 0.1) !important' }
      );
    });

    it('should remove region highlight when region-out event fires', () => {
      const transcriptionId = 'test-transcription-1';
      const regionId = 'test-region-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get event handlers
      const regionInHandler = mockOn.mock.calls.find(call => call[0] === 'region-in')[1];
      const regionOutHandler = mockOn.mock.calls.find(call => call[0] === 'region-out')[1];

      // Simulate region-in event first
      regionInHandler({ regionId });
      expect(mockAddCustomStyle).toHaveBeenCalledWith(
        `div#regionitem-${regionId}`,
        { 'background-color': 'rgba(0, 213, 255, 0.1) !important' }
      );

      // Simulate region-out event
      regionOutHandler({ regionId });

      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('test-style-id');
    });

    it('should handle region-out event for region that was never highlighted', () => {
      const transcriptionId = 'test-transcription-1';
      const regionId = 'test-region-1';

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get the region-out event handler
      const regionOutHandler = mockOn.mock.calls.find(call => call[0] === 'region-out')[1];

      // Simulate region-out event without prior region-in
      expect(() => regionOutHandler({ regionId })).not.toThrow();
      expect(mockRemoveCustomStyle).not.toHaveBeenCalled();
    });

    it('should handle multiple region transitions correctly', () => {
      const transcriptionId = 'test-transcription-1';
      const region1 = 'test-region-1';
      const region2 = 'test-region-2';
      const region3 = 'test-region-3';

      // Set up different style IDs for each call
      mockAddCustomStyle
        .mockReturnValueOnce('style-id-1')
        .mockReturnValueOnce('style-id-2')
        .mockReturnValueOnce('style-id-3');

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get event handlers
      const regionInHandler = mockOn.mock.calls.find(call => call[0] === 'region-in')[1];
      const regionOutHandler = mockOn.mock.calls.find(call => call[0] === 'region-out')[1];

      // Simulate: region1 in -> region2 in (clears region1) -> region2 out -> region3 in
      regionInHandler({ regionId: region1 });
      expect(mockAddCustomStyle).toHaveBeenCalledTimes(1);

      regionInHandler({ regionId: region2 });
      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('style-id-1'); // Clear region1
      expect(mockAddCustomStyle).toHaveBeenCalledTimes(2);

      regionOutHandler({ regionId: region2 });
      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('style-id-2'); // Clear region2

      regionInHandler({ regionId: region3 });
      expect(mockAddCustomStyle).toHaveBeenCalledTimes(3); // No previous to clear
    });

    it('should track inbound region correctly across multiple transitions', () => {
      const transcriptionId = 'test-transcription-1';
      const region1 = 'test-region-1';
      const region2 = 'test-region-2';

      mockAddCustomStyle
        .mockReturnValueOnce('style-id-1')
        .mockReturnValueOnce('style-id-2');

      renderHook(() => useWavesurferEvents(transcriptionId));

      // Get event handlers
      const regionInHandler = mockOn.mock.calls.find(call => call[0] === 'region-in')[1];
      const regionOutHandler = mockOn.mock.calls.find(call => call[0] === 'region-out')[1];

      // Enter region1, then region2 (should clear region1), then try to exit region1 (should do nothing)
      regionInHandler({ regionId: region1 });
      regionInHandler({ regionId: region2 }); // Should clear region1 automatically
      
      // Reset mocks to see only new calls
      mockRemoveCustomStyle.mockClear();
      
      // Try to exit region1 - should do nothing since region2 is currently tracked
      regionOutHandler({ regionId: region1 });
      expect(mockRemoveCustomStyle).not.toHaveBeenCalled();

      // Exit region2 - should work since it's the currently tracked region
      regionOutHandler({ regionId: region2 });
      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('style-id-2');
    });
  });

  describe('complete event flow', () => {
  });

  describe('cleanup', () => {
    let mockAddCustomStyle: jest.Mock;
    let mockRemoveCustomStyle: jest.Mock;

    beforeEach(() => {
      // Get references to the mocked functions
      mockAddCustomStyle = browserService.addCustomStyle as jest.Mock;
      mockRemoveCustomStyle = browserService.removeCustomStyle as jest.Mock;
      
      // Set up default return value
      mockAddCustomStyle.mockReturnValue('test-style-id');
    });

    it('should clean up highlighting styles when component unmounts', () => {
      const transcriptionId = 'test-transcription-1';
      const regionId = 'test-region-1';

      const { unmount } = renderHook(() => useWavesurferEvents(transcriptionId));

      // Get the region-in event handler and simulate highlighting
      const regionInHandler = mockOn.mock.calls.find(call => call[0] === 'region-in')[1];
      regionInHandler({ regionId });

      expect(mockAddCustomStyle).toHaveBeenCalledWith(
        `div#regionitem-${regionId}`,
        { 'background-color': 'rgba(0, 213, 255, 0.1) !important' }
      );

      // Unmount the component
      unmount();

      // Should clean up the highlighting style
      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('test-style-id');
    });

    it('should clean up highlighting styles when transcription changes', () => {
      const transcriptionId1 = 'test-transcription-1';
      const transcriptionId2 = 'test-transcription-2';
      const regionId = 'test-region-1';

      const { rerender } = renderHook(
        ({ transcriptionId }) => useWavesurferEvents(transcriptionId),
        { initialProps: { transcriptionId: transcriptionId1 } }
      );

      // Get the region-in event handler and simulate highlighting
      const regionInHandler = mockOn.mock.calls.find(call => call[0] === 'region-in')[1];
      regionInHandler({ regionId });

      expect(mockAddCustomStyle).toHaveBeenCalledWith(
        `div#regionitem-${regionId}`,
        { 'background-color': 'rgba(0, 213, 255, 0.1) !important' }
      );

      // Change transcription (this triggers cleanup)
      rerender({ transcriptionId: transcriptionId2 });

      // Should clean up the highlighting style
      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('test-style-id');
    });

    it('should clean up multiple highlighting styles', () => {
      const transcriptionId = 'test-transcription-1';
      const region1 = 'test-region-1';
      const region2 = 'test-region-2';

      mockAddCustomStyle
        .mockReturnValueOnce('style-id-1')
        .mockReturnValueOnce('style-id-2');

      const { unmount } = renderHook(() => useWavesurferEvents(transcriptionId));

      // Get the region-in event handler and simulate multiple highlights
      const regionInHandler = mockOn.mock.calls.find(call => call[0] === 'region-in')[1];
      
      // Add two highlights (the second one should automatically clear the first)
      regionInHandler({ regionId: region1 });
      regionInHandler({ regionId: region2 });

      // Only the second style should remain active
      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('style-id-1');

      // Reset mocks to see only cleanup calls
      mockRemoveCustomStyle.mockClear();

      // Unmount should clean up the remaining style
      unmount();

      expect(mockRemoveCustomStyle).toHaveBeenCalledWith('style-id-2');
    });
  });
}); 