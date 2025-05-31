import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { WaveformPlayer } from './WaveformPlayer';
import React from 'react';

// Mock WaveSurfer and its plugins
jest.mock('wavesurfer.js', () => {
  const mockWaveSurfer = {
    create: jest.fn(() => ({
      load: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      getDuration: jest.fn(() => 100),
      getCurrentTime: jest.fn(() => 0),
      isPlaying: jest.fn(() => false),
      seekTo: jest.fn(),
      play: jest.fn(),
      playPause: jest.fn(),
      zoom: jest.fn(),
      setPlaybackRate: jest.fn(),
    })),
  };
  return mockWaveSurfer;
});

jest.mock('wavesurfer.js/dist/plugins/regions.esm.js', () => ({
  create: jest.fn(() => ({
    clearRegions: jest.fn(),
    addRegion: jest.fn(),
    getRegions: jest.fn(() => []),
    on: jest.fn(),
    enableDragSelection: jest.fn(),
  })),
}));

jest.mock('wavesurfer.js/dist/plugins/timeline.esm.js', () => ({
  create: jest.fn(),
}));

jest.mock('aws-amplify/storage', () => ({
  getUrl: jest.fn(() => Promise.resolve({ url: new URL('http://test.com/audio.mp3') })),
}));

jest.mock('../../lib/eventBus', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

describe('WaveformPlayer React.memo behavior', () => {
  const defaultProps = {
    source: 'test-audio.mp3',
    peaks: { data: [1, 2, 3, 4, 5] },
    canEdit: true,
    inboundRegion: null,
    regions: [
      { id: 'region1', start: 10, end: 20, isNote: false, text: 'Test region' },
      { id: 'region2', start: 30, end: 40, isNote: false, text: 'Another region' },
    ],
    isVideo: false,
    title: 'Test Audio',
    onRegionUpdate: jest.fn(),
    onLookup: jest.fn(),
  };

  let renderCount = 0;

  // Create a wrapper that tracks renders
  const WaveformPlayerWithRenderTracking = React.memo(
    (props: any) => {
      renderCount++;
      console.log(`🔍 TEST: WaveformPlayer render #${renderCount}`);
      return <WaveformPlayer {...props} />;
    },
    // Use the same comparison function as our actual component
    (prevProps, nextProps) => {
      const isEqual = (
        prevProps.source === nextProps.source &&
        prevProps.peaks === nextProps.peaks &&
        prevProps.canEdit === nextProps.canEdit &&
        prevProps.inboundRegion === nextProps.inboundRegion &&
        prevProps.isVideo === nextProps.isVideo &&
        prevProps.title === nextProps.title &&
        prevProps.onRegionUpdate === nextProps.onRegionUpdate &&
        prevProps.onLookup === nextProps.onLookup &&
        prevProps.regions.length === nextProps.regions.length &&
        prevProps.regions.every((r: any, i: number) => {
          const next = nextProps.regions[i];
          return (
            r.id === next.id && 
            r.start === next.start && 
            r.end === next.end && 
            r.isNote === next.isNote &&
            r.text === next.text
          );
        })
      );
      
      if (!isEqual) {
        console.log('🔍 TEST: Props changed, allowing re-render:', {
          source: prevProps.source !== nextProps.source,
          peaks: prevProps.peaks !== nextProps.peaks,
          canEdit: prevProps.canEdit !== nextProps.canEdit,
          inboundRegion: prevProps.inboundRegion !== nextProps.inboundRegion,
          isVideo: prevProps.isVideo !== nextProps.isVideo,
          title: prevProps.title !== nextProps.title,
          onRegionUpdate: prevProps.onRegionUpdate !== nextProps.onRegionUpdate,
          onLookup: prevProps.onLookup !== nextProps.onLookup,
          regionsLength: prevProps.regions.length !== nextProps.regions.length,
        });
      }
      
      return isEqual;
    }
  );

  beforeEach(() => {
    renderCount = 0;
    jest.clearAllMocks();
  });

  test('should not re-render when props are identical', async () => {
    let result: RenderResult;
    await act(async () => {
      result = render(<WaveformPlayerWithRenderTracking {...defaultProps} />);
    });

    await waitFor(() => {
      expect(renderCount).toBe(1);
    });

    // Re-render with identical props
    await act(async () => {
      result.rerender(<WaveformPlayerWithRenderTracking {...defaultProps} />);
    });

    // Should not trigger additional renders
    expect(renderCount).toBe(1);
  });

  test('should not re-render when only region displayIndex changes', async () => {
    let result: RenderResult;
    await act(async () => {
      result = render(<WaveformPlayerWithRenderTracking {...defaultProps} />);
    });

    await waitFor(() => {
      expect(renderCount).toBe(1);
    });

    // Create new regions array with different displayIndex/index properties
    const regionsWithDifferentIndex = defaultProps.regions.map((r, i) => ({
      ...r,
      displayIndex: i + 100, // Different displayIndex
      index: i + 50, // Different index
    }));

    await act(async () => {
      result.rerender(
        <WaveformPlayerWithRenderTracking 
          {...defaultProps} 
          regions={regionsWithDifferentIndex} 
        />
      );
    });

    // Should not trigger additional renders since core region data is the same
    expect(renderCount).toBe(1);
  });

  test('should re-render when essential region properties change', async () => {
    let result: RenderResult;
    await act(async () => {
      result = render(<WaveformPlayerWithRenderTracking {...defaultProps} />);
    });

    await waitFor(() => {
      expect(renderCount).toBe(1);
    });

    // Change essential region property
    const regionsWithDifferentText = [
      { ...defaultProps.regions[0], text: 'Different text' },
      defaultProps.regions[1],
    ];

    await act(async () => {
      result.rerender(
        <WaveformPlayerWithRenderTracking 
          {...defaultProps} 
          regions={regionsWithDifferentText} 
        />
      );
    });

    // Should trigger re-render
    await waitFor(() => {
      expect(renderCount).toBe(2);
    });
  });

  test('should re-render when function props change', async () => {
    let result: RenderResult;
    await act(async () => {
      result = render(<WaveformPlayerWithRenderTracking {...defaultProps} />);
    });

    await waitFor(() => {
      expect(renderCount).toBe(1);
    });

    // Create new function reference
    const newOnRegionUpdate = jest.fn();

    await act(async () => {
      result.rerender(
        <WaveformPlayerWithRenderTracking 
          {...defaultProps} 
          onRegionUpdate={newOnRegionUpdate}
        />
      );
    });

    // Should trigger re-render due to function reference change
    await waitFor(() => {
      expect(renderCount).toBe(2);
    });
  });

  test('should not re-render when inboundRegion changes from same value to same value', async () => {
    const propsWithInboundRegion = { ...defaultProps, inboundRegion: 'region1' };
    
    let result: RenderResult;
    await act(async () => {
      result = render(<WaveformPlayerWithRenderTracking {...propsWithInboundRegion} />);
    });

    await waitFor(() => {
      expect(renderCount).toBe(1);
    });

    // Re-render with same inboundRegion
    await act(async () => {
      result.rerender(<WaveformPlayerWithRenderTracking {...propsWithInboundRegion} />);
    });

    expect(renderCount).toBe(1);
  });

  test('should identify when transcription object reference changes', async () => {
    // Simulate transcription object getting new reference (common issue)
    const peaks1 = { data: [1, 2, 3] };
    const peaks2 = { data: [1, 2, 3] }; // Same data, different object

    let result: RenderResult;
    await act(async () => {
      result = render(<WaveformPlayerWithRenderTracking {...defaultProps} peaks={peaks1} />);
    });

    await waitFor(() => {
      expect(renderCount).toBe(1);
    });

    await act(async () => {
      result.rerender(<WaveformPlayerWithRenderTracking {...defaultProps} peaks={peaks2} />);
    });

    // Should trigger re-render due to object reference change
    await waitFor(() => {
      expect(renderCount).toBe(2);
    });
  });
});

describe('WaveformPlayer re-render debugging', () => {
  test('should properly handle WaveSurfer initialization', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    const props = {
      source: 'audio1.mp3',
      peaks: { data: [1] },
      canEdit: true,
      inboundRegion: null,
      regions: [],
      isVideo: false,
      title: 'Test',
      onRegionUpdate: jest.fn(),
      onLookup: jest.fn(),
    };

    await act(async () => {
      render(<WaveformPlayer {...props} />);
    });

    // Should log WaveSurfer initialization steps
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Getting audio URL for source'),
      'audio1.mp3'
    );

    consoleSpy.mockRestore();
  });
}); 