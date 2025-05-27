import { useEffect, useRef, useState, useCallback } from 'react';
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

export const WaveformPlayer = ({
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
  // Removed excessive render logging to prevent noise

  const waveformRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [currentRegion, setCurrentRegion] = useState<number | null>(null);
  const [zoom, setZoom] = useState(40);
  const [speed, setSpeed] = useState(100);
  const [videoLeft, setVideoLeft] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isInitialRender, setIsInitialRender] = useState(true);

  const onRegionUpdateRef = useRef(onRegionUpdate);

  // Update the ref when onRegionUpdate changes
  useEffect(() => {
    onRegionUpdateRef.current = onRegionUpdate;
  }, [onRegionUpdate]);

  // Get audio URL from S3
  useEffect(() => {
    const getAudioUrl = async () => {
      try {
        console.log('🔗 Getting audio URL for source:', source);
        
        // Check if source is already a full URL
        if (source.startsWith('http://') || source.startsWith('https://')) {
          console.log('✅ Source is already a full URL, using directly:', source);
          setAudioUrl(source);
          return;
        }
        
        // If it's just a path, generate signed URL
        const result = await getUrl({ path: source });
        const url = result.url.toString();
        console.log('✅ Audio URL obtained from path:', url);
        setAudioUrl(url);
      } catch (error) {
        console.error('❌ Error getting audio URL:', error);
        eventBus.emit('on-load-peaks-error');
      }
    };

    if (source) {
      getAudioUrl();
    }
  }, [source]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!audioUrl) {
      console.log('⏳ WaveformPlayer useEffect - waiting for audioUrl');
      return;
    }

    const initWaveSurfer = async () => {
      try {
        // Prevent multiple initializations
        if (wavesurferRef.current) {
          console.log('🔄 WaveSurfer already exists, destroying previous instance');
          try {
            wavesurferRef.current.destroy();
          } catch (error) {
            console.warn('⚠️ Error destroying previous WaveSurfer instance:', error);
          }
          wavesurferRef.current = null;
        }

        console.log('🎛️ Creating WaveSurfer instance...');
        
        // Create regions plugin
        const regionsPlugin = Regions.create();
        regionsPluginRef.current = regionsPlugin;

        // Create timeline plugin
        const timelinePlugin = Timeline.create({
          container: timelineRef.current!,
        });

        // For video files, ensure the video element is ready
        if (isVideo && videoRef.current) {
          videoRef.current.preload = 'auto';
        }

        console.log('🎛️ Creating WaveSurfer with config:', {
          container: waveformRef.current,
          waveColor: '#305880',
          progressColor: '#162738',
          barWidth: 2,
          height: 128,
          plugins: [regionsPlugin, timelinePlugin],
          media: isVideo ? videoRef.current : undefined,
        });

        // Create WaveSurfer instance
        const wavesurfer = WaveSurfer.create({
          container: waveformRef.current!,
          waveColor: '#305880',
          progressColor: '#162738',
          barWidth: 2,
          height: 128,
          autoCenter: true,
          autoScroll: true,
          plugins: [regionsPlugin, timelinePlugin],
          ...(isVideo && videoRef.current ? { media: videoRef.current } : {}),
        });

        console.log('✅ WaveSurfer instance created successfully');
        wavesurferRef.current = wavesurfer;

        // Event listeners
        wavesurfer.on('ready', () => {
          console.log('🎉 WaveSurfer ready event fired!');
          setMaxTime(wavesurfer.getDuration());
          setLoading(false);
          // Don't call renderRegions here - let the useEffect handle it to avoid double rendering

          // Don't handle inbound region here - wait for transcription-ready event
          // This ensures all data is loaded before trying to access regions
          eventBus.emit('waveform-ready');
        });

        // wavesurfer.on('load', (url) => {
        //   console.log('🔄 WaveSurfer load event fired:', url);
        // });

        // wavesurfer.on('decode', (duration) => {
        //   console.log('🎵 WaveSurfer decode event fired, duration:', duration);
        // });

        wavesurfer.on('error', (error) => {
          console.error('❌ WaveSurfer error:', error);
          setLoading(false);
          eventBus.emit('on-load-peaks-error');
        });

        wavesurfer.on('play', () => setPlaying(true));
        wavesurfer.on('pause', () => setPlaying(false));

        wavesurfer.on('timeupdate', (currentTime) => {
          setCurrentTime(currentTime);
        });

        // Region events
        regionsPlugin.on('region-clicked', (region: any) => {
          // Don't handle region clicks in the waveform player
          // Let the RegionList component handle all region clicks to avoid conflicts
          console.log('🎯 Region clicked in waveform:', region.id, '- delegating to RegionList');
        });

        regionsPlugin.on('region-updated', (region: any) => {
          // console.log('🎯 WaveformPlayer: region-updated event fired:', region);
          onRegionUpdateRef.current({
            id: region.id,
            start: region.start,
            end: region.end,
          });
        });

        regionsPlugin.on('region-created', (region: any) => {
          console.log('🆕 WaveformPlayer: region-created event fired:', region.id);
          
          // Only call onRegionUpdate for NEW regions created by drag selection
          // Check that the region has a meaningful duration (> 0.01 seconds)
          // User-created regions from drag selection will always have a proper duration
          if (region.start !== region.end && Math.abs(region.end - region.start) > 0.01) {
            // Check if this region already exists in our regions array
            const existingRegion = regions.find(r => r.id === region.id);
            if (!existingRegion) {
              console.log('✅ Calling onRegionUpdate for new user-created region:', region.id);
              onRegionUpdateRef.current({
                id: region.id,
                start: region.start,
                end: region.end,
              });
            } else {
              // console.log('⏭️ Skipping region update - region already exists:', region.id);
            }
          } else {
            // console.log('⏭️ Skipping region update - zero/minimal duration:', {
            //   duration: Math.abs(region.end - region.start),
            //   threshold: 0.01
            // });
          }
        });

        regionsPlugin.on('region-in', (region: any) => {
          eventBus.emit('region-in', region.id);
        });

        regionsPlugin.on('region-out', (region: any) => {
          eventBus.emit('region-out', region.id);
        });

        // Enable drag selection for editing
        if (canEdit) {
          console.log('🎯 Enabling drag selection for editing');
          regionsPlugin.enableDragSelection({
            color: 'rgba(0, 213, 255, 0.1)',
          });
        } else {
          console.log('⚠️ Drag selection NOT enabled - canEdit is false');
        }

        // Load audio with peaks data (following old Vue pattern)
        // WaveSurfer v7 expects peaks as Array<Float32Array | number[]>
        // The audiowaveform JSON format typically has { data: [array] }
        let peaksArray = null;
        if (peaks) {
          console.log('🔍 Raw peaks data structure:', {
            peaks,
            peaksType: typeof peaks,
            peaksKeys: peaks ? Object.keys(peaks) : null,
            hasData: peaks && 'data' in peaks,
            dataType: peaks?.data ? typeof peaks.data : 'undefined',
            dataIsArray: Array.isArray(peaks?.data),
            dataLength: peaks?.data?.length,
            firstFewDataValues: peaks?.data?.slice(0, 10)
          });

          // Convert audiowaveform JSON format to WaveSurfer v7 format
          if (peaks.data && Array.isArray(peaks.data)) {
            // audiowaveform JSON format: { data: [numbers] }
            // WaveSurfer v7 expects: [Float32Array] or [number[]]
            peaksArray = [peaks.data];
            console.log('✅ Converted audiowaveform JSON to WaveSurfer v7 format:', {
              originalLength: peaks.data.length,
              convertedFormat: 'Array<number[]>',
              peaksArrayLength: peaksArray.length,
              firstArrayLength: peaksArray[0]?.length,
              firstFewValues: peaksArray[0]?.slice(0, 10)
            });
          } else if (Array.isArray(peaks)) {
            // Already in correct format
            peaksArray = peaks;
            console.log('✅ Peaks already in correct format');
          } else {
            console.warn('⚠️ Unknown peaks format, will load without peaks');
          }
        }
        
        try {
          console.log('🎵 About to load audio with peaks:', {
            audioUrl,
            hasPeaksArray: !!peaksArray,
            peaksArrayType: peaksArray ? typeof peaksArray : 'undefined',
            peaksArrayLength: peaksArray?.length,
            isVideo
          });
          
          if (isVideo && videoRef.current) {
            // For video files, WaveSurfer is already connected to the video element via the media option
            // We still need to call load with the URL and peaks for proper initialization
            console.log('🎬 Loading video URL with peaks data (video element already connected)');
            await wavesurfer.load(audioUrl, peaksArray || undefined);
          } else {
            // For audio files, load the URL
            await wavesurfer.load(audioUrl, peaksArray || undefined);
          }
          console.log('✅ WaveSurfer load completed successfully');
        } catch (error) {
          console.error('❌ Error during wavesurfer.load():', error);
          setLoading(false);
          eventBus.emit('on-load-peaks-error');
          return; // Exit early if load fails
        }

        // Set zoom from localStorage
        const savedZoom = localStorage.getItem('zoom');
        if (canEdit && savedZoom) {
          setZoom(parseInt(savedZoom));
        }
      } catch (error) {
        console.error('Error initializing WaveSurfer:', error);
        eventBus.emit('on-load-peaks-error');
      }
    };

    const initializeWhenReady = () => {
      if (!waveformRef.current) {
        console.log('⏳ WaveformPlayer - DOM not ready, retrying...');
        return false;
      }
      
      console.log('🚀 WaveformPlayer useEffect triggered (Note: React StrictMode causes double initialization in dev):', {
        hasWaveformRef: !!waveformRef.current,
        hasAudioUrl: !!audioUrl,
        hasPeaks: !!peaks,
        peaksStructure: peaks
      });
      
      initWaveSurfer();
      return true;
    };

    // Try immediately
    if (initializeWhenReady()) {
      return; // Success
    }

    // If DOM not ready, try again after a short delay
    const timeoutId = setTimeout(() => {
      if (!initializeWhenReady()) {
        console.warn('⚠️ WaveformPlayer: DOM element still not ready after delay');
      }
    }, 50);
    
    return () => {
      console.log('🧹 WaveformPlayer cleanup function called');
      clearTimeout(timeoutId);
      if (wavesurferRef.current) {
        console.log('🗑️ Destroying WaveSurfer instance in cleanup');
        try {
          wavesurferRef.current.destroy();
        } catch (error) {
          console.warn('⚠️ Error destroying WaveSurfer instance in cleanup:', error);
        }
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, peaks, canEdit, isVideo]);

  // Handle zoom changes
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(zoom);
      if (canEdit) {
        localStorage.setItem('zoom', zoom.toString());
      }
    }
  }, [zoom, canEdit]);

  // Handle speed changes
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(speed / 100);
    }
  }, [speed]);

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
        const region = regionsPluginRef.current
          .getRegions()
          .find((r: any) => r.id === regionId);
        if (region) {
          try {
            console.log('🎵 Playing region from user click:', regionId);
            // Seek to region start and play the main audio
            const startTime = region.start;
            const duration = wavesurferRef.current.getDuration();
            const progress = startTime / duration;
            
            // Seek to region (this will auto-center due to autoCenter: true)
            wavesurferRef.current.seekTo(progress);
            
            // Play the main audio instead of using region.play() to avoid stack overflow
            await wavesurferRef.current.play();
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
        }
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
  }, []); // No dependencies - these handlers are stable

  // Handle inbound region separately to avoid re-initializing WaveSurfer
  useEffect(() => {
    const handleTranscriptionReady = () => {
      // Handle inbound region when transcription is fully ready
      // This ensures all regions are loaded before trying to access them
      if (inboundRegion && regionsPluginRef.current && wavesurferRef.current) {
        console.log('🎯 Transcription ready, handling inbound region:', inboundRegion);
        
        const region = regionsPluginRef.current
          .getRegions()
          .find((r: any) => r.id === inboundRegion);
        if (region) {
          const startTime = region.start;
          const duration = wavesurferRef.current.getDuration();
          const progress = startTime / duration;
          
          // Seek to the region start (this will auto-center due to autoCenter: true)
          wavesurferRef.current.seekTo(progress);
          
          console.log('✅ Seeked and centered inbound region:', inboundRegion, 'at time:', startTime, 'progress:', progress);
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
      <div ref={waveformRef} className="w-full h-32 bg-white" />

      {/* Timeline */}
      <div ref={timelineRef} className="w-full h-5 bg-gray-100 border-t border-gray-300" />

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
};
