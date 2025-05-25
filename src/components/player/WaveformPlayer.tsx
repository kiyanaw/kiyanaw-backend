import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { getUrl } from 'aws-amplify/storage';
import { eventBus } from '../../lib/eventBus';
import './WaveformPlayer.css';

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
  console.log('🎯 WaveformPlayer render:', {
    source,
    hasPeaks: !!peaks,
    peaksType: typeof peaks,
    peaksKeys: peaks ? Object.keys(peaks) : null,
    canEdit,
    isVideo,
    title
  });

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
          wavesurferRef.current.destroy();
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

        console.log('🎛️ Creating WaveSurfer with config:', {
          container: waveformRef.current,
          waveColor: '#305880',
          progressColor: '#162738',
          barWidth: 2,
          height: 128,
          plugins: [regionsPlugin, timelinePlugin],
        });

        // Create WaveSurfer instance
        const wavesurfer = WaveSurfer.create({
          container: waveformRef.current!,
          waveColor: '#305880',
          progressColor: '#162738',
          barWidth: 2,
          height: 128,
          plugins: [regionsPlugin, timelinePlugin],
        });

        console.log('✅ WaveSurfer instance created successfully');
        wavesurferRef.current = wavesurfer;

        // Event listeners
        wavesurfer.on('ready', () => {
          console.log('🎉 WaveSurfer ready event fired!');
          setMaxTime(wavesurfer.getDuration());
          setLoading(false);
          renderRegions();

          // Handle inbound region
          if (inboundRegion && regionsPlugin.getRegions().length > 0) {
            const region = regionsPlugin
              .getRegions()
              .find((r: any) => r.id === inboundRegion);
            if (region) {
              const startTime = region.start;
              const duration = wavesurfer.getDuration();
              wavesurfer.seekTo(startTime / duration);
              eventBus.emit('region-in', inboundRegion);
            }
          }

          eventBus.emit('waveform-ready');
        });

        wavesurfer.on('load', (url) => {
          console.log('🔄 WaveSurfer load event fired:', url);
        });

        wavesurfer.on('decode', (duration) => {
          console.log('🎵 WaveSurfer decode event fired, duration:', duration);
        });

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
          if (!canEdit) {
            // For viewers, play the region
            setTimeout(() => {
              region.play();
            }, 25);
          }
        });

        regionsPlugin.on('region-updated', (region: any) => {
          onRegionUpdate({
            id: region.id,
            start: region.start,
            end: region.end,
          });
        });

        regionsPlugin.on('region-in', (region: any) => {
          eventBus.emit('region-in', region.id);
        });

        regionsPlugin.on('region-out', (region: any) => {
          eventBus.emit('region-out', region.id);
        });

        // Enable drag selection for editing
        if (canEdit) {
          regionsPlugin.enableDragSelection({
            color: 'rgba(0, 213, 255, 0.1)',
          });
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
          
          // Load audio/video with or without peaks
          await wavesurfer.load(audioUrl, peaksArray || undefined);
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
      
      console.log('🚀 WaveformPlayer useEffect triggered:', {
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
      clearTimeout(timeoutId);
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, peaks, canEdit, inboundRegion, isVideo, onRegionUpdate]);

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
  const renderRegions = useCallback(() => {
    if (!regionsPluginRef.current) return;

    regionsPluginRef.current.clearRegions();

    regions.forEach((region) => {
      if (!region.isNote) {
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
  }, [regions, canEdit]);

  useEffect(() => {
    renderRegions();
  }, [renderRegions]);

  // Event bus listeners
  useEffect(() => {
    const handleRegionIn = (regionId: unknown) => {
      if (
        regionsPluginRef.current &&
        wavesurferRef.current &&
        typeof regionId === 'string'
      ) {
        const region = regionsPluginRef.current
          .getRegions()
          .find((r: any) => r.id === regionId);
        if (region) {
          region.play();
        }
      }
    };

    eventBus.on('region-in', handleRegionIn);

    return () => {
      eventBus.off('region-in', handleRegionIn);
    };
  }, []);

  const playPause = () => {
    if (!wavesurferRef.current) return;

    if (inboundRegion && regionsPluginRef.current) {
      const region = regionsPluginRef.current
        .getRegions()
        .find((r: any) => r.id === inboundRegion);
      if (region) {
        region.play();
        return;
      }
    }

    wavesurferRef.current.playPause();
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

      onRegionUpdate(regionData);
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
    <div className="waveform-container" style={{ position: 'relative' }}>
      {/* Loading overlay */}
      {loading && (
        <div className="waveform-loading" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="loading-spinner"></div>
          <p>Loading waveform...</p>
        </div>
      )}
      {/* Header */}
      <div className="waveform-header">
        <div className="media-title">
          <span>{title}</span>
        </div>
        <div className="main-time">
          {formatTime(currentTime)}/{formatTime(maxTime)}
        </div>
      </div>

      {/* Waveform */}
      <div ref={waveformRef} className="waveform" />

      {/* Timeline */}
      <div ref={timelineRef} className="timeline" />

      {/* Controls */}
      <div className="channel-strip">
        <div className="controls">
          <button
            className="control-btn"
            onClick={playPause}
            data-testid="play-button"
          >
            {playing ? '⏸️' : '▶️'}
          </button>

          {canEdit && (
            <>
              <button
                className="control-btn"
                onClick={markRegion}
                data-testid="mark-region"
              >
                {currentRegion !== null ? '⏹️' : '🎯'}
              </button>

              <button
                className="control-btn"
                onClick={cancelRegion}
                disabled={currentRegion === null}
              >
                ❌
              </button>
            </>
          )}

          <span className="separator">|</span>

          <button className="control-btn" onClick={onLookup}>
            🔍
          </button>
        </div>

        <div className="zoom-control">
          <label>Zoom:</label>
          <input
            type="range"
            min="5"
            max="75"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
          />
          <button onClick={() => setZoom(40)}>🔍</button>
        </div>

        <div className="speed-control">
          <label>Speed:</label>
          <input
            type="range"
            min="50"
            max="150"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
          />
          <button onClick={() => setSpeed(100)}>🏃</button>
        </div>
      </div>

      {/* Video element for video files */}
      {isVideo && (
        <video
          ref={videoRef}
          className={`video ${videoLeft ? 'video-left' : 'video-right'}`}
          controls
          playsInline
          onClick={() => setVideoLeft(!videoLeft)}
          style={{ display: loading ? 'none' : 'block' }}
        >
          <source src={audioUrl} />
        </video>
      )}
    </div>
  );
};
