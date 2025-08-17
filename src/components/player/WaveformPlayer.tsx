import { useRef, useCallback, useState, useEffect } from 'react';
import { Play, Pause, ZoomIn, Gauge, Settings, ArrowLeft, Circle, ArrowRight, Minimize2, Maximize2, ChevronDown, Video as VideoIcon, Lock, Unlock, Sparkles } from 'lucide-react';
import { wavesurferService } from '../../services/wavesurferService';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlay } from '../../hooks/usePlay';
import { usePause } from '../../hooks/usePause';
import { useSelectAndPlayRegion } from '../../hooks/useSelectAndPlayRegion';
import { useEditorStore } from '../../stores/useEditorStore';
import { CreateRegion } from '../../use-cases/create-region';
import { services } from '../../services';

interface Region {
  id: string;
  start: number;
  end: number;
  isNote?: boolean;
  text?: string;
  translation?: string;
}

interface WaveformPlayerProps {
  source: string;
  inboundRegion?: string | null; // Currently unused but may be needed later
  regions: Region[]; // Now using this for region count
  isVideo: boolean;
  title: string;
  transcriptionId: string;
  onOpenSettings: () => void;
}

export const WaveformPlayer = ({
  source,
  isVideo,
  title,
  transcriptionId,
  onOpenSettings,
}: WaveformPlayerProps) => {

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const containersReadyRef = useRef({ waveform: false });

  /** RARE PERMITTED LOCAL STATE */
  const [speed, setSpeed] = useState(100);
  const [zoom, setZoom] = useState(40);
  const [isVideoHovered, setIsVideoHovered] = useState(false);
  const [videoPosition, setVideoPosition] = useState<'left' | 'center' | 'right'>('right');
  const [videoSize, setVideoSize] = useState<'small' | 'big'>('small');
  const [isMinimized, setIsMinimized] = useState(false);
  const [videoNaturalSize, setVideoNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [showVideoMobile, setShowVideoMobile] = useState(false);
  const [isRegionsLocked, setIsRegionsLocked] = useState(true); // Locked by default on mobile
  const [showZoomDialog, setShowZoomDialog] = useState(false);
  const [showSpeedDialog, setShowSpeedDialog] = useState(false);
  // Mobile region creation state
  const [isSparkleActive, setIsSparkleActive] = useState(false);
  const [regionStartTime, setRegionStartTime] = useState<number | null>(null);
  
  const isPlaying = usePlayerStore((state) => state.playing)
  const loadedAndReady = usePlayerStore((state) => state.loadedAndReady)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)
  const canEdit = useEditorStore((state) => state.canEdit);
  
  const play = usePlay()
  const pause = usePause()
  const selectAndPlayRegion = useSelectAndPlayRegion()
  const selectedRegion = useEditorStore((state) => state.selectedRegion)

  // Set initial locked state on mobile when wavesurfer is ready
  useEffect(() => {
    if (loadedAndReady && window.innerWidth < 768) {
      // On mobile, start locked (regions editing disabled)
      wavesurferService.setRegionEditingEnabled(false);
    }
  }, [loadedAndReady]);

  // Initialize WaveSurfer when container is ready
  const initializeWaveSurfer = useCallback(() => {
    const { waveform } = containersReadyRef.current;
    if (waveform && waveformContainerRef.current) {
      const mediaEl = isVideo && videoRef.current ? videoRef.current : undefined;
      wavesurferService.initialize(waveformContainerRef.current, waveformContainerRef.current, mediaEl, canEdit);
    }
  }, [isVideo, canEdit]);

  // Callback ref to get DOM element and initialize WaveSurfer
  const setWaveformContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      waveformContainerRef.current = node;
      containersReadyRef.current.waveform = true;
      initializeWaveSurfer();
    }
  }, [initializeWaveSurfer]);

  // Callback ref for video element
  const setVideoElement = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      const setDims = () => {
        try {
          setVideoNaturalSize({ width: node.videoWidth || 0, height: node.videoHeight || 0 });
        } catch {
          /* noop */
        }
      };
      if (node.readyState >= 1) {
        setDims();
      } else {
        node.addEventListener('loadedmetadata', setDims, { once: true });
      }
      // Reinitialize WaveSurfer now that we have the video element
      initializeWaveSurfer();
    }
  }, [initializeWaveSurfer]);

  // Simple event handlers that emit to the event bus
  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play({ playInFull: true });
    }
  };

  const handleZoomChange = (value: number) => {
    setZoom(value);
    wavesurferService.setZoom(value)
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
    wavesurferService.setPlaybackRate(value);
  };

  // Video control handlers
  const handleVideoPosition = (position: 'left' | 'center' | 'right') => {
    setVideoPosition(position);
  };

  const handleVideoSize = (size: 'small' | 'big') => {
    setVideoSize(size);
  };

  // Mobile video click handler
  const handleMobileVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent modal close
    
    // Only handle clicks on mobile when video is in modal
    if (!showVideoMobile) return;
    
    if (selectedRegion) {
      selectAndPlayRegion(selectedRegion.id);
    } else {
      play({ playInFull: true });
    }
  };

  // Handle region lock toggle
  const handleRegionLockToggle = () => {
    const newLockedState = !isRegionsLocked;
    setIsRegionsLocked(newLockedState);
    
    // Update wavesurfer service with new editing state
    wavesurferService.setRegionEditingEnabled(!newLockedState);
  };

  // Handle sparkle button toggle for mobile region creation
  const handleSparkleToggle = () => {
    if (isSparkleActive) {
      // Cancel current region creation
      setIsSparkleActive(false);
      setRegionStartTime(null);
    } else {
      // Activate sparkle mode
      setIsSparkleActive(true);
    }
  };

  // Create a new region using the mobile sparkle functionality
  const createMobileRegion = useCallback(async (start: number, end: number) => {
    try {
      const regionId = `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add region to wavesurfer immediately for visual feedback
      wavesurferService.addRegionWithId({
        id: regionId,
        start,
        end,
      });
      
      const createRegionUseCase = new CreateRegion({
        transcriptionId,
        newRegion: {
          id: regionId,
          start,
          end,
        },
        services,
        store: useEditorStore.getState(),
      });

      await createRegionUseCase.execute();
    } catch (error) {
      console.error('Failed to create mobile region:', error);
    }
  }, [transcriptionId]);

  // Handle play/pause events for mobile region creation
  useEffect(() => {
    if (!isSparkleActive) return;

    const handlePlayEvent = () => {
      if (regionStartTime === null) {
        // Start a new region
        setRegionStartTime(currentTime);
      }
    };

    const handlePauseEvent = () => {
      if (regionStartTime !== null) {
        // Create region from start to current time
        const endTime = currentTime;
        if (endTime > regionStartTime) {
          createMobileRegion(regionStartTime, endTime);
        }
        // Reset for next region
        setRegionStartTime(null);
      }
    };

    // Listen to play/pause events
    wavesurferService.on('play', handlePlayEvent);
    wavesurferService.on('pause', handlePauseEvent);

    return () => {
      wavesurferService.off('play', handlePlayEvent);
      wavesurferService.off('pause', handlePauseEvent);
    };
  }, [isSparkleActive, regionStartTime, currentTime, createMobileRegion]);

  // (Prev helper removed; positioning handled directly in className)

  // Compute container sizing style based on aspect ratio and selected size
  const getVideoContainerStyle = (): React.CSSProperties => {
    if (isMinimized) {
      return { width: 'auto', height: 'auto' } as React.CSSProperties;
    }
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const isPortrait = videoNaturalSize ? videoNaturalSize.height >= videoNaturalSize.width : false;

    if (isPortrait) {
      const maxW = videoSize === 'big' ? Math.min(320, Math.round(vw * 0.28)) : Math.min(192, Math.round(vw * 0.22));
      const maxH = videoSize === 'big' ? '45vh' : '27vh';
      return { maxWidth: maxW, maxHeight: maxH as unknown as number } as React.CSSProperties;
    }
    // Landscape: allow wider videos
    const maxW = videoSize === 'big' ? Math.min(640, Math.round(vw * 0.7)) : Math.min(360, Math.round(vw * 0.5));
    const maxH = videoSize === 'big' ? '65vh' : '40vh';
    return { maxWidth: maxW, maxHeight: maxH as unknown as number } as React.CSSProperties;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const secsStr = secs < 10 ? `0${secs}` : `${secs}`;
    return `${mins}:${secsStr}`;
  };



  return (
    <>
      <div className="w-full bg-white border border-gray-300 rounded-lg relative">
        {/* Header */}
        <div className="flex justify-between items-center bg-[#dbdbdb] h-8 px-4 text-gray-900 font-bold text-sm">
          <div className="uppercase overflow-hidden text-ellipsis whitespace-nowrap flex-1">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 text-left hover:text-gray-700 transition-colors cursor-pointer"
              title="Click to open transcription settings"
            >
              <span>{title}</span>
              <Settings size={14} className="flex-shrink-0" />
            </button>
          </div>
          <div className="font-bold text-sm">
            {formatTime(currentTime)}/{formatTime(duration)}
          </div>
        </div>

        {/* Media Area: video overlays waveform on mobile via CSS toggle */}
        <div className="relative w-full h-32">
          {/* Waveform sits underneath; never unmounted */}
          <div ref={setWaveformContainer} className="w-full h-32 bg-white relative" />

          {/* Video element: modal overlay on mobile; fixed floating on desktop */}
          {isVideo && (
            <div 
              className={`
                ${isMinimized ? 'hidden' : ''}
                ${showVideoMobile ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40' : 'hidden'}
                lg:fixed lg:z-40 lg:rounded lg:group lg:bg-transparent lg:block lg:inset-auto
                ${videoPosition === 'left' ? 'lg:bottom-4 lg:left-4' : videoPosition === 'center' ? 'lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2' : 'lg:bottom-4 lg:right-4'}
              `}
              style={showVideoMobile ? undefined : getVideoContainerStyle()}
              onMouseEnter={() => setIsVideoHovered(true)}
              onMouseLeave={() => setIsVideoHovered(false)}
              onClick={(e) => {
                // Close modal when clicking backdrop on mobile
                if (e.target === e.currentTarget && showVideoMobile) {
                  setShowVideoMobile(false);
                }
              }}
            >
              <video
                ref={setVideoElement}
                className={`object-contain shadow-lg rounded ${showVideoMobile ? 'w-full max-h-[80vh]' : 'w-full h-full'}`}
                preload="auto"
                title="Video playback"
                controls={false}
                playsInline
                webkit-playsinline=""
                onClick={handleMobileVideoClick}
              >
                <source src={source} />
              </video>

              {/* Desktop-only controls */}
              <div className="hidden lg:block">
                {/* Position Controls */}
                <div 
                  className={`absolute top-2 left-2 flex bg-black bg-opacity-50 rounded transition-opacity duration-200 ${
                    isVideoHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <button 
                    onClick={() => handleVideoPosition('left')}
                    className={`p-1.5 transition-all rounded-l ${
                      videoPosition === 'left' 
                        ? 'text-gray-900 bg-white bg-opacity-80' 
                        : 'text-white hover:text-gray-900 hover:bg-white hover:bg-opacity-80'
                    }`}
                    title="Move left"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button 
                    onClick={() => handleVideoPosition('center')}
                    className={`p-1.5 transition-all border-l border-white border-opacity-30 ${
                      videoPosition === 'center' 
                        ? 'text-gray-900 bg-white bg-opacity-80' 
                        : 'text-white hover:text-gray-900 hover:bg-white hover:bg-opacity-80'
                    }`}
                    title="Center"
                  >
                    <Circle size={14} />
                  </button>
                  <button 
                    onClick={() => handleVideoPosition('right')}
                    className={`p-1.5 transition-all border-l border-white border-opacity-30 rounded-r ${
                      videoPosition === 'right' 
                        ? 'text-gray-900 bg-white bg-opacity-80' 
                        : 'text-white hover:text-gray-900 hover:bg-white hover:bg-opacity-80'
                    }`}
                    title="Move right"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Size & Minimize Controls */}
                <div 
                  className={`absolute top-2 right-2 flex bg-black bg-opacity-50 rounded transition-opacity duration-200 ${
                    isVideoHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <button 
                    onClick={() => handleVideoSize('small')}
                    className={`p-1.5 transition-all rounded-l ${
                      videoSize === 'small' 
                        ? 'text-gray-900 bg-white bg-opacity-80' 
                        : 'text-white hover:text-gray-900 hover:bg-white hover:bg-opacity-80'
                    }`}
                    title="Small size"
                  >
                    <Minimize2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleVideoSize('big')}
                    className={`p-1.5 transition-all border-l border-white border-opacity-30 ${
                      videoSize === 'big' 
                        ? 'text-gray-900 bg-white bg-opacity-80' 
                        : 'text-white hover:text-gray-900 hover:bg-white hover:bg-opacity-80'
                    }`}
                    title="Large size"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button 
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 transition-all border-l border-white border-opacity-30 rounded-r text-white hover:text-gray-900 hover:bg-white hover:bg-opacity-80"
                    title="Minimize"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-[20px] h-10 bg-gray-100 px-3 border-t border-gray-300 gap-2">
          <div className="flex items-center gap-2">
            <button
              className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePlayPause}
              disabled={!loadedAndReady}
              data-testid="play-button"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            {isVideo && (
              <button
                className={`px-2 py-1 rounded transition-colors ${showVideoMobile ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 hover:text-gray-700'} md:hidden`}
                onClick={() => setShowVideoMobile(v => !v)}
                title="Toggle video overlay"
              >
                <VideoIcon size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sparkle button for mobile region creation */}
            <button
              className={`p-1 rounded transition-colors md:hidden ${
                isSparkleActive 
                  ? 'bg-gray-300 text-gray-700 shadow-inner' 
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              onClick={handleSparkleToggle}
              disabled={!canEdit || !loadedAndReady}
              title={isSparkleActive ? "Cancel region creation mode" : "Enable region creation mode - play/pause to create regions"}
            >
              <Sparkles size={16} />
            </button>
            
            {/* Lock button for desktop only */}
            <button
              className={`px-2 py-1 rounded transition-all hidden md:block ${
                isRegionsLocked 
                  ? 'bg-gray-300 border-2 border-gray-400 shadow-inner text-gray-700' 
                  : 'bg-gray-100 border-2 border-gray-300 shadow-sm text-gray-600 hover:bg-gray-200'
              }`}
              onClick={handleRegionLockToggle}
              title={isRegionsLocked ? "Regions locked - click to unlock editing" : "Regions unlocked - click to lock for scrolling"}
            >
              {isRegionsLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.innerWidth < 768 ? setShowZoomDialog(true) : handleZoomChange(40)}
                disabled={!loadedAndReady}
                className="p-1 rounded transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={window.innerWidth < 768 ? "Adjust zoom" : "Reset zoom to default"}
              >
                <ZoomIn size={16} className="text-gray-600" />
              </button>
              <input
                type="range"
                min="5"
                max="75"
                value={zoom}
                onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                className="hidden md:block w-24 accent-blue-600"
                disabled={!loadedAndReady}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.innerWidth < 768 ? setShowSpeedDialog(true) : handleSpeedChange(100)}
                disabled={!loadedAndReady}
                className="p-1 rounded transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={window.innerWidth < 768 ? "Adjust speed" : "Reset speed to default"}
              >
                <Gauge size={16} className="text-gray-600" />
              </button>
              <input
                type="range"
                min="50"
                max="100"
                value={speed}
                onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                className="hidden md:block w-24 accent-blue-600"
                disabled={!loadedAndReady}
              />
              <span className="hidden md:inline text-xs text-gray-600 min-w-[35px]">{speed}%</span>
            </div>
          </div>
        </div>

        
        {/* Minimized tab - Desktop Only */}
        {isVideo && isMinimized && (
          <div className="hidden lg:block fixed bottom-4 right-4 z-40">
            <button
              onClick={() => setIsMinimized(false)}
              className="px-2 py-1 text-xs rounded shadow-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              title="Restore video"
            >
              Video
            </button>
          </div>
        )}
      </div>

      {/* Mobile Zoom Dialog */}
      {showZoomDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 md:hidden">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-center">Zoom Level</h3>
            <div className="space-y-4">
              <input
                type="range"
                min="5"
                max="75"
                value={zoom}
                onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                className="w-full accent-blue-600"
                disabled={!loadedAndReady}
              />
              <div className="text-center text-sm text-gray-600">
                {zoom}x zoom
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleZoomChange(40)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Default
                </button>
                <button
                  onClick={() => setShowZoomDialog(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Speed Dialog */}
      {showSpeedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 md:hidden">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-center">Playback Speed</h3>
            <div className="space-y-4">
              <input
                type="range"
                min="50"
                max="100"
                value={speed}
                onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                className="w-full accent-blue-600"
                disabled={!loadedAndReady}
              />
              <div className="text-center text-sm text-gray-600">
                {speed}% speed
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleSpeedChange(100)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Normal
                </button>
                <button
                  onClick={() => setShowSpeedDialog(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};
