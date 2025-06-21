import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EditorPage } from './EditorPage';
import { wavesurferService } from '../services/wavesurferService';
import { browserService } from '../services/browserService';
import { useEditorStore } from '../stores/useEditorStore';

// Mock the services
jest.mock('../services/wavesurferService', () => ({
  wavesurferService: {
    destroy: jest.fn(),
  },
}));

jest.mock('../services/browserService', () => ({
  browserService: {
    clearAllCustomStyles: jest.fn(),
  },
}));

// Mock the hooks
jest.mock('../hooks/useLoadTranscription', () => ({
  useLoadTranscription: jest.fn(),
}));

jest.mock('../hooks/useWavesurferEvents', () => ({
  useWavesurferEvents: jest.fn(),
}));

// Mock the store
jest.mock('../stores/useEditorStore', () => ({
  useEditorStore: jest.fn(),
}));

// Mock the components
jest.mock('../components/player/WaveformPlayer', () => ({
  WaveformPlayer: () => <div data-testid="waveform-player">WaveformPlayer</div>,
}));

jest.mock('../components/regions/RegionList', () => ({
  RegionList: () => <div data-testid="region-list">RegionList</div>,
}));

jest.mock('../components/inspector/StationaryInspector', () => ({
  StationaryInspector: () => <div data-testid="stationary-inspector">StationaryInspector</div>,
}));

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;

describe('EditorPage', () => {
  let mockCleanup: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCleanup = jest.fn();
    
    // Mock the store selectors
    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        transcription: {
          id: 'test-transcription',
          title: 'Test Transcription',
          source: 'test-source.mp3',
          isVideo: false,
        },
        peaks: null,
        regions: [],
        selectedRegion: null,
        cleanup: mockCleanup,
      } as any;
      
      return selector(mockState);
    });

    // Mock getState for the cleanup function
    mockUseEditorStore.getState = jest.fn().mockReturnValue({
      cleanup: mockCleanup,
    });
  });

  it('should render loading state when transcription is not loaded', () => {
    // Mock store to return no transcription
    mockUseEditorStore.mockImplementation((selector) => {
      const mockState = {
        transcription: null,
        peaks: null,
        regions: [],
        selectedRegion: null,
        cleanup: mockCleanup,
      } as any;
      
      return selector(mockState);
    });

    render(
      <MemoryRouter initialEntries={['/transcribe-edit/test-id']}>
        <EditorPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading transcription...')).toBeInTheDocument();
  });

  it('should render editor components when transcription is loaded', () => {
    render(
      <MemoryRouter initialEntries={['/transcribe-edit/test-id']}>
        <EditorPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('waveform-player')).toBeInTheDocument();
    expect(screen.getByTestId('region-list')).toBeInTheDocument();
    expect(screen.getByTestId('stationary-inspector')).toBeInTheDocument();
  });

  it('should call cleanup functions when component unmounts', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/transcribe-edit/test-id']}>
        <EditorPage />
      </MemoryRouter>
    );

    // Unmount the component to trigger cleanup
    unmount();

    // Verify all cleanup functions were called
    expect(mockCleanup).toHaveBeenCalled();
    expect(browserService.clearAllCustomStyles).toHaveBeenCalled();
    expect(wavesurferService.destroy).toHaveBeenCalled();
  });

  it('should call cleanup functions in the correct order when unmounting', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/transcribe-edit/test-id']}>
        <EditorPage />
      </MemoryRouter>
    );

    // Clear any previous calls
    jest.clearAllMocks();

    // Unmount the component
    unmount();

    // Verify all cleanup functions were called
    expect(mockCleanup).toHaveBeenCalled();
    expect(browserService.clearAllCustomStyles).toHaveBeenCalled();
    expect(wavesurferService.destroy).toHaveBeenCalled();
  });
}); 