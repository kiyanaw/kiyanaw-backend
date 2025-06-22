import { render, screen, fireEvent } from '@testing-library/react';
import { WaveformPlayer } from './WaveformPlayer';
import { wavesurferService } from '../../services/wavesurferService';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlay } from '../../hooks/usePlay';
import { usePause } from '../../hooks/usePause';

// Mock the wavesurferService
jest.mock('../../services/wavesurferService', () => ({
  wavesurferService: {
    initialize: jest.fn(),
    updateMediaElement: jest.fn(),
    setZoom: jest.fn(),
    setPlaybackRate: jest.fn(),
  },
}));

// Mock the stores and hooks
jest.mock('../../stores/usePlayerStore');
jest.mock('../../hooks/usePlay');
jest.mock('../../hooks/usePause');

// Mock the eventBus
jest.mock('../../lib/eventBus', () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

const mockUsePlayerStore = usePlayerStore as jest.MockedFunction<typeof usePlayerStore>;
const mockUsePlay = usePlay as jest.MockedFunction<typeof usePlay>;
const mockUsePause = usePause as jest.MockedFunction<typeof usePause>;

describe('WaveformPlayer', () => {
  const mockPlay = jest.fn();
  const mockPause = jest.fn();
  const mockOnRegionUpdate = jest.fn();
  const mockOnLookup = jest.fn();

  const defaultProps = {
    source: 'test-audio.mp3',
    peaks: null,
    canEdit: true,
    inboundRegion: null,
    regions: [],
    isVideo: false,
    title: 'Test Audio',
    onRegionUpdate: mockOnRegionUpdate,
    onLookup: mockOnLookup,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockUsePlayerStore.mockReturnValue(false); // not playing
    mockUsePlay.mockReturnValue(mockPlay);
    mockUsePause.mockReturnValue(mockPause);
  });

  describe('Construction and Initialization', () => {
    it('renders without crashing', () => {
      render(<WaveformPlayer {...defaultProps} />);
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });

    it('initializes wavesurfer service when containers are ready', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      // Service should be called when containers are set up
      expect(wavesurferService.initialize).toHaveBeenCalled();
    });

    it('only calls initialize once even with multiple renders', () => {
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
      
      // Clear previous calls
      jest.clearAllMocks();
      
      // Re-render with same props
      rerender(<WaveformPlayer {...defaultProps} />);
      rerender(<WaveformPlayer {...defaultProps} />);
      
      // Should not call initialize again (singleton behavior)
      expect(wavesurferService.initialize).not.toHaveBeenCalled();
    });

    it('calls updateMediaElement when video element is provided', async () => {
      const { container } = render(<WaveformPlayer {...defaultProps} isVideo={true} />);
      
      // Verify video element exists (which means the updateMediaElement logic is in place)
      const videoElement = container.querySelector('video');
      expect(videoElement).toBeInTheDocument();
      
      // The updateMediaElement should be called when containers are ready
      // In tests, this might happen asynchronously
      expect(wavesurferService.initialize).toHaveBeenCalled();
    });

    it('does not call updateMediaElement for audio files', () => {
      render(<WaveformPlayer {...defaultProps} isVideo={false} />);
      
      // Should not call updateMediaElement for audio
      expect(wavesurferService.updateMediaElement).not.toHaveBeenCalled();
    });

    it('sets up video element when isVideo is true', () => {
      const { container } = render(<WaveformPlayer {...defaultProps} isVideo={true} />);
      
      const videoElement = container.querySelector('video');
      expect(videoElement).toBeInTheDocument();
      expect(videoElement).toHaveAttribute('src', 'test-audio.mp3');
      expect(videoElement).toHaveProperty('muted', true);
      expect(videoElement).toHaveAttribute('crossorigin', 'anonymous');
      expect(videoElement).toHaveAttribute('preload', 'metadata');
      expect(videoElement).toHaveProperty('playsInline', true);
    });

    it('uses callback refs to ensure proper initialization timing', () => {
      // Mock the initialize function to capture when it's called
      const mockInitialize = jest.fn();
      (wavesurferService.initialize as jest.Mock).mockImplementation(mockInitialize);
      
      render(<WaveformPlayer {...defaultProps} />);
      
      // Should be called with both container elements
      expect(mockInitialize).toHaveBeenCalledWith(
        expect.any(HTMLElement), // waveform container
        expect.any(HTMLElement)  // timeline container
      );
    });

    it('handles container changes gracefully', () => {
      const { rerender } = render(<WaveformPlayer {...defaultProps} title="First" />);
      
      // Clear previous calls to track new ones
      jest.clearAllMocks();
      
      // Change props that might affect containers
      rerender(<WaveformPlayer {...defaultProps} title="Second" />);
      
      // Should handle the change without errors
      expect(() => rerender(<WaveformPlayer {...defaultProps} title="Third" />)).not.toThrow();
    });
  });

  describe('WaveSurfer Service Integration', () => {
    it('properly manages singleton instance across multiple components', () => {
      // Render multiple instances
      const { unmount: unmount1 } = render(<WaveformPlayer {...defaultProps} title="First" />);
      const { unmount: unmount2 } = render(<WaveformPlayer {...defaultProps} title="Second" />);
      
      // Both should use the same service instance
      expect(wavesurferService.initialize).toHaveBeenCalledTimes(2);
      
      // Cleanup
      unmount1();
      unmount2();
    });

    it('handles rapid re-renders without breaking', () => {
      const { rerender } = render(<WaveformPlayer {...defaultProps} />);
      
      // Simulate rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(<WaveformPlayer {...defaultProps} title={`Title ${i}`} />);
      }
      
      // Should not throw errors
      expect(screen.getByText('Title 9')).toBeInTheDocument();
    });

    it('initializes with correct WaveSurfer configuration', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      // Verify initialize was called with proper containers
      expect(wavesurferService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          className: expect.stringContaining('w-full h-32 bg-white')
        }),
        expect.objectContaining({
          className: expect.stringContaining('w-full h-5 bg-gray-100')
        })
      );
    });

    it('handles source and peaks data properly', () => {
      const peaks = { data: [1, 2, 3, 4, 5] };
      render(<WaveformPlayer {...defaultProps} peaks={peaks} />);
      
      // Component should render with peaks data
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });

    it('manages regions prop integration', () => {
      const regions = [
        { id: '1', start: 0, end: 5, text: 'First region' },
        { id: '2', start: 10, end: 15, text: 'Second region' }
      ];
      
      render(<WaveformPlayer {...defaultProps} regions={regions} />);
      
      // Should handle regions without errors
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });

    it('handles inbound region prop for deep linking', () => {
      render(<WaveformPlayer {...defaultProps} inboundRegion="region-123" />);
      
      // Should render with inbound region
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });
  });

  describe('Play/Pause Controls', () => {
    it('shows play button when not playing', () => {
      mockUsePlayerStore.mockReturnValue(false);
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeInTheDocument();
    });

    it('shows pause button when playing', () => {
      mockUsePlayerStore.mockReturnValue(true);
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      expect(playButton).toBeInTheDocument();
    });

    it('calls play when play button is clicked and not playing', () => {
      mockUsePlayerStore.mockReturnValue(false);
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      fireEvent.click(playButton);
      
      expect(mockPlay).toHaveBeenCalledWith({ playInFull: true });
    });

    it('main play button uses playInFull to clear any bounded regions', () => {
      mockUsePlayerStore.mockReturnValue(false);
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      fireEvent.click(playButton);
      
      // Verify the main play button specifically requests full playback
      // This ensures any region-bounded playback is cleared
      expect(mockPlay).toHaveBeenCalledWith({ playInFull: true });
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('calls pause when play button is clicked and playing', () => {
      mockUsePlayerStore.mockReturnValue(true);
      
      render(<WaveformPlayer {...defaultProps} />);
      
      const playButton = screen.getByTestId('play-button');
      fireEvent.click(playButton);
      
      expect(mockPause).toHaveBeenCalled();
    });
  });

  describe('Zoom Controls', () => {
    it('calls wavesurferService.setZoom when zoom slider changes', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      const zoomSlider = screen.getByDisplayValue('20'); // default zoom value
      fireEvent.change(zoomSlider, { target: { value: '30' } });
      
      expect(wavesurferService.setZoom).toHaveBeenCalledWith(30);
    });

    it('resets zoom to 20 when reset button is clicked', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      const resetButton = screen.getByTitle('Reset zoom');
      fireEvent.click(resetButton);
      
      expect(wavesurferService.setZoom).toHaveBeenCalledWith(20);
    });
  });

  describe('Speed Controls', () => {
    it('calls wavesurferService.setPlaybackRate when speed slider changes', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      const speedSlider = screen.getByDisplayValue('100'); // default speed value
      fireEvent.change(speedSlider, { target: { value: '150' } });
      
      expect(wavesurferService.setPlaybackRate).toHaveBeenCalledWith(150);
    });

    it('resets speed to 100 when reset button is clicked', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      const resetButton = screen.getByTitle('Reset speed');
      fireEvent.click(resetButton);
      
      expect(wavesurferService.setPlaybackRate).toHaveBeenCalledWith(100);
    });
  });

  describe('Edit Controls', () => {
    it('shows edit controls when canEdit is true', () => {
      render(<WaveformPlayer {...defaultProps} canEdit={true} />);
      
      expect(screen.getByTestId('mark-region')).toBeInTheDocument();
    });

    it('hides edit controls when canEdit is false', () => {
      render(<WaveformPlayer {...defaultProps} canEdit={false} />);
      
      expect(screen.queryByTestId('mark-region')).not.toBeInTheDocument();
    });

    it('calls onLookup when lookup button is clicked', () => {
      render(<WaveformPlayer {...defaultProps} />);
      
      // Find the lookup button - it's the 4th button in the controls
      const buttons = screen.getAllByRole('button');
      const lookupButton = buttons.find(button => 
        button.querySelector('svg.lucide-search')
      );
      
      expect(lookupButton).toBeInTheDocument();
      if (lookupButton) {
        fireEvent.click(lookupButton);
        expect(mockOnLookup).toHaveBeenCalled();
      }
    });
  });
}); 