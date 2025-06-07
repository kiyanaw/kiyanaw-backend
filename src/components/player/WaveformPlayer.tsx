import { useEffect, useRef, useState, useCallback } from 'react';
import React from 'react';
import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { getUrl } from 'aws-amplify/storage';
import { eventBus } from '../../lib/eventBus';

interface Region {
  id: string;
  start: number;
  end: number;
  displayIndex?: number;
  isNote?: boolean;
  text?: string;
  translation?: string;
}

interface WaveformPlayerProps {
  source: string;
  peaks?: any;
  canEdit: boolean;
  inboundRegion?: string | null;
  regions: Region[];
  isVideo: boolean;
  title: string;
  onRegionUpdate: (region: any) => void;
  onLookup: () => void;
}

export const WaveformPlayer = React.memo(({
  source,
  peaks,
  canEdit,
  inboundRegion,
  regions,
  isVideo,
  title,
  onRegionUpdate,
  onLookup,
}: WaveformPlayerProps) => {
  console.log('--- WaveformPlayer Render ---', { source, hasPeaks: !!peaks });

  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);
  const onRegionUpdateRef = useRef(onRegionUpdate);
  const isMountedRef = useRef(false);
  const regionUpdateThrottleRef = useRef<{ [key: string]: number }>({});

  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [currentRegion, setCurrentRegion] = useState<number | null>(null);
  const [zoom, setZoom] = useState(40);
  const [speed, setSpeed] = useState(100);
  const [videoLeft, setVideoLeft] = useState(false);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [inboundRegionHandled, setInboundRegionHandled] = useState<string | null>(null);

  // Update the ref when onRegionUpdate changes
  useEffect(() => {
    onRegionUpdateRef.current = onRegionUpdate;
  }, [onRegionUpdate]);

  // Effect for WaveSurfer creation and destruction
  useEffect(() => {
    if (!waveformContainerRef.current || !timelineContainerRef.current) return;

    // If isVideo is true, we need the video element to be ready.
    if (isVideo && !videoRef.current) {
      console.warn("WaveformPlayer: isVideo is true, but video element ref is not available yet.");
      return;
    }

    console.log('--- Initializing WaveSurfer ---');

    const regionsPlugin = Regions.create();
    regionsPluginRef.current = regionsPlugin;

    const timelinePlugin = Timeline.create({
      container: timelineContainerRef.current,
    });

    const ws = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: '#305880',
      progressColor: '#162738',
      barWidth: 2,
      height: 128,
      plugins: [regionsPlugin, timelinePlugin],
      ...(isVideo && videoRef.current && { media: videoRef.current }),
    });

    wavesurferRef.current = ws;

    // --- Attach Event Handlers ---
    ws.on('ready', (duration) => {
      console.log(`🎉 WaveSurfer ready! Duration: ${duration}`);
      setLoading(false);
      setMaxTime(duration);
      eventBus.emit('waveform-ready');
    });

    ws.on('error', (err) => {
      console.error('❌ WaveSurfer error:', err);
      setLoading(false); // Stop loading on error
    });

    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('audioprocess', (time) => setCurrentTime(time));
    ws.on('seeking', (time) => setCurrentTime(time));
    
    // --- Region Event Handlers ---
    regionsPlugin.on('region-updated', (region) => {
      if (isInitialRender) return;

      const throttleKey = region.id;
      const now = Date.now();
      const lastCall = regionUpdateThrottleRef.current[throttleKey] || 0;

      if (now - lastCall > 200) { // Throttle updates to every 200ms
        console.log('🔄 Region updated (throttled):', region.id);
        onRegionUpdateRef.current({
          id: region.id,
          start: region.start,
          end: region.end,
        });
        regionUpdateThrottleRef.current[throttleKey] = now;
      }
    });

    regionsPlugin.on('region-created', (region) => {
      if (isInitialRender) {
        console.log('🚫 Ignoring region-created during initial render');
        return;
      }
      console.log('✨ Region created:', region.id);
      onRegionUpdateRef.current({
        id: region.id,
        start: region.start,
        end: region.end,
      });
    });

    // --- Load Media ---
    const loadMedia = async () => {
      if (source && peaks) {
        setLoading(true);
        console.log('⏳ Loading media and peaks into WaveSurfer...');
        try {
          await ws.load(source, peaks);
          console.log('✅ Media and peaks loaded.');
        } catch (error) {
          console.error('❌ Error loading media into WaveSurfer:', error);
          setLoading(false);
        }
      } else {
        console.log('⏳ WaveformPlayer: Waiting for source or peaks...');
        setLoading(true);
      }
    };
    loadMedia();

    return () => {
      console.log('🧹 Destroying WaveSurfer instance.');
      ws.destroy();
      wavesurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, peaks, isVideo]); // Re-create if source, peaks or isVideo changes.

  // Handle zoom changes
  useEffect(() => {
    if (wavesurferRef.current && !loading) {
      wavesurferRef.current.zoom(zoom);
      if (canEdit) {
        localStorage.setItem('zoom', zoom.toString());
      }
    }
  }, [zoom, canEdit, loading]);

  // Handle speed changes
  useEffect(() => {
    if (wavesurferRef.current && !loading) {
      wavesurferRef.current.setPlaybackRate(speed / 100);
    }
  }, [speed, loading]);

  // Render regions when they change
  useEffect(() => {
    if (!regionsPluginRef.current || loading) return;

    console.log('🎨 renderRegions called with:', regions.map(r => ({
      id: r.id,
      start: r.start,
      end: r.end,
      isNote: r.isNote,
      displayIndex: r.displayIndex
    })));

    regionsPluginRef.current.clearRegions();

    regions.forEach((region) => {
      if (!region.isNote) {
        // console.log('➕ Adding region to WaveSurfer:', {
        //   id: region.id,
        //   start: region.start,
        //   end: region.end,
        //   displayIndex: region.displayIndex
        // });
        
        regionsPluginRef.current.addRegion({
          id: region.id,
          start: region.start,
          end: region.end,
          color: 'rgba(0, 0, 0, 0.1)',
          resize: canEdit,
          drag: canEdit,
          content: region.displayIndex?.toString() || '',
        });
      }
    });
  }, [regions, canEdit, loading]);

  // Handle initial render flag separately to avoid triggering renderRegions twice
  useEffect(() => {
    if (!loading && isInitialRender) {
      setIsInitialRender(false);
      console.log('🎯 Initial render complete, enabling region-created updates');
    }
  }, [loading, isInitialRender]);

  // Event bus listeners (stable - no dependencies that change)
  useEffect(() => {
    const handleRegionIn = async (regionId: unknown) => {
      // Handle region-in events for UI updates only, don't seek
      // Seeking on region-in creates infinite loops since seeking triggers more region-in events
      if (
        regionsPluginRef.current &&
        wavesurferRef.current &&
        typeof regionId === 'string'
      ) {
        console.log('🎯 Playhead entered region:', regionId);
        
        // Update region color directly without re-rendering
        const region = regionsPluginRef.current.getRegions().find((r: any) => r.id === regionId);
        if (region) {
          region.setOptions({ color: 'rgba(0, 213, 255, 0.1)' });
        }
      }
    };

    const handleRegionPlay = async (regionId: unknown) => {
      // Handle user-initiated region play (from clicking on region list)
      if (
        regionsPluginRef.current &&
        wavesurferRef.current &&
        typeof regionId === 'string'
      ) {
        console.log('🎵 handleRegionPlay called:', {
          regionId,
          hasRegionsPlugin: !!regionsPluginRef.current,
          hasWavesurfer: !!wavesurferRef.current,
          wavesurferReady: wavesurferRef.current?.getDuration() > 0,
          isMounted: isMountedRef.current
        });
        
        const region = regionsPluginRef.current
          .getRegions()
          .find((r: any) => r.id === regionId);
        if (region) {
          try {
            console.log('🎵 Playing region from user click:', regionId);
            
            // Clear inbound region highlighting when user manually plays a different region
            if (inboundRegion && regionId !== inboundRegion) {
              const inboundRegionObj = regionsPluginRef.current
                .getRegions()
                .find((r: any) => r.id === inboundRegion);
              if (inboundRegionObj) {
                inboundRegionObj.setOptions({ color: 'rgba(0, 0, 0, 0.1)' });
                console.log('🔄 Cleared inbound region highlighting for:', inboundRegion);
              }
            }
            
            // Seek to region start and play the main audio
            const startTime = region.start;
            const duration = wavesurferRef.current.getDuration();
            const progress = startTime / duration;
            
            console.log('🎵 About to seek and play:', {
              startTime,
              duration,
              progress,
              currentTime: wavesurferRef.current.getCurrentTime(),
              isPlaying: wavesurferRef.current.isPlaying()
            });
            
            // Seek to region (this will auto-center due to autoCenter: true)
            wavesurferRef.current.seekTo(progress);
            
            // Play the main audio instead of using region.play() to avoid stack overflow
            await wavesurferRef.current.play();
            console.log('✅ Region play completed successfully');
          } catch (error) {
            // Handle browser autoplay restrictions gracefully
            if (error instanceof Error && error.name === 'NotAllowedError') {
              console.log('🔇 Auto-play blocked by browser - user interaction required');
              // Just seek to the region if play is blocked
              const startTime = region.start;
              const duration = wavesurferRef.current.getDuration();
              const progress = startTime / duration;
              wavesurferRef.current.seekTo(progress);
            } else {
              console.error('❌ Error playing region:', error);
            }
          }
        } else {
          console.warn('⚠️ Region not found in WaveSurfer regions:', regionId);
        }
      } else {
        console.warn('⚠️ WaveSurfer or regions plugin not available for region play:', {
          regionId,
          hasRegionsPlugin: !!regionsPluginRef.current,
          hasWavesurfer: !!wavesurferRef.current,
          isMounted: isMountedRef.current
        });
      }
    };

    const handleRegionOut = async (regionId: unknown) => {
      if (
        regionsPluginRef.current &&
        typeof regionId === 'string'
      ) {
        console.log('🎯 Playhead exited region:', regionId);
        
        // Reset region color directly without re-rendering
        const region = regionsPluginRef.current.getRegions().find((r: any) => r.id === regionId);
        if (region) {
          region.setOptions({ color: 'rgba(0, 0, 0, 0.1)' });
        }
      }
    };

    eventBus.on('region-in', handleRegionIn);
    eventBus.on('region-out', handleRegionOut);
    eventBus.on('region-play', handleRegionPlay);

    return () => {
      eventBus.off('region-in', handleRegionIn);
      eventBus.off('region-out', handleRegionOut);
      eventBus.off('region-play', handleRegionPlay);
    };
  }, [inboundRegion]); // Added inboundRegion dependency for highlighting management

  // Handle inbound region separately to avoid re-initializing WaveSurfer
  useEffect(() => {
    const handleTranscriptionReady = () => {
      // Handle inbound region when transcription is fully ready
      // This ensures all regions are loaded before trying to access them
      if (inboundRegion && regionsPluginRef.current && wavesurferRef.current) {
        // Prevent duplicate handling during React StrictMode re-initialization
        if (inboundRegionHandled === inboundRegion) {
          console.log('🔄 Inbound region already handled, skipping:', inboundRegion);
          return;
        }

        console.log('🎯 Transcription ready, handling inbound region:', inboundRegion);
        
        const region = regionsPluginRef.current
          .getRegions()
          .find((r: any) => r.id === inboundRegion);
        if (region) {
          const startTime = region.start;
          const duration = wavesurferRef.current.getDuration();
          const progress = startTime / duration;
          
          // Highlight the inbound region with blue color (deep link behavior)
          region.setOptions({ color: 'rgba(0, 213, 255, 0.1)' });
          
          // Seek to the region start (this will auto-center due to autoCenter: true)
          wavesurferRef.current.seekTo(progress);
          
          // Mark as handled to prevent duplicate processing
          setInboundRegionHandled(inboundRegion);
          
          console.log('✅ Seeked, centered, and highlighted inbound region:', inboundRegion, 'at time:', startTime, 'progress:', progress);
        } else {
          console.warn('⚠️ Inbound region not found:', inboundRegion);
        }
      }
    };

    eventBus.on('transcription-ready', handleTranscriptionReady);

    return () => {
      eventBus.off('transcription-ready', handleTranscriptionReady);
    };
  }, [inboundRegion]); // Only depends on inboundRegion, not the WaveSurfer initialization

  // Reset inbound region handled flag when inboundRegion changes
  useEffect(() => {
    if (inboundRegion !== inboundRegionHandled) {
      console.log('🔄 Inbound region changed, resetting handled flag:', {
        previous: inboundRegionHandled,
        new: inboundRegion
      });
      setInboundRegionHandled(null);
    }
  }, [inboundRegion, inboundRegionHandled]);

  const playPause = async () => {
    if (!wavesurferRef.current) return;

    // If there's an inbound region and we're currently paused, seek to it first
    if (!playing && inboundRegion && regionsPluginRef.current) {
      const region = regionsPluginRef.current
        .getRegions()
        .find((r: any) => r.id === inboundRegion);
      if (region) {
        const currentTime = wavesurferRef.current.getCurrentTime();
        const isWithinRegion = currentTime >= region.start && currentTime <= region.end;
        
        // Only seek to region start if we're not already within the region
        if (!isWithinRegion) {
          console.log('🎵 Seeking to inbound region before play:', inboundRegion, 'current:', currentTime, 'region:', region.start, '-', region.end);
          // Seek to region start
          const startTime = region.start;
          const duration = wavesurferRef.current.getDuration();
          const progress = startTime / duration;
          
          // Seek to region (this will auto-center due to autoCenter: true)
          wavesurferRef.current.seekTo(progress);
          
          // Add a small delay to let the seek operation complete before playing
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          console.log('🎵 Already within inbound region, resuming from current position:', currentTime);
        }
      }
    }

    // Use the standard playPause method for consistent behavior
    try {
      await wavesurferRef.current.playPause();
    } catch (error) {
      // Handle browser autoplay restrictions gracefully
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('🔇 Auto-play blocked by browser - user interaction required');
      } else {
        console.error('❌ Error with playPause:', error);
      }
    }
  };

  const markRegion = () => {
    if (!wavesurferRef.current || !canEdit) return;

    if (currentRegion !== null) {
      // End region
      const regionData = {
        id: `wavesurfer_${Date.now()}`,
        start: currentRegion,
        end: wavesurferRef.current.getCurrentTime(),
      };

                regionsPluginRef.current?.addRegion({
            ...regionData,
            color: 'rgba(0, 213, 255, 0.1)',
            resize: true,
            drag: true,
          });

          onRegionUpdateRef.current(regionData);
      setCurrentRegion(null);
    } else {
      // Start region
      setCurrentRegion(wavesurferRef.current.getCurrentTime());
    }
  };

  const cancelRegion = () => {
    setCurrentRegion(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-white border border-gray-300 rounded-lg overflow-hidden relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-[1000]">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-[#305880] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading waveform...</p>
        </div>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#dbdbdb] h-8 px-4 text-gray-900 font-bold text-sm">
        <div className="uppercase overflow-hidden text-ellipsis whitespace-nowrap flex-1">
          <span>{title}</span>
        </div>
        <div className="font-bold text-sm">
          {formatTime(currentTime)}/{formatTime(maxTime)}
        </div>
      </div>

      {/* Waveform */}
      <div ref={waveformContainerRef} className="w-full h-32 bg-white" />

      {/* Timeline */}
      <div ref={timelineContainerRef} className="w-full h-5 bg-gray-100 border-t border-gray-300" />

      {/* Controls */}
      <div className="flex items-center justify-between h-10 bg-gray-100 px-5 border-t border-gray-300 md:flex-row md:h-10 md:px-5 flex-col h-auto px-2.5 py-2.5 gap-2.5">
        <div className="flex items-center gap-2">
          <button
            className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-black hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={playPause}
            data-testid="play-button"
          >
            {playing ? '⏸️' : '▶️'}
          </button>

          {canEdit && (
            <>
              <button
                className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-black hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={markRegion}
                data-testid="mark-region"
              >
                {currentRegion !== null ? '⏹️' : '🎯'}
              </button>

              <button
                className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-black hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={cancelRegion}
                disabled={currentRegion === null}
              >
                ❌
              </button>
            </>
          )}

          <span className="mx-2 text-gray-600 font-bold">|</span>

          <button 
            className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-black hover:bg-opacity-10"
            onClick={onLookup}
          >
            🔍
          </button>
        </div>

        <div className="md:flex hidden items-center gap-2">
          <label className="text-xs font-bold text-gray-600 min-w-[40px]">Zoom:</label>
          <input
            type="range"
            min="5"
            max="75"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-25"
          />
          <button 
            className="bg-none border-none text-sm cursor-pointer px-1 py-0.5 rounded transition-colors hover:bg-black hover:bg-opacity-10"
            onClick={() => setZoom(40)}
          >
            🔍
          </button>
        </div>

        <div className="md:flex hidden items-center gap-2">
          <label className="text-xs font-bold text-gray-600 min-w-[40px]">Speed:</label>
          <input
            type="range"
            min="50"
            max="150"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="w-25"
          />
          <button 
            className="bg-none border-none text-sm cursor-pointer px-1 py-0.5 rounded transition-colors hover:bg-black hover:bg-opacity-10"
            onClick={() => setSpeed(100)}
          >
            🏃
          </button>
        </div>
      </div>

      {/* Video element for video files */}
      {isVideo && (
        <video
          ref={videoRef}
          src={source}
          muted
          className={`fixed bottom-4 max-w-[350px] max-h-[350px] z-[190] shadow-lg cursor-pointer rounded ${
            videoLeft ? 'left-4' : 'right-4'
          } md:max-w-[350px] md:max-h-[350px] max-w-[250px] max-h-[200px]`}
          playsInline
          onClick={() => setVideoLeft(!videoLeft)}
          style={{ display: loading ? 'none' : 'block' }}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.source === nextProps.source &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.inboundRegion === nextProps.inboundRegion &&
    prevProps.isVideo === nextProps.isVideo &&
    prevProps.title === nextProps.title &&
    // Compare function props by reference (they should be stable via useCallback)
    prevProps.onRegionUpdate === nextProps.onRegionUpdate &&
    prevProps.onLookup === nextProps.onLookup &&
    // For regions array, do a shallow comparison of only the essential properties
    prevProps.regions.length === nextProps.regions.length &&
    prevProps.regions.every((r, i) => {
      const next = nextProps.regions[i];
      return (
        r.id === next.id && 
        r.start === next.start && 
        r.end === next.end && 
        r.isNote === next.isNote
      );
    })
  );
});
