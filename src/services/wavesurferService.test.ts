// Mock WaveSurfer module
jest.mock('wavesurfer.js', () => {
  return {
    __esModule: true,
    default: {
      create: jest.fn(),
    },
  };
});

// Mock Regions plugin
jest.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

// Mock Timeline plugin
jest.mock('wavesurfer.js/dist/plugins/timeline.esm.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { wavesurferService } from './wavesurferService';

// Get the mocked modules
const mockWaveSurfer = jest.mocked(WaveSurfer);
const mockRegions = jest.mocked(Regions);
const mockTimeline = jest.mocked(Timeline);

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
      create: jest.fn().mockReturnThis(),
      load: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      playPause: jest.fn(),
      zoom: jest.fn(),
      setTime: jest.fn(),
      setPlaybackRate: jest.fn(),
      setMediaElement: jest.fn(),
      getMediaElement: jest.fn().mockReturnValue(document.createElement('audio')),
      isPlaying: jest.fn().mockReturnValue(false),
      getDuration: jest.fn().mockReturnValue(120), // Mock 2 minutes duration
      destroy: jest.fn(),
      on: jest.fn(),
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
    mockRegions.create.mockReturnValue(mockRegionsInstance);
    mockTimeline.create.mockReturnValue(mockTimelineInstance);
    
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
      const instance = wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      expect(instance).toBe(mockWaveSurferInstance);
      expect(mockWaveSurfer.create).toHaveBeenCalledWith({
        container: mockContainer,
        media: undefined,
        waveColor: '#305880',
        progressColor: '#162738',
        barWidth: 2,
        height: 128,
        minPxPerSec: 20,
        plugins: [mockRegionsInstance, mockTimelineInstance],
      });
    });

    describe('Singleton Behavior', () => {
      beforeEach(() => {
        // Don't destroy for singleton tests - test reuse within same lifecycle
        // Just reset mocks
        jest.clearAllMocks();
        
        // Setup mock returns
        mockWaveSurfer.create.mockReturnValue(mockWaveSurferInstance);
        mockRegions.create.mockReturnValue(mockRegionsInstance);
        mockTimeline.create.mockReturnValue(mockTimelineInstance);
      });

      it('should return existing instance if already initialized with same containers', () => {
        // First call creates the instance
        const instance1 = wavesurferService.initialize(mockContainer, mockTimelineContainer);
        
        // Second call with same containers should reuse the instance
        const instance2 = wavesurferService.initialize(mockContainer, mockTimelineContainer);
        
        expect(instance1).toBe(instance2);
        expect(mockWaveSurfer.create).toHaveBeenCalledTimes(1); // Should only create once
      });
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

    it('should enable drag selection when canEdit is true', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer, undefined, true);
      
      expect(mockRegionsInstance.enableDragSelection).toHaveBeenCalledWith({}, 5);
    });

    it('should not enable drag selection when canEdit is false', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer, undefined, false);
      
      expect(mockRegionsInstance.enableDragSelection).not.toHaveBeenCalled();
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
        resize: false, // Default canEdit is false
        drag: false,   // Default canEdit is false
      });
      expect(mockRegionsInstance.addRegion).toHaveBeenCalledWith({
        id: 'region-2',
        start: 5,
        end: 7,
        content: '2',
        resize: false, // Default canEdit is false
        drag: false,   // Default canEdit is false
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
        resize: false, // Default canEdit is false
        drag: false,   // Default canEdit is false
      });
      
      // Should not store as delayed
      expect(wavesurferService['_delayedRegions']).toEqual([]);
    });

    it('should create regions with drag and resize enabled when canEdit is true', () => {
      // Initialize with canEdit: true
      wavesurferService.destroy();
      wavesurferService.initialize(mockContainer, mockTimelineContainer, undefined, true);
      
      const testRegions = [
        { id: 'region-1', start: 1, end: 3, displayIndex: 1 },
      ];
      
      // Capture and trigger ready callback
      const readyCall = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'ready'
      );
      readyCall[1](); // Trigger ready event
      
      // Set regions
      wavesurferService.setRegions(testRegions);
      
      // Should add regions with drag and resize enabled
      expect(mockRegionsInstance.addRegion).toHaveBeenCalledWith({
        id: 'region-1',
        start: 1,
        end: 3,
        content: '1',
        resize: true,  // canEdit is true
        drag: true,    // canEdit is true
      });
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
    let readyCallback: Function;
    
    beforeEach(() => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Capture the region-created callback
      const regionCreatedCall = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-created'
      );
      regionCreatedCallback = regionCreatedCall[1];
      
      // Capture the ready callback
      const readyCall = mockWaveSurferInstance.on.mock.calls.find(
        (call: any) => call[0] === 'ready'
      );
      readyCallback = readyCall[1];
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

    describe('addRegionWithId (subscription regions)', () => {
      it('should not emit region-created event to prevent double creation', () => {
        const mockCallback = jest.fn();
        wavesurferService.on('region-created', mockCallback);
        
        // Call addRegionWithId (simulates subscription region)
        wavesurferService.addRegionWithId({
          id: 'subscription-region',
          start: 5,
          end: 10
        });
        
        // Should NOT emit region-created event to prevent double creation
        expect(mockCallback).not.toHaveBeenCalled();
        
        // Should still call regionsPlugin.addRegion
        expect(mockRegionsInstance.addRegion).toHaveBeenCalledWith({
          id: 'subscription-region',
          start: 5,
          end: 10,
          content: '',
          resize: false,
          drag: false
        });
      });
      
      it('should reset flag after adding region to prevent interference with normal regions', () => {
        const mockCallback = jest.fn();
        wavesurferService.on('region-created', mockCallback);
        
        // Add subscription region
        wavesurferService.addRegionWithId({
          id: 'subscription-region',
          start: 5,
          end: 10
        });
        
        // Flag should be reset, so normal region creation should work
        regionCreatedCallback({
          id: 'normal-region',
          start: 1,
          end: 3,
        });
        
        // Normal region should emit event
        expect(mockCallback).toHaveBeenCalledWith({
          id: 'normal-region',
          start: 1,
          end: 3,
        });
      });
      
      it('should reset flag even when addRegion throws an error', () => {
        const mockCallback = jest.fn();
        wavesurferService.on('region-created', mockCallback);
        
        // Make addRegion throw an error
        mockRegionsInstance.addRegion.mockImplementationOnce(() => {
          throw new Error('Test error');
        });
        
        // Add subscription region (should handle error gracefully)
        wavesurferService.addRegionWithId({
          id: 'error-region',
          start: 5,
          end: 10
        });
        
        // Flag should still be reset despite error
        regionCreatedCallback({
          id: 'normal-region',
          start: 1,
          end: 3,
        });
        
        // Normal region should still emit event
        expect(mockCallback).toHaveBeenCalledWith({
          id: 'normal-region',
          start: 1,
          end: 3,
        });
      });
    });

    it('should emit ready events', () => {
      const mockCallback = jest.fn();
      wavesurferService.on('ready', mockCallback);
      
      // Simulate ready event
      readyCallback();
      
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should not emit ready events when muted', () => {
      const mockCallback = jest.fn();
      wavesurferService.on('ready', mockCallback);
      
      // Mute events
      wavesurferService['muteEvents'] = true;
      
      // Simulate ready event
      readyCallback();
      
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

    it('should play audio', async () => {
      mockWaveSurferInstance.play = jest.fn().mockResolvedValue(undefined);
      
      await wavesurferService.play();
      
      expect(mockWaveSurferInstance.play).toHaveBeenCalled();
    });

    it('should play audio with empty options object', async () => {
      mockWaveSurferInstance.play = jest.fn().mockResolvedValue(undefined);
      
      await wavesurferService.play({});
      
      expect(mockWaveSurferInstance.play).toHaveBeenCalled();
    });

    it('should play audio with playInFull false', async () => {
      mockWaveSurferInstance.play = jest.fn().mockResolvedValue(undefined);
      
      // Set up a bounded region first
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      // Verify region is bounded
      expect(wavesurferService['_playbackBoundRegion']).toEqual(testRegion);
      
      // Play with playInFull explicitly false
      await wavesurferService.play({ playInFull: false });
      
      // Should NOT clear the bounded region
      expect(wavesurferService['_playbackBoundRegion']).toEqual(testRegion);
      expect(mockWaveSurferInstance.play).toHaveBeenCalled();
    });

    it('should play audio in full mode and clear bounded regions', async () => {
      mockWaveSurferInstance.play = jest.fn().mockResolvedValue(undefined);
      
      // Set up a bounded region first
      const testRegion = { id: 'test-region', start: 25.5, end: 35.2 };
      wavesurferService.seekToRegion(testRegion);
      
      // Verify region is bounded
      expect(wavesurferService['_playbackBoundRegion']).toEqual(testRegion);
      
      // Play in full mode
      await wavesurferService.play({ playInFull: true });
      
      // Should clear the bounded region and play
      expect(wavesurferService['_playbackBoundRegion']).toBeNull();
      expect(mockWaveSurferInstance.play).toHaveBeenCalled();
    });

    it('should not affect playback when playInFull is true but no bounded region exists', async () => {
      mockWaveSurferInstance.play = jest.fn().mockResolvedValue(undefined);
      
      // Ensure no bounded region exists
      expect(wavesurferService['_playbackBoundRegion']).toBeNull();
      
      // Play in full mode
      await wavesurferService.play({ playInFull: true });
      
      // Should still be null and play normally
      expect(wavesurferService['_playbackBoundRegion']).toBeNull();
      expect(mockWaveSurferInstance.play).toHaveBeenCalled();
    });
  });

  describe('Other Methods', () => {
    beforeEach(() => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
    });

    it('should load source and peaks with signed URLs for audio', async () => {
      // Initialize wavesurfer first
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      const source = 'https://bucket.s3.amazonaws.com/public/test-source.mp3';
      const peaks = [1, 2, 3, 4];
      
      await wavesurferService.load(source, peaks);
      
      // Should call wavesurfer load with signed URL
      expect(mockWaveSurferInstance.load).toHaveBeenCalledWith(
        'https://fake.s3.amazonaws.com/public/test-source.mp3',
        peaks
      );
    });

    it('should load source and peaks with signed URLs for video', async () => {
      // Create mock video element
      const mockVideoElement = document.createElement('video');
      
      // Initialize wavesurfer with video element
      wavesurferService.initialize(mockContainer, mockTimelineContainer, mockVideoElement);
      
      const source = 'https://bucket.s3.amazonaws.com/public/test-video.mp4';
      const peaks = [1, 2, 3, 4];
      
      await wavesurferService.load(source, peaks);
      
      // Should set signed URL on video element src
      expect(mockVideoElement.src).toBe('https://fake.s3.amazonaws.com/public/test-video.mp4');
      // Should call wavesurfer load with signed URL
      expect(mockWaveSurferInstance.load).toHaveBeenCalledWith(
        'https://fake.s3.amazonaws.com/public/test-video.mp4',
        peaks
      );
    });

    it('should handle signed URL generation errors gracefully', async () => {
      // Mock the generateSignedUrl function to throw an error
      const transcriptionService = require('../services/transcriptionService');
      const originalGenerateSignedUrl = transcriptionService.generateSignedUrl;
      transcriptionService.generateSignedUrl = jest.fn().mockRejectedValueOnce(new Error('S3 access denied'));
      
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      const source = 'https://bucket.s3.amazonaws.com/public/test-source.mp3';
      const peaks = [1, 2, 3, 4];
      
      await wavesurferService.load(source, peaks);
      
      // Should fallback to original URL
      expect(mockWaveSurferInstance.load).toHaveBeenCalledWith(source, peaks);
      
      // Restore original function
      transcriptionService.generateSignedUrl = originalGenerateSignedUrl;
    });

    it('should handle signed URL generation errors gracefully for video', async () => {
      // Mock the generateSignedUrl function to throw an error
      const transcriptionService = require('../services/transcriptionService');
      const originalGenerateSignedUrl = transcriptionService.generateSignedUrl;
      transcriptionService.generateSignedUrl = jest.fn().mockRejectedValueOnce(new Error('S3 access denied'));
      
      const mockVideoElement = document.createElement('video');
      wavesurferService.initialize(mockContainer, mockTimelineContainer, mockVideoElement);
      
      const source = 'https://bucket.s3.amazonaws.com/public/test-video.mp4';
      const peaks = [1, 2, 3, 4];
      
      await wavesurferService.load(source, peaks);
      
      // Should fallback to original URL
      expect(mockVideoElement.src).toBe(source);
      expect(mockWaveSurferInstance.load).toHaveBeenCalledWith(source, peaks);
      
      // Restore original function
      transcriptionService.generateSignedUrl = originalGenerateSignedUrl;
    });

    it('should delay load when wavesurfer instance does not exist', async () => {
      // Ensure wavesurfer instance is null by destroying it
      wavesurferService.destroy();
      
      const source = 'https://bucket.s3.amazonaws.com/public/test.mp4';
      const peaks = [1, 2, 3];
      
      await wavesurferService.load(source, peaks);
      
      // Load should not be called immediately since wavesurfer instance is null
      expect(mockWaveSurferInstance.load).not.toHaveBeenCalled();
      
      // Should be stored as delayed load
      expect(wavesurferService['_delayedLoad']).toEqual({ source, peaks });
    });

    it('should set zoom level', () => {
      mockWaveSurferInstance.zoom = jest.fn();
      
      wavesurferService.setZoom(50);
      
      expect(mockWaveSurferInstance.zoom).toHaveBeenCalledWith(50);
    });

    it('should destroy wavesurfer instance', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      wavesurferService.destroy();
      
      expect(mockWaveSurferInstance.destroy).toHaveBeenCalled();
      expect(wavesurferService.getWaveSurfer()).toBeNull();
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

    it('should handle region events safely when element is null (deleted regions)', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Get the callbacks
      const regionInCallback = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-in'
      )[1];
      const regionOutCallback = mockRegionsInstance.on.mock.calls.find(
        (call: any) => call[0] === 'region-out'
      )[1];
      
      // Create console spy to verify no errors
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Test region-in with null element (should not crash)
      expect(() => {
        regionInCallback({
          id: 'deleted-region',
          element: null
        });
      }).not.toThrow();
      
      // Test region-out with null element (should not crash)
      expect(() => {
        regionOutCallback({
          id: 'deleted-region',
          element: null
        });
      }).not.toThrow();
      
      // Test with undefined event (should not crash)
      expect(() => {
        regionInCallback(null);
      }).not.toThrow();
      
      expect(() => {
        regionOutCallback(undefined);
      }).not.toThrow();
      
      // Should not have any console errors
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
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

  describe('Flash Region Background', () => {
    it('should flash region background for normal regions', () => {
      const service = wavesurferService;
      const mockContainer = document.createElement('div');
      const mockTimelineContainer = document.createElement('div');
      
      service.initialize(mockContainer, mockTimelineContainer, undefined, true);
      
      // Set up mock region with element
      const mockElement = document.createElement('div');
      const mockRegion = {
        id: 'test-region-flash',
        element: mockElement
      };
      
      const mockRegionsPlugin = service.getRegionsPlugin();
      jest.mocked(mockRegionsPlugin!.getRegions).mockReturnValue([mockRegion] as any);
      
      // Test the flash without username
      service.flashRegionBackground('test-region-flash');
      
      // Should have applied transition and flash color
      expect(mockElement.style.transition).toContain('background-color');
      expect(mockElement.style.transition).toContain('500ms');
      expect(mockElement.style.transition).toContain('ease-out');
      expect(mockElement.style.backgroundColor).toBe('rgba(34, 197, 94, 0.2)');
    });

    it('should flash region background with username text', () => {
      const service = wavesurferService;
      const mockContainer = document.createElement('div');
      const mockTimelineContainer = document.createElement('div');
      
      service.initialize(mockContainer, mockTimelineContainer, undefined, true);
      
      const mockElement = document.createElement('div');
      const mockRegion = {
        id: 'test-region-username',
        element: mockElement
      };
      
      const mockRegionsPlugin = service.getRegionsPlugin();
      jest.mocked(mockRegionsPlugin!.getRegions).mockReturnValue([mockRegion] as any);
      
      // Mock appendChild to capture username element
      const mockAppendChild = jest.fn();
      mockElement.appendChild = mockAppendChild;
      
      // Test flash with username
      service.flashRegionBackground('test-region-username', 'testuser');
      
      // Should create username element
      expect(mockAppendChild).toHaveBeenCalled();
      const usernameElement = mockAppendChild.mock.calls[0][0];
      expect(usernameElement.textContent).toBe('testuser');
      expect(usernameElement.style.color).toBe('rgb(21, 128, 61)'); // Browser converts #15803d to RGB
      expect(usernameElement.style.position).toBe('absolute');
    });

    it('should handle missing regions plugin gracefully', () => {
      const service = wavesurferService;
      service.destroy(); // Ensure no regions plugin
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      service.flashRegionBackground('test-region-missing');
      
      expect(consoleSpy).toHaveBeenCalledWith('🎵 Cannot flash region: regions plugin not available');
      consoleSpy.mockRestore();
    });

    it('should handle missing region gracefully', () => {
      const service = wavesurferService;
      const mockContainer = document.createElement('div');
      const mockTimelineContainer = document.createElement('div');
      
      service.initialize(mockContainer, mockTimelineContainer, undefined, true);
      
      const mockRegionsPlugin = service.getRegionsPlugin();
      jest.mocked(mockRegionsPlugin!.getRegions).mockReturnValue([]);
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      service.flashRegionBackground('nonexistent-region');
      
      expect(consoleSpy).toHaveBeenCalledWith('🎵 Cannot flash region: region not found or no element:', 'nonexistent-region');
      consoleSpy.mockRestore();
    });

    it('should determine correct original color for highlighted region', () => {
      const service = wavesurferService;
      const mockContainer = document.createElement('div');
      const mockTimelineContainer = document.createElement('div');
      
      service.initialize(mockContainer, mockTimelineContainer, undefined, true);
      
      const mockElement = document.createElement('div');
      const mockRegion = {
        id: 'highlighted-region',
        element: mockElement
      };
      
      // Simulate highlighted region by setting the private property
      (service as any)._inboundRegionCurrentHighlighted = mockRegion;
      
      const mockRegionsPlugin = service.getRegionsPlugin();
      jest.mocked(mockRegionsPlugin!.getRegions).mockReturnValue([mockRegion] as any);
      
      service.flashRegionBackground('highlighted-region');
      
      // Should flash with green color
      expect(mockElement.style.backgroundColor).toBe('rgba(34, 197, 94, 0.2)');
    });

    it('should handle flash errors gracefully', () => {
      const service = wavesurferService;
      const mockContainer = document.createElement('div');
      const mockTimelineContainer = document.createElement('div');
      
      service.initialize(mockContainer, mockTimelineContainer, undefined, true);
      
      const mockElement = {
        style: {
          get transition() { throw new Error('Style error'); }
        }
      };
      const mockRegion = {
        id: 'error-region',
        element: mockElement
      };
      
      const mockRegionsPlugin = service.getRegionsPlugin();
      jest.mocked(mockRegionsPlugin!.getRegions).mockReturnValue([mockRegion] as any);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Should not throw
      expect(() => {
        service.flashRegionBackground('error-region');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('🎵 Failed to flash region background:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should set region position to relative for username text positioning', () => {
      const service = wavesurferService;
      const mockContainer = document.createElement('div');
      const mockTimelineContainer = document.createElement('div');
      
      service.initialize(mockContainer, mockTimelineContainer, undefined, true);
      
      const mockElement = document.createElement('div');
      // Start with static positioning
      mockElement.style.position = 'static';
      
      const mockRegion = {
        id: 'positioning-test',
        element: mockElement
      };
      
      const mockRegionsPlugin = service.getRegionsPlugin();
      jest.mocked(mockRegionsPlugin!.getRegions).mockReturnValue([mockRegion] as any);
      
      service.flashRegionBackground('positioning-test', 'testuser');
      
      // Should have changed to relative positioning
      expect(mockElement.style.position).toBe('relative');
    });
  });

  describe('Delayed Load Logic', () => {
    it('should delay load when wavesurfer instance does not exist', async () => {
      const mockLoad = jest.fn();
      mockWaveSurferInstance.load = mockLoad;
      
      // Ensure wavesurfer instance is null by destroying it
      wavesurferService.destroy();
      
      const source = 'https://bucket.s3.amazonaws.com/public/test.mp4';
      const peaks = [1, 2, 3];
      
      await wavesurferService.load(source, peaks);
      
      // Load should not be called immediately since wavesurfer instance is null
      expect(mockLoad).not.toHaveBeenCalled();
      
      // Should be stored as delayed load
      expect(wavesurferService['_delayedLoad']).toEqual({ source, peaks });
    });

    it('should process delayed load immediately when wavesurfer instance is created', async () => {
      const mockLoad = jest.fn();
      mockWaveSurferInstance.load = mockLoad;
      
      // Ensure wavesurfer instance is null by destroying it
      wavesurferService.destroy();
      
      // Set up delayed load first
      const source = 'https://bucket.s3.amazonaws.com/public/test.mp4';
      const peaks = [1, 2, 3];
      await wavesurferService.load(source, peaks);
      
      // Should be stored as delayed load
      expect(wavesurferService['_delayedLoad']).toEqual({ source, peaks });
      
      // Now initialize wavesurfer - this should process the delayed load immediately
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Wait a tick for async load to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // The delayed load should be processed immediately after instance creation with signed URL
      expect(mockLoad).toHaveBeenCalledWith('https://fake.s3.amazonaws.com/public/test.mp4', peaks);
      expect(wavesurferService['_delayedLoad']).toBeNull();
    });

    it('should load immediately when wavesurfer instance exists', async () => {
      const mockLoad = jest.fn();
      mockWaveSurferInstance.load = mockLoad;
      
      // Initialize first
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Now load should work immediately (no need to wait for ready)
      const source = 'https://bucket.s3.amazonaws.com/public/test.mp4';
      const peaks = [1, 2, 3];
      
      await wavesurferService.load(source, peaks);
      
      // Should use signed URL
      expect(mockLoad).toHaveBeenCalledWith('https://fake.s3.amazonaws.com/public/test.mp4', peaks);
      expect(wavesurferService['_delayedLoad']).toBeNull();
    });

    it('should clear delayed load on destroy', async () => {
      // Set up delayed load
      const source = 'https://bucket.s3.amazonaws.com/public/test.mp4';
      const peaks = [1, 2, 3];
      await wavesurferService.load(source, peaks);
      
      expect(wavesurferService['_delayedLoad']).toEqual({ source, peaks });
      
      // Destroy should clear it
      wavesurferService.destroy();
      
      expect(wavesurferService['_delayedLoad']).toBeNull();
    });
  });

  describe('Video Element Integration', () => {
    let mockVideoElement: HTMLVideoElement;

    beforeEach(() => {
      mockVideoElement = document.createElement('video');
      mockVideoElement.src = 'https://bucket.s3.amazonaws.com/public/test.mp4';
    });

    it('should initialize with video element', () => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer, mockVideoElement);
      
      expect(mockWaveSurfer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          media: mockVideoElement
        })
      );
      expect(wavesurferService['currentMediaElement']).toBe(mockVideoElement);
    });

    it('should reinitialize when video element changes', () => {
      // First initialization without video
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      const firstCreateCall = mockWaveSurfer.create.mock.calls[0][0];
      expect(firstCreateCall.media).toBeUndefined();
      
      // Second initialization with video element
      wavesurferService.initialize(mockContainer, mockTimelineContainer, mockVideoElement);
      
      // Should destroy and recreate
      expect(mockWaveSurferInstance.destroy).toHaveBeenCalled();
      expect(mockWaveSurfer.create).toHaveBeenCalledTimes(2);
      
      const secondCreateCall = mockWaveSurfer.create.mock.calls[1][0];
      expect(secondCreateCall.media).toBe(mockVideoElement);
    });

    it('should preserve delayed load when reinitializing for video element', async () => {
      const mockLoad = jest.fn();
      mockWaveSurferInstance.load = mockLoad;
      
      // Ensure wavesurfer instance is null by destroying it
      wavesurferService.destroy();
      
      // Test the preservation logic when containers change while there's a delayed load
      const source = 'https://bucket.s3.amazonaws.com/public/test.mp4';
      const peaks = [1, 2, 3];
      
      // Set up delayed load (service is not initialized yet)
      await wavesurferService.load(source, peaks);
      expect(wavesurferService['_delayedLoad']).toEqual({ source, peaks });
      
      // Initialize with one set of containers
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Wait a tick for async load to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should have processed the delayed load immediately with signed URL
      expect(mockLoad).toHaveBeenCalledWith('https://fake.s3.amazonaws.com/public/test.mp4', peaks);
      expect(wavesurferService['_delayedLoad']).toBeNull();
      
      // Now destroy the instance and set up a new delayed load to test preservation
      wavesurferService.destroy();
      
      const source2 = 'https://bucket.s3.amazonaws.com/public/test2.mp4';
      const peaks2 = [4, 5, 6];
      await wavesurferService.load(source2, peaks2);
      expect(wavesurferService['_delayedLoad']).toEqual({ source: source2, peaks: peaks2 });
      
      // Initialize with different containers (including video element)
      const newContainer = document.createElement('div');
      wavesurferService.initialize(newContainer, mockTimelineContainer, mockVideoElement);
      
      // Wait a tick for async load to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should process the delayed load with the new containers with signed URL
      expect(mockLoad).toHaveBeenCalledWith('https://fake.s3.amazonaws.com/public/test2.mp4', peaks2);
      expect(wavesurferService['_delayedLoad']).toBeNull();
    });
  });

  describe('Error handling and dialog callback', () => {
    let transcriptionService: any;
    
    beforeEach(async () => {
      transcriptionService = require('./transcriptionService');
      transcriptionService.generateSignedUrl = jest.fn().mockResolvedValue('https://fake.s3.amazonaws.com/public/test.mp3');
      
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
      
      // Load initial media
      const source = 'https://bucket.s3.amazonaws.com/public/test.mp3';
      const peaks = [0.1, 0.2, 0.3];
      await wavesurferService.load(source, peaks);
    });

    it('should call dialog callback on MediaError code 2 with 403-like message', async () => {
      const dialogCallback = jest.fn();
      wavesurferService.setExpiredUrlDialogCallback(dialogCallback);
      
      // Mock fetch to return 403
      global.fetch = jest.fn().mockResolvedValue({
        status: 403,
        text: jest.fn().mockResolvedValue('<Error><Code>ExpiredToken</Code><Message>Token expired</Message></Error>')
      });
      
      // Mock getCredentialSetupTime to return a recent time (within 1 hour)
      const transcriptionService = require('./transcriptionService');
      jest.spyOn(transcriptionService, 'getCredentialSetupTime').mockReturnValue(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      // Get the error handler registered for 'error' event
      const errorHandler = mockWaveSurferInstance.on.mock.calls.find(
        (call: string[]) => call[0] === 'error'
      )?.[1];
      
      expect(errorHandler).toBeDefined();
      
      // Simulate a MediaError with code 2 and 403-like message
      const mediaError = {
        code: 2,
        message: 'PipelineStatus::PIPELINE_ERROR_READ: FFmpegDemuxer: data source error'
      };
      
      await errorHandler(mediaError);
      
      // Should call dialog callback
      expect(dialogCallback).toHaveBeenCalled();
    });

    it('should not retry on non-network errors', async () => {
      transcriptionService.generateSignedUrl = jest.fn();
      
      const emitSpy = jest.spyOn(wavesurferService as any, 'emitEvent');
      
      // Get the error handler
      const errorHandler = mockWaveSurferInstance.on.mock.calls.find(
        (call: string[]) => call[0] === 'error'
      )?.[1];
      
      // Simulate a non-network error (code 1 = MEDIA_ERR_ABORTED)
      const mediaError = {
        code: 1,
        message: 'Media playback aborted'
      };
      
      await errorHandler(mediaError);
      
      // Should not attempt to reload
      expect(transcriptionService.generateSignedUrl).not.toHaveBeenCalled();
      // Should emit error normally
      expect(emitSpy).toHaveBeenCalledWith('error', mediaError);
      
      emitSpy.mockRestore();
    });
  });

  describe('Play race condition protection', () => {
    beforeEach(() => {
      wavesurferService.initialize(mockContainer, mockTimelineContainer);
    });

    it('should prevent multiple simultaneous play attempts', async () => {
      // Mock a slow play operation
      mockWaveSurferInstance.play.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      // Attempt to play multiple times rapidly
      const play1 = wavesurferService.play();
      const play2 = wavesurferService.play();
      const play3 = wavesurferService.play();
      
      await Promise.all([play1, play2, play3]);
      
      // Should only call wavesurfer.play() once
      expect(mockWaveSurferInstance.play).toHaveBeenCalledTimes(1);
    });

    it('should handle AbortError gracefully', async () => {
      const abortError = new Error('The play() request was interrupted');
      abortError.name = 'AbortError';
      
      mockWaveSurferInstance.play.mockRejectedValue(abortError);
      
      // Should not throw
      await expect(wavesurferService.play()).resolves.toBeUndefined();
    });

    it('should re-throw non-AbortError errors', async () => {
      const networkError = new Error('Network error');
      mockWaveSurferInstance.play.mockRejectedValue(networkError);
      
      await expect(wavesurferService.play()).rejects.toThrow('Network error');
    });

    it('should allow play after previous attempt completes', async () => {
      // First play succeeds
      mockWaveSurferInstance.play.mockResolvedValue(undefined);
      await wavesurferService.play();
      
      expect(mockWaveSurferInstance.play).toHaveBeenCalledTimes(1);
      
      // Second play should also work
      await wavesurferService.play();
      expect(mockWaveSurferInstance.play).toHaveBeenCalledTimes(2);
    });
  });
}); 
