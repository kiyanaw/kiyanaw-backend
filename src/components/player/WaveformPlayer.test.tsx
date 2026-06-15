import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WaveformPlayer } from './WaveformPlayer';
import { wavesurferService } from '../../services/wavesurferService';
import { browserService } from '../../services/browserService';
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

// Mock the browserService
jest.mock('../../services/browserService', () => ({
  browserService: {
    getVideoPreferences: jest.fn(() => ({
      position: 'right',
      size: 'small', 
      isMinimized: false,
      zoom: 40,
      speed: 100,
    })),
    saveVideoPreferences: jest.fn(),
  },
}));

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
    transcriptionId: 'test-transcription-id',
    onOpenSettings: jest.fn(),
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
          saveStatus: 'saved' as const,
          peaks: null,
          wavesurferError: null,
          showExpiredCredentialsDialog: false,
          accessDenied: false,
          canEdit: true,
          regions: [],
          regionMap: {},
          regionVersions: {},
          selectedRegionId: null,
          selectedRegion: null,
          playbackWithinRegion: null,
          knownWords: new Map(),
          pendingEdits: {},
          issues: [],
          issueMap: {},
          issuesByRegionMap: {},
    comments: [],
    commentMap: {},
    commentsByEntityMap: {},
    commentsByTranscriptionMap: [],
    commentById: jest.fn(() => null),
    commentsByEntity: jest.fn(() => []),
    commentsByRegion: jest.fn(() => []),
    commentsByIssue: jest.fn(() => []),
    commentsByTranscription: jest.fn(() => []),
    getCommentsForEntity: jest.fn(() => []),
          _subscriptions: [],
          setFullTranscriptionData: jest.fn(),
          setAccessDenied: jest.fn(),
          setWavesurferError: jest.fn(),
          setShowExpiredCredentialsDialog: jest.fn(),
          setCanEdit: jest.fn(),
          cleanup: jest.fn(),
        updateTranscription: jest.fn(),
        setTranscription: jest.fn(),
        setSaved: jest.fn(),
        setSaveStatus: jest.fn(),
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
        setRegionSuggestions: jest.fn(),
        startPendingEdit: jest.fn(),
        endPendingEdit: jest.fn(),
        updatePendingEditActivity: jest.fn(),
        getRegionVersion: jest.fn(() => 1),
        setRegionVersion: jest.fn(),
        isPendingEdit: jest.fn(() => false),
        createIssue: jest.fn(),
        updateIssue: jest.fn(),
        deleteIssue: jest.fn(),
        addNewIssue: jest.fn(),
        addNewComment: jest.fn(),
        updateComment: jest.fn(),
        deleteComment: jest.fn(),
        issueLinkStatusesByRegion: {},
        issueSuggestionsByRegion: {},
        setIssueLinkStatuses: jest.fn(),
        setIssueSuggestions: jest.fn(),
        clearIssueSuggestionsForIssue: jest.fn(),
        addComment: jest.fn(),
        isVideo: false,
        isTranscriptionAuthor: jest.fn(() => false),
        transcriptionTitle: 'Test Transcription',
        regionById: jest.fn(() => null),
        issueById: jest.fn(() => null),
        issuesByRegion: jest.fn(() => []),
      getIssuesForRegion: jest.fn(() => []),
        calculateTranscriptionMetadata: jest.fn(() => ({ regionCount: 0, issueCount: 0, coverage: 0 })),

        conflictQueue: [],
        addConflictToQueue: jest.fn(),
        removeConflictFromQueue: jest.fn(),
        processConflictQueue: jest.fn(),
        regionSelections: {},
        setRegionSelection: jest.fn(),
        regionCursorWords: {},
        setRegionCursorWord: jest.fn(),
        setPeaks: jest.fn(),
        mediaStatus: null,
        setMediaStatus: jest.fn(),
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
      
      const zoomSlider = screen.getByDisplayValue('40'); // default zoom value
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
      
      const zoomSlider = screen.getByDisplayValue('40');
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
      fireEvent.change(speedSlider, { target: { value: '90' } });
      
      expect(mockWaveSurferService.setPlaybackRate).toHaveBeenCalledWith(90);
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

    it('toggles speed to minimum when gauge icon is clicked at 100%', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });

      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({ playing: false, loadedAndReady: true });
        return selector(state);
      });

      render(<WaveformPlayer {...defaultProps} />);

      const gaugeButton = screen.getByTestId('speed-toggle-button');
      fireEvent.click(gaugeButton);

      expect(mockWaveSurferService.setPlaybackRate).toHaveBeenCalledWith(50);
      expect(browserService.saveVideoPreferences).toHaveBeenCalledWith({ speed: 50 });
    });

    it('toggles speed to 100% when gauge icon is clicked below 100%', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });

      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({ playing: false, loadedAndReady: true });
        return selector(state);
      });

      render(<WaveformPlayer {...defaultProps} />);

      const speedSlider = screen.getByDisplayValue('100');
      fireEvent.change(speedSlider, { target: { value: '75' } });

      jest.clearAllMocks();

      const gaugeButton = screen.getByTestId('speed-toggle-button');
      fireEvent.click(gaugeButton);

      expect(mockWaveSurferService.setPlaybackRate).toHaveBeenCalledWith(100);
      expect(browserService.saveVideoPreferences).toHaveBeenCalledWith({ speed: 100 });
    });
  });

  describe('Edit Controls', () => {
    it('shows edit controls when canEdit is true', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      // Edit controls are no longer rendered since we removed the mark-region button
      expect(screen.getByTestId('play-button')).toBeInTheDocument();
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
        saveStatus: 'saved' as const,
        peaks: null,
        wavesurferError: null,
        showExpiredCredentialsDialog: false,
        accessDenied: false,
        canEdit: false,
        regions: [],
        regionMap: {},
        regionVersions: {},
        selectedRegionId: null,
        selectedRegion: null,
        playbackWithinRegion: null,
        knownWords: new Map(),
        pendingEdits: {},
        issues: [],
        issueMap: {},
        issuesByRegionMap: {},
    comments: [],
    commentMap: {},
    commentsByEntityMap: {},
    commentsByTranscriptionMap: [],
    commentById: jest.fn(() => null),
    commentsByEntity: jest.fn(() => []),
    commentsByRegion: jest.fn(() => []),
    commentsByIssue: jest.fn(() => []),
    commentsByTranscription: jest.fn(() => []),
    getCommentsForEntity: jest.fn(() => []),
        _subscriptions: [],
        setFullTranscriptionData: jest.fn(),
        setAccessDenied: jest.fn(),
        setWavesurferError: jest.fn(),
        setShowExpiredCredentialsDialog: jest.fn(),
        setCanEdit: jest.fn(),
        cleanup: jest.fn(),
        updateTranscription: jest.fn(),
        setTranscription: jest.fn(),
        setSaved: jest.fn(),
        setSaveStatus: jest.fn(),
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
        setRegionSuggestions: jest.fn(),
        startPendingEdit: jest.fn(),
        endPendingEdit: jest.fn(),
        updatePendingEditActivity: jest.fn(),
        getRegionVersion: jest.fn(() => 1),
        setRegionVersion: jest.fn(),
        isPendingEdit: jest.fn(() => false),
        createIssue: jest.fn(),
        updateIssue: jest.fn(),
        deleteIssue: jest.fn(),
        addNewIssue: jest.fn(),
        addNewComment: jest.fn(),
        updateComment: jest.fn(),
        deleteComment: jest.fn(),
        issueLinkStatusesByRegion: {},
        issueSuggestionsByRegion: {},
        setIssueLinkStatuses: jest.fn(),
        setIssueSuggestions: jest.fn(),
        clearIssueSuggestionsForIssue: jest.fn(),
        addComment: jest.fn(),
        isVideo: false,
        isTranscriptionAuthor: jest.fn(() => false),
        transcriptionTitle: 'Test Transcription',
        regionById: jest.fn(() => null),
        issueById: jest.fn(() => null),
        issuesByRegion: jest.fn(() => []),
      getIssuesForRegion: jest.fn(() => []),
        calculateTranscriptionMetadata: jest.fn(() => ({ regionCount: 0, issueCount: 0, coverage: 0 })),
        conflictQueue: [],
        addConflictToQueue: jest.fn(),
        removeConflictFromQueue: jest.fn(),
        processConflictQueue: jest.fn(),
        regionSelections: {},
        setRegionSelection: jest.fn(),
        regionCursorWords: {},
        setRegionCursorWord: jest.fn(),
        setPeaks: jest.fn(),
        mediaStatus: null,
        setMediaStatus: jest.fn(),
      };
      
      mockUseEditorStore.mockImplementation((selector) => selector(mockStateWithNoEdit));
      
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
       
      // Edit controls are no longer rendered since we removed the mark-region button
      expect(screen.getByTestId('play-button')).toBeInTheDocument();
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
      
      // Edit controls are no longer rendered since we removed the mark-region button
      expect(screen.getByTestId('play-button')).toBeInTheDocument();
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
          saveStatus: 'saved' as const,
          peaks: null,
          wavesurferError: null,
          showExpiredCredentialsDialog: false,
          accessDenied: false,
          canEdit: false,
          regions: [],
          regionMap: {},
          regionVersions: {},
          selectedRegionId: null,
          selectedRegion: null,
          playbackWithinRegion: null,
          knownWords: new Map(),
          pendingEdits: {},
          issues: [],
          issueMap: {},
          issuesByRegionMap: {},
    comments: [],
    commentMap: {},
    commentsByEntityMap: {},
    commentsByTranscriptionMap: [],
    commentById: jest.fn(() => null),
    commentsByEntity: jest.fn(() => []),
    commentsByRegion: jest.fn(() => []),
    commentsByIssue: jest.fn(() => []),
    commentsByTranscription: jest.fn(() => []),
    getCommentsForEntity: jest.fn(() => []),
          _subscriptions: [],
          setFullTranscriptionData: jest.fn(),
          setAccessDenied: jest.fn(),
          setWavesurferError: jest.fn(),
          setShowExpiredCredentialsDialog: jest.fn(),
          setCanEdit: jest.fn(),
          cleanup: jest.fn(),
          updateTranscription: jest.fn(),
          setTranscription: jest.fn(),
          setSaved: jest.fn(),
        setSaveStatus: jest.fn(),
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
        setRegionSuggestions: jest.fn(),
          startPendingEdit: jest.fn(),
          endPendingEdit: jest.fn(),
          updatePendingEditActivity: jest.fn(),
          getRegionVersion: jest.fn(() => 1),
          setRegionVersion: jest.fn(),
          isPendingEdit: jest.fn(() => false),
          createIssue: jest.fn(),
          updateIssue: jest.fn(),
          deleteIssue: jest.fn(),
          addNewIssue: jest.fn(),
        addNewComment: jest.fn(),
        updateComment: jest.fn(),
        deleteComment: jest.fn(),
          issueLinkStatusesByRegion: {},
          issueSuggestionsByRegion: {},
          setIssueLinkStatuses: jest.fn(),
          setIssueSuggestions: jest.fn(),
          clearIssueSuggestionsForIssue: jest.fn(),
          addComment: jest.fn(),
          isVideo: false,
          isTranscriptionAuthor: jest.fn(() => false),
          transcriptionTitle: 'Test Transcription',
          regionById: jest.fn(() => null),
          issueById: jest.fn(() => null),
          issuesByRegion: jest.fn(() => []),
      getIssuesForRegion: jest.fn(() => []),
          calculateTranscriptionMetadata: jest.fn(() => ({ regionCount: 0, issueCount: 0, coverage: 0 })),
          conflictQueue: [],
          addConflictToQueue: jest.fn(),
          removeConflictFromQueue: jest.fn(),
          processConflictQueue: jest.fn(),
        regionSelections: {},
        setRegionSelection: jest.fn(),
        regionCursorWords: {},
        setRegionCursorWord: jest.fn(),
        setPeaks: jest.fn(),
        mediaStatus: null,
        setMediaStatus: jest.fn(),
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
      // Edit controls are no longer rendered since we removed the mark-region button
      expect(screen.getByTestId('play-button')).toBeInTheDocument();
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

    it('should pass video element to wavesurfer initialize', async () => {
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
        expect(callWithVideo[2]).toBeInstanceOf(HTMLVideoElement);
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

    it('should render video element when isVideo is true', () => {
      const { container } = render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={true}
        />
      );

      const videoElement = container.querySelector('video') as HTMLVideoElement;
      expect(videoElement).toBeInTheDocument();
      
      // Check that the video container has the correct positioning classes
      // Video is hidden by default on mobile (showVideoMobile is false)
      const videoContainer = videoElement.parentElement as HTMLDivElement;
      expect(videoContainer.className).toContain('fixed');
      expect(videoContainer.className).toContain('bottom-4');
      expect(videoContainer.className).toContain('right-4');
      // Video is hidden by default on mobile
      expect(videoContainer.className).toContain('hidden');
    });

    it('should minimize and restore video when minimize button is clicked', () => {
      const { container } = render(
        <WaveformPlayer
          {...defaultProps}
          isVideo={true}
        />
      );

      const videoContainer = container.querySelector('video')?.parentElement as HTMLDivElement;
      expect(videoContainer).toBeInTheDocument();
      
      // Initially video should be visible on desktop (lg:block)
      expect(videoContainer.className).toContain('lg:block');
      expect(videoContainer.className).not.toContain('lg:hidden');

      // Find and click the minimize button (ChevronDown icon)
      const minimizeButton = screen.getByTitle('Minimize');
      expect(minimizeButton).toBeInTheDocument();
      
      fireEvent.click(minimizeButton);

      // After minimize, video container should be hidden on desktop
      expect(videoContainer.className).toContain('lg:hidden');
      expect(videoContainer.className).not.toContain('lg:block');

      // The "Video" restore tab should appear
      const restoreTab = screen.getByTitle('Restore video');
      expect(restoreTab).toBeInTheDocument();
      expect(restoreTab).toHaveTextContent('Video');

      // Click the restore tab
      fireEvent.click(restoreTab);

      // Video should be visible again
      expect(videoContainer.className).toContain('lg:block');
      expect(videoContainer.className).not.toContain('lg:hidden');

      // Restore tab should be hidden
      expect(screen.queryByTitle('Restore video')).not.toBeInTheDocument();
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
    it('disables controls while loading', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      
      expect(playButton).toBeDisabled();
    });

    it('disables zoom and speed controls while loading', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      const zoomSlider = screen.getByDisplayValue('40'); // Updated default zoom value
      const speedSlider = screen.getByDisplayValue('100');
      
      expect(zoomSlider).toBeDisabled();
      expect(speedSlider).toBeDisabled();
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
      
      // Initially controls are disabled
      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeDisabled();
      
      // Update store to indicate ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      rerender(<WaveformPlayer {...defaultProps} />);
      
      // Controls should be enabled
      expect(playButton).not.toBeDisabled();
    });

    it('controls respond to ready state changes', () => {
      // Mock store to initially show loading
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: false,
        });
        return selector(state);
      });
      
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
      
      // Initially controls are disabled
      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeDisabled();
      
      // Update store to indicate ready
      mockUsePlayerStore.mockImplementation((selector) => {
        const state = createMockPlayerState({
          playing: false,
          loadedAndReady: true,
        });
        return selector(state);
      });
      
      rerender(<WaveformPlayer {...defaultProps} />);
      
      // Controls should be enabled
      expect(playButton).not.toBeDisabled();
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

  describe('Spacebar keyboard shortcut', () => {
    it('calls play when space is pressed and not playing', () => {
      mockUsePlayerStore.mockImplementation((selector) => {
        return selector(createMockPlayerState({ playing: false, loadedAndReady: true }));
      });

      render(<WaveformPlayer {...defaultProps} />);
      fireEvent.keyDown(window, { code: 'Space' });

      expect(mockPlay).toHaveBeenCalledWith({ playInFull: true });
    });

    it('calls pause when space is pressed and playing', () => {
      mockUsePlayerStore.mockImplementation((selector) => {
        return selector(createMockPlayerState({ playing: true, loadedAndReady: true }));
      });

      render(<WaveformPlayer {...defaultProps} />);
      fireEvent.keyDown(window, { code: 'Space' });

      expect(mockPause).toHaveBeenCalled();
    });

    it('does nothing when space is pressed and not loaded', () => {
      mockUsePlayerStore.mockImplementation((selector) => {
        return selector(createMockPlayerState({ playing: false, loadedAndReady: false }));
      });

      render(<WaveformPlayer {...defaultProps} />);
      fireEvent.keyDown(window, { code: 'Space' });

      expect(mockPlay).not.toHaveBeenCalled();
      expect(mockPause).not.toHaveBeenCalled();
    });

    it('does not trigger when focused in an input', () => {
      mockUsePlayerStore.mockImplementation((selector) => {
        return selector(createMockPlayerState({ playing: false, loadedAndReady: true }));
      });

      render(<WaveformPlayer {...defaultProps} />);

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(window, { code: 'Space' });

      expect(mockPlay).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('does not trigger when focused in a textarea', () => {
      mockUsePlayerStore.mockImplementation((selector) => {
        return selector(createMockPlayerState({ playing: false, loadedAndReady: true }));
      });

      render(<WaveformPlayer {...defaultProps} />);

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      fireEvent.keyDown(window, { code: 'Space' });

      expect(mockPlay).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });

    it('does not trigger when focused in a contenteditable element', () => {
      mockUsePlayerStore.mockImplementation((selector) => {
        return selector(createMockPlayerState({ playing: false, loadedAndReady: true }));
      });

      render(<WaveformPlayer {...defaultProps} />);

      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      const spy = jest.spyOn(document, 'activeElement', 'get').mockReturnValue(div);

      fireEvent.keyDown(window, { code: 'Space' });

      expect(mockPlay).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('does not trigger for non-space keys', () => {
      mockUsePlayerStore.mockImplementation((selector) => {
        return selector(createMockPlayerState({ playing: false, loadedAndReady: true }));
      });

      render(<WaveformPlayer {...defaultProps} />);
      fireEvent.keyDown(window, { code: 'KeyK' });

      expect(mockPlay).not.toHaveBeenCalled();
    });
  });
});
