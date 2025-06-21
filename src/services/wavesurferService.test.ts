// Mock the modules first
jest.mock('wavesurfer.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('wavesurfer.js/dist/plugins/timeline.esm.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

import { wavesurferService } from './wavesurferService';
import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';

// Get the mocked modules
const mockWaveSurfer = WaveSurfer as jest.Mocked<typeof WaveSurfer>;
const mockRegionsPlugin = Regions as jest.Mocked<typeof Regions>;
const mockTimelinePlugin = Timeline as jest.Mocked<typeof Timeline>;

describe('WaveSurferService', () => {
  let mockContainer: HTMLElement;
  let mockTimelineContainer: HTMLElement;
  let mockWaveSurferInstance: any;
  let mockRegionsInstance: any;
  let mockTimelineInstance: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock DOM elements
    mockContainer = document.createElement('div');
    mockTimelineContainer = document.createElement('div');
    
    // Create mock instances
    mockWaveSurferInstance = {
      load: jest.fn(),
      zoom: jest.fn(),
      setMediaElement: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      setTime: jest.fn(),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      playPause: jest.fn().mockResolvedValue(undefined),
    };
    
    mockRegionsInstance = {
      enableDragSelection: jest.fn(),
      addRegion: jest.fn(),
      clearRegions: jest.fn(),
      on: jest.fn(),
      getRegions: jest.fn().mockReturnValue([]),
    };
    
    mockTimelineInstance = {};
    
    // Setup mock returns
    mockWaveSurfer.create.mockReturnValue(mockWaveSurferInstance);
    mockRegionsPlugin.create.mockReturnValue(mockRegionsInstance);
    mockTimelinePlugin.create.mockReturnValue(mockTimelineInstance);
    
    // Reset the service state by destroying any existing instance
    wavesurferService.destroy();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = wavesurferService;
      const instance2 = wavesurferService;
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize WaveSurfer with correct configuration', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      expect(mockRegionsPlugin.create).toHaveBeenCalled();
      expect(mockTimelinePlugin.create).toHaveBeenCalledWith({
        container: mockTimelineContainer,
      });
      
      expect(mockWaveSurfer.create).toHaveBeenCalledWith({
        container: mockContainer,
        waveColor: '#305880',
        progressColor: '#162738',
        barWidth: 2,
        height: 128,
        minPxPerSec: 20,
        plugins: [mockRegionsInstance, mockTimelineInstance],
      });
      
      expect(mockRegionsInstance.enableDragSelection).toHaveBeenCalledWith({}, 5);
    });

    it('should return existing instance if already initialized with same containers', () => {
      const instance1 = wavesurferService.initialize(mockContainer, mockTimelineContainer);
      const instance2 = wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      expect(instance1).toBe(instance2);
      expect(mockWaveSurfer.create).toHaveBeenCalledTimes(1);
    });

    it('should detect container changes and recreate instance', () => {
      // First initialization
      const instance1 = wavesurferService.initialize(mockContainer, mockTimelineContainer);
      expect(mockWaveSurfer.create).toHaveBeenCalledTimes(1);
      expect(mockWaveSurferInstance.destroy).not.toHaveBeenCalled();
      
      // Create new containers
      const newContainer = document.createElement('div');
      const newTimelineContainer = document.createElement('div');
      
      // Second initialization with different containers
      const instance2 = wavesurferService.initialize(newContainer, newTimelineContainer);
      
      // Should destroy old instance
      expect(mockWaveSurferInstance.destroy).toHaveBeenCalled();
      // Should create new instance
      expect(mockWaveSurfer.create).toHaveBeenCalledTimes(2);
      // Should be called with new containers
      expect(mockWaveSurfer.create).toHaveBeenLastCalledWith({
        container: newContainer,
        waveColor: '#305880',
        progressColor: '#162738',
        barWidth: 2,
        height: 128,
        minPxPerSec: 20,
        plugins: [mockRegionsInstance, mockTimelineInstance],
      });
    });

    it('should recreate instance when only waveform container changes', () => {
      // First initialization
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      expect(mockWaveSurfer.create).toHaveBeenCalledTimes(1);
      
      // Create new waveform container but keep same timeline container
      const newContainer = document.createElement('div');
      
      // Second initialization with different waveform container
      wavesurferService.initialize(newContainer, mockTimelineContainer);
      
      // Should destroy and recreate
      expect(mockWaveSurferInstance.destroy).toHaveBeenCalled();
      expect(mockWaveSurfer.create).toHaveBeenCalledTimes(2);
    });

    it('should recreate instance when only timeline container changes', () => {
      // First initialization
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      expect(mockWaveSurfer.create).toHaveBeenCalledTimes(1);
      
      // Create new timeline container but keep same waveform container
      const newTimelineContainer = document.createElement('div');
      
      // Second initialization with different timeline container
      wavesurferService.initialize(mockContainer, newTimelineContainer);
      
      // Should destroy and recreate
      expect(mockWaveSurferInstance.destroy).toHaveBeenCalled();
      expect(mockWaveSurfer.create).toHaveBeenCalledTimes(2);
    });

    it('should register event listeners', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      expect(mockWaveSurferInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockWaveSurferInstance.on).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockWaveSurferInstance.on).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockWaveSurferInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRegionsInstance.on).toHaveBeenCalledWith('region-created', expect.any(Function));
    });
  });

  describe('Delayed Regions Logic', () => {
    let readyCallback: Function;
    
    beforeEach(() => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Capture the ready callback
      const readyCall = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'ready'
      );
      readyCallback = readyCall[1];
    });

    it('should delay regions when wavesurfer is not ready', () => {
      const testRegions = [
        { id: 'region-1', start: 1, end: 3, displayIndex: 1 },
        { id: 'region-2', start: 5, end: 7, displayIndex: 2 },
      ];
      
      // Call setRegions before ready event
      wavesurferService.setRegions(testRegions);
      
      // Regions should not be added immediately
      expect(mockRegionsInstance.addRegion).not.toHaveBeenCalled();
      
      // Should store regions for later
      expect(wavesurferService['_delayedRegions']).toEqual(testRegions);
    });

    it('should process delayed regions when wavesurfer becomes ready', () => {
      const testRegions = [
        { id: 'region-1', start: 1, end: 3, displayIndex: 1 },
        { id: 'region-2', start: 5, end: 7, displayIndex: 2 },
      ];
      
      // Set regions before ready
      wavesurferService.setRegions(testRegions);
      
      // Trigger ready event
      readyCallback();
      
      // Should process delayed regions
      expect(mockRegionsInstance.addRegion).toHaveBeenCalledTimes(2);
      expect(mockRegionsInstance.addRegion).toHaveBeenCalledWith({
        id: 'region-1',
        start: 1,
        end: 3,
        content: '1',
        resize: true,
      });
      expect(mockRegionsInstance.addRegion).toHaveBeenCalledWith({
        id: 'region-2',
        start: 5,
        end: 7,
        content: '2',
        resize: true,
      });
      
      // Should clear delayed regions
      expect(wavesurferService['_delayedRegions']).toEqual([]);
    });

    it('should add regions immediately when wavesurfer is ready', () => {
      const testRegions = [
        { id: 'region-1', start: 1, end: 3, displayIndex: 1 },
      ];
      
      // Trigger ready event first
      readyCallback();
      
      // Now set regions
      wavesurferService.setRegions(testRegions);
      
      // Should clear existing regions first
      expect(mockRegionsInstance.clearRegions).toHaveBeenCalled();
      
      // Should add regions immediately
      expect(mockRegionsInstance.addRegion).toHaveBeenCalledWith({
        id: 'region-1',
        start: 1,
        end: 3,
        content: '1',
        resize: true,
      });
      
      // Should not store as delayed
      expect(wavesurferService['_delayedRegions']).toEqual([]);
    });

    it('should update region indices when region is created', () => {
      const mockRegions = [
        { start: 1, end: 2, setContent: jest.fn() },
        { start: 3, end: 4, setContent: jest.fn() },
      ];
      
      mockRegionsInstance.getRegions.mockReturnValue(mockRegions);
      
      // Trigger ready event first
      readyCallback();
      
      // Get the region-created callback
      const regionCreatedCall = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-created'
      );
      const regionCreatedCallback = regionCreatedCall[1];
      
      // Simulate region creation (this should trigger updateRegionIndices)
      regionCreatedCallback({
        id: 'test-region',
        start: 2.5,
        end: 3.5,
      });
      
      // Should get all regions
      expect(mockRegionsInstance.getRegions).toHaveBeenCalled();
      
      // Should update content of all regions with their indices
      expect(mockRegions[0].setContent).toHaveBeenCalledWith('1');
      expect(mockRegions[1].setContent).toHaveBeenCalledWith('2');
    });

    it('should handle empty regions array', () => {
      wavesurferService.setRegions([]);
      
      // Trigger ready event
      readyCallback();
      
      // Should not add any regions
      expect(mockRegionsInstance.addRegion).not.toHaveBeenCalled();
    });

    it('should handle ready event with no delayed regions', () => {
      // Trigger ready event without setting any regions
      readyCallback();
      
      // Should not crash or add any regions
      expect(mockRegionsInstance.addRegion).not.toHaveBeenCalled();
    });

    it('should preserve delayed regions when containers change', () => {
      const testRegions = [
        { id: 'region-1', start: 1, end: 3, displayIndex: 1 },
        { id: 'region-2', start: 5, end: 7, displayIndex: 2 },
      ];
      
      // Set regions before ready (they will be delayed)
      wavesurferService.setRegions(testRegions);
      expect(wavesurferService['_delayedRegions']).toEqual(testRegions);
      
      // Change containers (this will destroy and recreate the instance)
      const newContainer = document.createElement('div');
      const newTimelineContainer = document.createElement('div');
      wavesurferService.initialize(newContainer, newTimelineContainer);
      
      // Delayed regions should still be preserved after container change
      expect(wavesurferService['_delayedRegions']).toEqual(testRegions);
      
      // When wavesurfer becomes ready, it should process the preserved delayed regions
      const readyCall = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'ready'
      );
      const newReadyCallback = readyCall[1];
      newReadyCallback();
      
      // Should process the delayed regions
      expect(mockRegionsInstance.addRegion).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Handling', () => {
    let regionCreatedCallback: Function;
    
    beforeEach(() => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Capture the region-created callback
      const regionCreatedCall = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-created'
      );
      regionCreatedCallback = regionCreatedCall[1];
    });

    it('should emit region-created events', () => {
      const mockCallback = jest.fn();
      wavesurferService.on('region-created', mockCallback);
      
      // Simulate region creation
      regionCreatedCallback({
        id: 'test-region',
        start: 1,
        end: 3,
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        id: 'test-region',
        start: 1,
        end: 3,
      });
    });

    it('should not emit events when muted', () => {
      const mockCallback = jest.fn();
      wavesurferService.on('region-created', mockCallback);
      
      // Mute events
      wavesurferService['muteEvents'] = true;
      
      // Simulate region creation
      regionCreatedCallback({
        id: 'test-region',
        start: 1,
        end: 3,
      });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Playback Event Handling', () => {
    let playCallback: Function;
    let pauseCallback: Function;
    
    beforeEach(() => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Capture the play and pause callbacks
      const playCall = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'play'
      );
      playCallback = playCall[1];
      
      const pauseCall = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'pause'
      );
      pauseCallback = pauseCall[1];
    });

    it('should emit play events', () => {
      const mockCallback = jest.fn();
      wavesurferService.on('play', mockCallback);
      
      // Simulate play event
      playCallback();
      
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should emit pause events', () => {
      const mockCallback = jest.fn();
      wavesurferService.on('pause', mockCallback);
      
      // Simulate pause event
      pauseCallback();
      
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should not emit play/pause events when muted', () => {
      const playMockCallback = jest.fn();
      const pauseMockCallback = jest.fn();
      wavesurferService.on('play', playMockCallback);
      wavesurferService.on('pause', pauseMockCallback);
      
      // Mute events
      wavesurferService['muteEvents'] = true;
      
      // Simulate events
      playCallback();
      pauseCallback();
      
      expect(playMockCallback).not.toHaveBeenCalled();
      expect(pauseMockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Other Methods', () => {
    beforeEach(() => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
    });

    it('should load source and peaks', () => {
      const source = 'test-source.mp3';
      const peaks = [1, 2, 3, 4];
      
      wavesurferService.load(source, peaks);
      
      expect(mockWaveSurferInstance.load).toHaveBeenCalledWith(source, peaks);
    });

    it('should set zoom level', () => {
      wavesurferService.setZoom(50);
      
      expect(mockWaveSurferInstance.zoom).toHaveBeenCalledWith(50);
    });

    it('should update media element', () => {
      const mockMediaElement = document.createElement('video');
      
      wavesurferService.updateMediaElement(mockMediaElement);
      
      expect(mockWaveSurferInstance.setMediaElement).toHaveBeenCalledWith(mockMediaElement);
    });

    it('should handle updateMediaElement when not initialized', () => {
      wavesurferService.destroy();
      
      const mockMediaElement = document.createElement('video');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      wavesurferService.updateMediaElement(mockMediaElement);
      
      expect(consoleSpy).toHaveBeenCalledWith('📋 WaveSurfer not initialized, cannot update media element');
      consoleSpy.mockRestore();
    });

    it('should destroy wavesurfer instance', () => {
      wavesurferService.destroy();
      
      expect(mockWaveSurferInstance.destroy).toHaveBeenCalled();
      expect(wavesurferService.getWaveSurfer()).toBeNull();
      // Should also clear container references
      expect(wavesurferService['currentContainer']).toBeNull();
      expect(wavesurferService['currentTimelineContainer']).toBeNull();
    });

    it('should return wavesurfer instance', () => {
      expect(wavesurferService.getWaveSurfer()).toBe(mockWaveSurferInstance);
    });

    it('should return regions plugin', () => {
      expect(wavesurferService.getRegionsPlugin()).toBe(mockRegionsInstance);
    });



    it('should seek to region start when wavesurfer is ready', () => {
      mockWaveSurferInstance.setTime = jest.fn();
      // Set wavesurfer as ready
      wavesurferService['ready'] = true;
      
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      expect(mockWaveSurferInstance.setTime).toHaveBeenCalledWith(25.5);
    });

    it('should arm region-bounded playback when seeking to region', () => {
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      expect(wavesurferService['_playbackBoundRegion']).toEqual(testRegion);
    });

    it('should delay region seek when wavesurfer is not ready', () => {
      mockWaveSurferInstance.setTime = jest.fn();
      // Ensure wavesurfer is not ready
      wavesurferService['ready'] = false;
      
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      // setTime should not be called immediately
      expect(mockWaveSurferInstance.setTime).not.toHaveBeenCalled();
      // Delayed seek region should be stored
      expect(wavesurferService['_delayedSeekRegion']).toEqual(testRegion);
    });

    it('should clear region-bounded playback when calling clearRegionBoundedPlayback', () => {
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      
      // First arm the guard
      wavesurferService.seekToRegion(testRegion);
      expect(wavesurferService['_playbackBoundRegion']).toEqual(testRegion);
      
      // Then clear it
      wavesurferService.clearRegionBoundedPlayback();
      expect(wavesurferService['_playbackBoundRegion']).toBeNull();
    });

    it('should stop playback when reaching end of bounded region', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      mockWaveSurferInstance.pause = jest.fn();
      mockWaveSurferInstance.isPlaying = jest.fn().mockReturnValue(true);
      
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      // Get the timeupdate callback
      const timeupdateCallback = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'timeupdate'
      )[1];
      
      // Simulate timeupdate at region end
      timeupdateCallback(35.3); // Past the end time
      
      // Should pause and clear guard
      expect(mockWaveSurferInstance.pause).toHaveBeenCalled();
      expect(wavesurferService['_playbackBoundRegion']).toBeNull();
    });

    it('should not stop playback when not playing', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      mockWaveSurferInstance.pause = jest.fn();
      mockWaveSurferInstance.isPlaying = jest.fn().mockReturnValue(false);
      
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      // Get the timeupdate callback
      const timeupdateCallback = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'timeupdate'
      )[1];
      
      // Simulate timeupdate at region end while not playing
      timeupdateCallback(35.3);
      
      // Should not pause since not playing
      expect(mockWaveSurferInstance.pause).not.toHaveBeenCalled();
      expect(wavesurferService['_playbackBoundRegion']).toEqual(testRegion);
    });

    it('should clear region-bounded playback when user seeks outside region', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      // Get the interaction callback
      const interactionCallback = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'interaction'
      )[1];
      
      // Simulate user seeking outside the region
      interactionCallback(40.0); // Outside region end
      
      // Should clear the guard
      expect(wavesurferService['_playbackBoundRegion']).toBeNull();
    });

    it('should not clear region-bounded playback when user seeks within region', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      // Get the interaction callback
      const interactionCallback = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'interaction'
      )[1];
      
      // Simulate user seeking within the region
      interactionCallback(30.0); // Within region bounds
      
      // Should keep the guard
      expect(wavesurferService['_playbackBoundRegion']).toEqual(testRegion);
    });

    it('should ignore the first region-out event after delayed seek', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Set up event listener to track region-out events
      const mockRegionOutCallback = jest.fn();
      wavesurferService.on('region-out', mockRegionOutCallback);
      
      // Set the ignore flag as if we just did a delayed seek
      wavesurferService['_inboundRegionIgnoreNextOut'] = true;
      
      // Get the region-out callback
      const regionOutCallback = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-out'
      )[1];
      
      // Simulate the first region-out event (should be ignored)
      regionOutCallback({
        id: 'test-region',
        element: { style: {} }
      });
      
      // The event should not be emitted and flag should be reset
      expect(mockRegionOutCallback).not.toHaveBeenCalled();
      expect(wavesurferService['_inboundRegionIgnoreNextOut']).toBe(false);
      
      // Simulate another region-out event (should not be ignored)
      regionOutCallback({
        id: 'test-region-2',
        element: { style: {} }
      });
      
      // This time the event should be emitted
      expect(mockRegionOutCallback).toHaveBeenCalledWith({regionId: 'test-region-2'});
    });

    it('should manage region highlighting correctly when switching between regions', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Get the region-in callback
      const regionInCallback = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-in'
      )[1];
      
      // Mock region elements with style property
      const region1Element = { style: { backgroundColor: '' } };
      const region2Element = { style: { backgroundColor: '' } };
      
      // Simulate entering first region
      regionInCallback({
        id: 'region-1',
        element: region1Element
      });
      
      // First region should be highlighted and tracked
      expect(region1Element.style.backgroundColor).toBe('rgba(0, 213, 255, 0.1)');
      expect(wavesurferService['_inboundRegionCurrentHighlighted']).toEqual({
        id: 'region-1',
        element: region1Element
      });
      
      // Simulate entering second region
      regionInCallback({
        id: 'region-2',
        element: region2Element
      });
      
      // First region should be cleared, second should be highlighted
      expect(region1Element.style.backgroundColor).toBe('rgba(0, 0, 0, 0.1)');
      expect(region2Element.style.backgroundColor).toBe('rgba(0, 213, 255, 0.1)');
      expect(wavesurferService['_inboundRegionCurrentHighlighted']).toEqual({
        id: 'region-2',
        element: region2Element
      });
    });

    it('should clear highlighted region tracking on normal region-out', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Get the callbacks
      const regionInCallback = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-in'
      )[1];
      const regionOutCallback = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-out'
      )[1];
      
      // Mock region element
      const regionElement = { style: { backgroundColor: '' } };
      
      // Simulate entering region
      regionInCallback({
        id: 'test-region',
        element: regionElement
      });
      
      // Region should be tracked
      expect(wavesurferService['_inboundRegionCurrentHighlighted']).toEqual({
        id: 'test-region',
        element: regionElement
      });
      
      // Simulate leaving region normally (not ignored)
      regionOutCallback({
        id: 'test-region',
        element: regionElement
      });
      
      // Tracking should be cleared
      expect(wavesurferService['_inboundRegionCurrentHighlighted']).toBeNull();
    });

    it('should play audio', async () => {
      mockWaveSurferInstance.play = jest.fn().mockResolvedValue(undefined);
      
      await wavesurferService.play();
      
      expect(mockWaveSurferInstance.play).toHaveBeenCalled();
    });

    it('should pause audio', () => {
      mockWaveSurferInstance.pause = jest.fn();
      
      wavesurferService.pause();
      
      expect(mockWaveSurferInstance.pause).toHaveBeenCalled();
    });

    it('should toggle play/pause', async () => {
      mockWaveSurferInstance.playPause = jest.fn().mockResolvedValue(undefined);
      
      await wavesurferService.playPause();
      
      expect(mockWaveSurferInstance.playPause).toHaveBeenCalled();
    });

    it('should handle playPause when wavesurfer is null', async () => {
      wavesurferService.destroy();
      
      const result = await wavesurferService.playPause();
      
      expect(result).toBeUndefined();
    });
  });

  describe('Event Listener Management', () => {
    it('should add and remove event listeners', () => {
      const mockCallback = jest.fn();
      
      wavesurferService.on('test-event', mockCallback);
      wavesurferService.emitEvent('test-event', { data: 'test' });
      
      expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
      
      wavesurferService.off('test-event', mockCallback);
      wavesurferService.emitEvent('test-event', { data: 'test2' });
      
      // Should not be called again after removal
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should clear all listeners', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      wavesurferService.on('event1', mockCallback1);
      wavesurferService.on('event2', mockCallback2);
      
      wavesurferService.clearAllListeners();
      
      wavesurferService.emitEvent('event1', {});
      wavesurferService.emitEvent('event2', {});
      
      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).not.toHaveBeenCalled();
    });
  });
}); 