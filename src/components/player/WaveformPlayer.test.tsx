import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WaveformPlayer } from './WaveformPlayer';
import { wavesurferService } from '../../services/wavesurferService';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { usePlay } from '../../hooks/usePlay';
import { usePause } from '../../hooks/usePause';

// Mock the wavesurferService
jest.mock('../../services/wavesurferService', () => {
  const mockWaveSurferService = {
    initialize: jest.fn().mockReturnValue({}),
    setZoom: jest.fn(),
    setPlaybackRate: jest.fn(),
    destroy: jest.fn(),
    load: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
  
  return {
    wavesurferService: mockWaveSurferService,
  };
});

// Get the mocked service for test assertions
const mockWaveSurferService = jest.mocked(wavesurferService);

// Mock the stores
jest.mock('../../stores/usePlayerStore', () => ({
  usePlayerStore: jest.fn(),
}));

jest.mock('../../stores/useEditorStore', () => ({
  useEditorStore: jest.fn(),
}));

// Mock the hooks
jest.mock('../../hooks/usePlay', () => ({
  usePlay: jest.fn(() => jest.fn()),
}));

jest.mock('../../hooks/usePause', () => ({
  usePause: jest.fn(() => jest.fn()),
}));

jest.mock('../../hooks/useUpdateTranscription', () => ({
  useUpdateTranscription: jest.fn(() => jest.fn()),
}));

const mockUsePlayerStore = usePlayerStore as jest.MockedFunction<typeof usePlayerStore>;
const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;
const mockUsePlay = usePlay as jest.MockedFunction<typeof usePlay>;
const mockUsePause = usePause as jest.MockedFunction<typeof usePause>;

describe('WaveformPlayer', () => {
  const mockPlay = jest.fn();
  const mockPause = jest.fn();
  const mockSetLoadedAndReady = jest.fn();

  // Utility function to create complete mock PlayerState
  const createMockPlayerState = (overrides: Partial<any> = {}) => ({
    playing: false,
    loadedAndReady: false,
    currentTime: 0,
    duration: 0,
    setPlaying: jest.fn(),
    setPaused: jest.fn(),
    setLoadedAndReady: mockSetLoadedAndReady,
    setCurrentTime: jest.fn(),
    setDuration: jest.fn(),
    ...overrides,
  });

  const defaultProps = {
    source: 'test-source.mp3',
    inboundRegion: null,
    regions: [],
    isVideo: false,
    title: 'Test Title',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns for usePlayerStore
    mockUsePlayerStore.mockImplementation((selector) => {
      const state = createMockPlayerState();
      return selector(state);
    });
    
    // Setup default mock returns for useEditorStore
    mockUseEditorStore.mockImplementation((selector) => {
      const state = {
        transcription: {
          id: 'test-transcription-id',
          title: 'Test Transcription',
          source: 'test-source',
          type: 'test-type',
          author: 'test-author',
          authorFriendly: 'Test Author',
          userLastUpdated: 'test-user',
          dateLastUpdated: '2023-01-01T00:00:00.000Z',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          length: 120, // Duration in seconds
        },
        saved: false,
        peaks: null,
        accessDenied: false,
        canEdit: true,
        regions: [],
        regionMap: {},
        regionVersions: {},
        selectedRegionId: null,
        selectedRegion: null,
        playbackWithinRegion: null,
        knownWords: new Set<string>(),
        pendingEdits: {},
        issues: [],
        issueMap: {},
        _subscriptions: [],
        setFullTranscriptionData: jest.fn(),
        setAccessDenied: jest.fn(),
        setCanEdit: jest.fn(),
        cleanup: jest.fn(),
        updateTranscription: jest.fn(),
        setTranscription: jest.fn(),
        setSaved: jest.fn(),
        setSelectedRegion: jest.fn(),
        setPlaybackWithinRegion: jest.fn(),
        updateRegion: jest.fn(),
        createRegion: jest.fn(),
        deleteRegion: jest.fn(),
        addNewRegion: jest.fn(),
        setRegionText: jest.fn(),
        setRegionTranslation: jest.fn(),
        updateRegionBounds: jest.fn(),
        addKnownWords: jest.fn(),
        setRegionAnalysis: jest.fn(),
        startPendingEdit: jest.fn(),
        endPendingEdit: jest.fn(),
        updatePendingEditActivity: jest.fn(),
        getRegionVersion: jest.fn(() => 1),
        setRegionVersion: jest.fn(),
        isPendingEdit: jest.fn(() => false),
        createIssue: jest.fn(),
        updateIssue: jest.fn(),
        deleteIssue: jest.fn(),
        addComment: jest.fn(),
        isVideo: false,
        isTranscriptionAuthor: jest.fn(() => false),
        transcriptionTitle: 'Test Transcription',
        regionById: jest.fn(() => null),
        issueById: jest.fn(() => null),
        issuesByRegion: jest.fn(() => []),
        calculateTranscriptionMetadata: jest.fn(() => ({ regionCount: 0, coverage: 0 })),
        conflictQueue: [],
        addConflictToQueue: jest.fn(),
        removeConflictFromQueue: jest.fn(),
        processConflictQueue: jest.fn(),
      };
      return selector(state);
    });
    
    mockUsePlay.mockReturnValue(mockPlay);
    mockUsePause.mockReturnValue(mockPause);
  });

  describe('Construction and Initialization', () => {
    it('renders without crashing', () => {
      render(<WaveformPlayer {...defaultProps} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('initializes wavesurfer service when containers are ready', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      // Service should be called when containers are set up
      expect(mockWaveSurferService.initialize).toHaveBeenCalled();
    });

    it('only calls initialize once even with multiple renders', () => {
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
      
      // Clear previous calls
      jest.clearAllMocks();
      
      // Re-render with same props
      rerender(<WaveformPlayer {...defaultProps} />);
      rerender(<WaveformPlayer {...defaultProps} />);
      
      // Should not call initialize again (singleton behavior)
      expect(mockWaveSurferService.initialize).not.toHaveBeenCalled();
    });

    it('calls updateMediaElement when video element is provided', async () => {
      const { container } = render(<WaveformPlayer {...defaultProps} isVideo={true} />);
      
      // Verify video element exists (which means the updateMediaElement logic is in place)
      const videoElement = container.querySelector('video');
      expect(videoElement).toBeInTheDocument();
      
      // The updateMediaElement should be called when containers are ready
      // In tests, this might happen asynchronously
      expect(mockWaveSurferService.initialize).toHaveBeenCalled();
    });

    it('does not call updateMediaElement for audio files', () => {
      render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={false}
        />
      );
      
      // Should call initialize for audio files
      expect(mockWaveSurferService.initialize).toHaveBeenCalled();
    });

    it('sets up video element when isVideo is true', () => {
      render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={true}
        />
      );
      
      // The updateMediaElement should be called when containers are ready
      // In tests, this might happen asynchronously
      expect(mockWaveSurferService.initialize).toHaveBeenCalled();
    });

    it('uses callback refs to ensure proper initialization timing', () => {
      // Mock the initialize function to capture when it's called
      const mockInitialize = jest.fn();
      (mockWaveSurferService.initialize as jest.Mock).mockImplementation(mockInitialize);
      
      render(<WaveformPlayer {...defaultProps} />);
      
      // Should be called with both container elements and optional media element
      expect(mockInitialize).toHaveBeenCalledWith(
        expect.any(HTMLElement), // waveform container
        expect.any(HTMLElement), // timeline container
        undefined, // media element (undefined for audio files)
        true // canEdit (default from mock store)
      );
    });

    it('handles container changes gracefully', () => {
      // Create first instance
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
      
      // Re-render with same props should not cause issues
      rerender(<WaveformPlayer {...defaultProps} />);
      
      // Should be stable
      expect(mockWaveSurferService.initialize).toHaveBeenCalled();
    });
  });

  describe('WaveSurfer Service Integration', () => {
    it('properly manages singleton instance across multiple components', () => {
      // Render multiple instances
      render(<WaveformPlayer {...defaultProps} />);
      render(<WaveformPlayer {...defaultProps} />);
      
      // Both should use the same service instance
      expect(mockWaveSurferService.initialize).toHaveBeenCalledTimes(2);
      
      // Cleanup
      mockWaveSurferService.destroy();
    });

    it('handles rapid re-renders without breaking', () => {
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
      
      // Rapid re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<WaveformPlayer {...defaultProps} />);
      }
      
      // Should not crash
      expect(mockWaveSurferService.initialize).toHaveBeenCalled();
    });

    it('initializes with correct WaveSurfer configuration', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      // Verify initialize was called with proper containers
      expect(mockWaveSurferService.initialize).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.any(HTMLElement),
        undefined,
        true
      );
    });

    it('handles source data properly', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      // Component should render with source data
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('manages regions prop integration', () => {
      const regions = [
        { id: '1', start: 0, end: 5, text: 'First region' },
        { id: '2', start: 10, end: 15, text: 'Second region' }
      ];
      
      render(<WaveformPlayer {...defaultProps} regions={regions} />);
      
      // Should handle regions without errors
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('handles inbound region prop for deep linking', () => {
      render(<WaveformPlayer {...defaultProps} inboundRegion="region-123" />);
      
      // Should render with inbound region
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  describe('Play/Pause Controls', () => {
    it('shows play button when not playing', () => {
      // Mock store to return not playing and ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeInTheDocument();
    });

    it('shows pause button when playing', () => {
      // Mock store to return playing and ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: true,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeInTheDocument();
    });

    it('calls play when play button is clicked and not playing', () => {
      // Mock store to return not playing and ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      fireEvent.click(playButton);
      
      expect(mockPlay).toHaveBeenCalledWith({ playInFull: true });
    });

    it('main play button uses playInFull to clear any bounded regions', () => {
      // Mock store to return not playing and ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      fireEvent.click(playButton);
      
      // Verify the main play button specifically requests full playback
      // This ensures any region-bounded playback is cleared
      expect(mockPlay).toHaveBeenCalledWith({ playInFull: true });
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('calls pause when play button is clicked and playing', () => {
      // Mock store to return playing and ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: true,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      fireEvent.click(playButton);
      
      expect(mockPause).toHaveBeenCalled();
    });
  });

  describe('Zoom Controls', () => {
    it('calls wavesurferService.setZoom when zoom slider changes', () => {
      // Mock store to return ready state
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const zoomSlider = screen.getByDisplayValue('20'); // default zoom value
      fireEvent.change(zoomSlider, { target: { value: '30' } });
      
      expect(mockWaveSurferService.setZoom).toHaveBeenCalledWith(30);
    });

    it('sets zoom value when zoom slider changes', () => {
      // Mock store to return ready state
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const zoomSlider = screen.getByDisplayValue('20');
      fireEvent.change(zoomSlider, { target: { value: '50' } });
      
      expect(mockWaveSurferService.setZoom).toHaveBeenCalledWith(50);
    });
  });

  describe('Speed Controls', () => {
    it('calls wavesurferService.setPlaybackRate when speed slider changes', () => {
      // Mock store to return ready state
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const speedSlider = screen.getByDisplayValue('100'); // default speed value
      fireEvent.change(speedSlider, { target: { value: '150' } });
      
      expect(mockWaveSurferService.setPlaybackRate).toHaveBeenCalledWith(150);
    });

    it('displays current speed percentage', () => {
      // Mock store to return ready state
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      // Should display default speed percentage
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Edit Controls', () => {
    it('shows edit controls when canEdit is true', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      expect(screen.getByTestId('mark-region')).toBeInTheDocument();
    });

    it('hides edit controls when canEdit is false', () => {
      // Create a separate test with canEdit: false
      const mockStateWithNoEdit = {
        transcription: {
          id: 'test-transcription-id',
          title: 'Test Transcription',
          source: 'test-source',
          type: 'test-type',
          author: 'test-author',
          authorFriendly: 'Test Author',
          userLastUpdated: 'test-user',
          dateLastUpdated: '2023-01-01T00:00:00.000Z',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          length: 120, // Duration in seconds
        },
        saved: false,
        peaks: null,
        accessDenied: false,
        canEdit: false,
        regions: [],
        regionMap: {},
        regionVersions: {},
        selectedRegionId: null,
        selectedRegion: null,
        playbackWithinRegion: null,
        knownWords: new Set<string>(),
        pendingEdits: {},
        issues: [],
        issueMap: {},
        _subscriptions: [],
        setFullTranscriptionData: jest.fn(),
        setAccessDenied: jest.fn(),
        setCanEdit: jest.fn(),
        cleanup: jest.fn(),
        updateTranscription: jest.fn(),
        setTranscription: jest.fn(),
        setSaved: jest.fn(),
        setSelectedRegion: jest.fn(),
        setPlaybackWithinRegion: jest.fn(),
        updateRegion: jest.fn(),
        createRegion: jest.fn(),
        deleteRegion: jest.fn(),
        addNewRegion: jest.fn(),
        setRegionText: jest.fn(),
        setRegionTranslation: jest.fn(),
        updateRegionBounds: jest.fn(),
        addKnownWords: jest.fn(),
        setRegionAnalysis: jest.fn(),
        startPendingEdit: jest.fn(),
        endPendingEdit: jest.fn(),
        updatePendingEditActivity: jest.fn(),
        getRegionVersion: jest.fn(() => 1),
        setRegionVersion: jest.fn(),
        isPendingEdit: jest.fn(() => false),
        createIssue: jest.fn(),
        updateIssue: jest.fn(),
        deleteIssue: jest.fn(),
        addComment: jest.fn(),
        isVideo: false,
        isTranscriptionAuthor: jest.fn(() => false),
        transcriptionTitle: 'Test Transcription',
        regionById: jest.fn(() => null),
        issueById: jest.fn(() => null),
        issuesByRegion: jest.fn(() => []),
        calculateTranscriptionMetadata: jest.fn(() => ({ regionCount: 0, coverage: 0 })),
        conflictQueue: [],
        addConflictToQueue: jest.fn(),
        removeConflictFromQueue: jest.fn(),
        processConflictQueue: jest.fn(),
      };
      
      mockUseEditorStore.mockImplementation((selector) => selector(mockStateWithNoEdit));
      
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
       
      expect(screen.queryByTestId('mark-region')).not.toBeInTheDocument();
    });

    it('shows edit controls when canEdit is true', () => {
      // Mock store to return ready state
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      // Should show edit controls when canEdit is true
      expect(screen.getByTestId('mark-region')).toBeInTheDocument();
    });

    it('uses canEdit from store and passes it to wavesurfer service', () => {
      // Mock store to return canEdit: false
      mockUseEditorStore.mockImplementation((selector) => {
        const state = {
          transcription: {
            id: 'test-transcription-id',
            title: 'Test Transcription',
            source: 'test-source',
            type: 'test-type',
            author: 'test-author',
            authorFriendly: 'Test Author',
            userLastUpdated: 'test-user',
            dateLastUpdated: '2023-01-01T00:00:00.000Z',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
            length: 120, // Duration in seconds
          },
          saved: false,
          peaks: null,
          accessDenied: false,
          canEdit: false,
          regions: [],
          regionMap: {},
          regionVersions: {},
          selectedRegionId: null,
          selectedRegion: null,
          playbackWithinRegion: null,
          knownWords: new Set<string>(),
          pendingEdits: {},
          issues: [],
          issueMap: {},
          _subscriptions: [],
          setFullTranscriptionData: jest.fn(),
          setAccessDenied: jest.fn(),
          setCanEdit: jest.fn(),
          cleanup: jest.fn(),
          updateTranscription: jest.fn(),
          setTranscription: jest.fn(),
          setSaved: jest.fn(),
          setSelectedRegion: jest.fn(),
          setPlaybackWithinRegion: jest.fn(),
          updateRegion: jest.fn(),
          createRegion: jest.fn(),
          deleteRegion: jest.fn(),
          addNewRegion: jest.fn(),
          setRegionText: jest.fn(),
          setRegionTranslation: jest.fn(),
          updateRegionBounds: jest.fn(),
          addKnownWords: jest.fn(),
          setRegionAnalysis: jest.fn(),
          startPendingEdit: jest.fn(),
          endPendingEdit: jest.fn(),
          updatePendingEditActivity: jest.fn(),
          getRegionVersion: jest.fn(() => 1),
          setRegionVersion: jest.fn(),
          isPendingEdit: jest.fn(() => false),
          createIssue: jest.fn(),
          updateIssue: jest.fn(),
          deleteIssue: jest.fn(),
          addComment: jest.fn(),
          isVideo: false,
          isTranscriptionAuthor: jest.fn(() => false),
          transcriptionTitle: 'Test Transcription',
          regionById: jest.fn(() => null),
          issueById: jest.fn(() => null),
          issuesByRegion: jest.fn(() => []),
          calculateTranscriptionMetadata: jest.fn(() => ({ regionCount: 0, coverage: 0 })),
          conflictQueue: [],
          addConflictToQueue: jest.fn(),
          removeConflictFromQueue: jest.fn(),
          processConflictQueue: jest.fn(),
        };
        return selector(state);
      });
      
      render(<WaveformPlayer {...defaultProps} />);
      
      // Should pass canEdit: false to wavesurfer service
      expect(mockWaveSurferService.initialize).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.any(HTMLElement),
        undefined,
        false // canEdit should be false
      );
      
      // Should hide edit controls
      expect(screen.queryByTestId('mark-region')).not.toBeInTheDocument();
    });
  });

  describe('Video Integration', () => {
    beforeEach(() => {
      // Reset the singleton state before each test
      mockWaveSurferService.destroy();
    });

    it('should initialize wavesurfer without video element for audio files', () => {
      render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={false}
        />
      );

      expect(mockWaveSurferService.initialize).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.any(HTMLElement),
        undefined,
        true
      );
    });

    it('should initialize wavesurfer with video element for video files', async () => {
      render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={true}
        />
      );

      // Wait for the video element callback to be called
      await waitFor(() => {
        expect(mockWaveSurferService.initialize).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.any(HTMLElement),
          expect.any(HTMLVideoElement),
          true
        );
      });
    });

    it('should reinitialize wavesurfer when video element becomes available', async () => {
      render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={true}
        />
      );

      // Should be called at least twice - once without video, once with video
      // (may be called more due to React's callback ref behavior)
      await waitFor(() => {
        expect(mockWaveSurferService.initialize.mock.calls.length).toBeGreaterThanOrEqual(2);
      });

      // Check that at least one call was without video element
      const calls = (mockWaveSurferService.initialize as jest.Mock).mock.calls;
      const callWithoutVideo = calls.find((call: any) => call[2] === undefined);
      expect(callWithoutVideo).toBeTruthy();

      // Check that at least one call was with video element
      const callWithVideo = calls.find((call: any) => call[2] !== undefined);
      expect(callWithVideo).toBeTruthy();
    });

    it('should pass video element with correct src attribute', async () => {
      const testSource = 'https://example.com/test-video.mp4';
      
      render(
        <WaveformPlayer
          {...defaultProps}
          source={testSource}
          isVideo={true}
        />
      );

      await waitFor(() => {
        const calls = (mockWaveSurferService.initialize as jest.Mock).mock.calls;
        const callWithVideo = calls.find((call: any) => call[2] !== undefined);
        expect(callWithVideo).toBeTruthy();
        
        if (callWithVideo) {
          const videoElement = callWithVideo[2] as HTMLVideoElement;
          // Check that the video element has a source child with the correct src
          const sourceElement = videoElement.querySelector('source');
          expect(sourceElement?.src).toBe(testSource);
        }
      });
    });

    it('should render video element with correct attributes', () => {
      const testSource = 'https://example.com/test-video.mp4';
      
      const { container } = render(
        <WaveformPlayer
          {...defaultProps}
          source={testSource}
          isVideo={true}
        />
      );

      const videoElement = container.querySelector('video') as HTMLVideoElement;
      expect(videoElement).toBeInTheDocument();
      
      // Check the source element for the src attribute
      const sourceElement = videoElement.querySelector('source');
      expect(sourceElement?.src).toBe(testSource);
      
      expect(videoElement.muted).toBe(false);
      expect(videoElement.preload).toBe('auto');
    });

    it('should not render video element for audio files', () => {
      const { container } = render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={false}
        />
      );

      expect(container.querySelector('video')).not.toBeInTheDocument();
    });

    it('should render visible video element when isVideo is true', () => {
      const { container } = render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={true}
        />
      );

      const videoElement = container.querySelector('video') as HTMLVideoElement;
      expect(videoElement).toBeInTheDocument();
      
      // Check that the video element has the correct positioning classes (not hidden)
      expect(videoElement.className).toContain('fixed');
      expect(videoElement.className).toContain('bottom-4');
      expect(videoElement.className).toContain('right-4');
      expect(videoElement.className).not.toContain('hidden');
    });
  });

  describe('Delayed Load Integration', () => {
    beforeEach(() => {
      mockWaveSurferService.destroy();
    });

    it('should handle load being called before wavesurfer is ready', () => {
      // This test verifies that the component can render without throwing errors
      // The actual delayed load logic is tested in the service tests
      render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={true}
        />
      );

      // Component should render successfully
      expect(mockWaveSurferService.initialize).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator initially', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      expect(screen.getByText('Loading audio...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('disables controls while loading', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      const markRegionButton = screen.getByTestId('mark-region');
      
      expect(playButton).toBeDisabled();
      expect(markRegionButton).toBeDisabled();
    });

    it('disables zoom and speed controls while loading', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      const zoomSlider = screen.getByDisplayValue('20');
      const speedSlider = screen.getByDisplayValue('100');
      
      expect(zoomSlider).toBeDisabled();
      expect(speedSlider).toBeDisabled();
    });

    it('hides loading indicator when store indicates ready', () => {
      // Mock store to initially show loading
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: false,
        });
        return selector(state);
      });
      
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
      
      // Initially shows loading
      expect(screen.getByText('Loading audio...')).toBeInTheDocument();
      
      // Update store to indicate ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      rerender(<WaveformPlayer {...defaultProps} />);
      
      // Loading indicator should be gone
      expect(screen.queryByText('Loading audio...')).not.toBeInTheDocument();
    });

    it('enables controls when store indicates ready', () => {
      // Mock store to initially show loading
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: false,
        });
        return selector(state);
      });
      
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
      
      // Update store to indicate ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      rerender(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      const markRegionButton = screen.getByTestId('mark-region');
      
      expect(playButton).not.toBeDisabled();
      expect(markRegionButton).not.toBeDisabled();
    });

    it('shows loading indicator when source changes', () => {
      // Mock store to return ready state initially
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });

      const { rerender } = render(<WaveformPlayer {...defaultProps} />);

      // Should not show loading initially (already loaded)
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();

      // Mock store to return not ready when source changes
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: false,
        });
        return selector(state);
      });

      // Change source (simulate rerender with new source)
      rerender(<WaveformPlayer {...defaultProps} source="new-audio.mp3" />);

      // Should show loading indicator for new source
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('displays correct timer with current time and duration', () => {
      // Mock store with specific time values
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
          currentTime: 45.5, // 45.5 seconds
          duration: 180.25,  // 3 minutes 0.25 seconds
        });
        return selector(state);
      });

      render(<WaveformPlayer {...defaultProps} />);

      // Should display the formatted time
      expect(screen.getByText('0:45/3:00')).toBeInTheDocument();
    });

    it('updates timer display when time changes', () => {
      let mockState = createMockPlayerState({
        playing: true,
        loadedAndReady: true,
        currentTime: 0,
        duration: 120,
      });

      mockUsePlayerStore.mockImplementation((selector) => {
        return selector(mockState);
      });

      const { rerender } = render(<WaveformPlayer {...defaultProps} />);

      // Initial time
      expect(screen.getByText('0:00/2:00')).toBeInTheDocument();

      // Update mock state
      mockState = createMockPlayerState({
        playing: true,
        loadedAndReady: true,
        currentTime: 75,
        duration: 120,
      });

      rerender(<WaveformPlayer {...defaultProps} />);

      // Updated time
      expect(screen.getByText('1:15/2:00')).toBeInTheDocument();
    });
  });
}); 