import { useRef, useCallback, useState } from 'react';
import { Play, Pause, ZoomIn, Gauge, Loader2, Settings, ArrowLeft, Circle, ArrowRight, Minimize2, Maximize2 } from 'lucide-react';
import { wavesurferService } from '../../services/wavesurferService';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { usePlay } from '../../hooks/usePlay';
import { usePause } from '../../hooks/usePause';
import { useEditorStore } from '../../stores/useEditorStore';

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
  onOpenSettings: () => void;
}

export const WaveformPlayer = ({
  source,
  isVideo,
  title,
  onOpenSettings,
}: WaveformPlayerProps) => {

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const containersReadyRef = useRef({ waveform: false });

  /** RARE PERMITTED LOCAL STATE */
  const [speed, setSpeed] = useState(100);
  const [zoom, setZoom] = useState(20);
  const [isVideoHovered, setIsVideoHovered] = useState(false);
  const [videoPosition, setVideoPosition] = useState<'left' | 'center' | 'right'>('right');
  const [videoSize, setVideoSize] = useState<'small' | 'big'>('small');
  
  const isPlaying = usePlayerStore((state) => state.playing)
  const loadedAndReady = usePlayerStore((state) => state.loadedAndReady)
  const currentTime = usePlayerStore((state) => state.currentTime)
  const duration = usePlayerStore((state) => state.duration)
  const canEdit = useEditorStore((state) => state.canEdit);
  
  const play = usePlay()
  const pause = usePause()

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

  // Calculate video container classes based on position and size
  const getVideoContainerClasses = () => {
    let positionClasses = '';
    let sizeClasses = '';

    // Position classes
    switch (videoPosition) {
      case 'left':
        positionClasses = 'bottom-4 left-4';
        break;
      case 'center':
        positionClasses = 'bottom-4 left-1/2 transform -translate-x-1/2';
        break;
      case 'right':
      default:
        positionClasses = 'bottom-4 right-4';
        break;
    }

    // Size classes - default (small) is 25% bigger, big is more reasonable
    switch (videoSize) {
      case 'small':
        sizeClasses = 'max-w-[440px] max-h-[440px] md:max-w-[440px] md:max-h-[440px] max-w-[315px] max-h-[250px]';
        break;
      case 'big':
        sizeClasses = 'max-w-[700px] max-h-[700px] md:max-w-[700px] md:max-h-[700px] max-w-[480px] max-h-[360px]';
        break;
    }

    return `fixed ${positionClasses} ${sizeClasses} z-40 rounded group`;
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

        {/* Waveform */}
        <div ref={setWaveformContainer} className="w-full h-32 bg-white relative">
          {!loadedAndReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 size={20} className="animate-spin" data-testid="loading-spinner" />
                <span className="text-sm">Loading audio...</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-[20px] h-10 bg-gray-100 px-5 border-t border-gray-300 md:flex-row md:h-10 md:px-5 flex-col h-auto px-2.5 py-2.5 gap-2.5">
          <div className="flex items-center gap-2">
            <button
              className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePlayPause}
              disabled={!loadedAndReady}
              data-testid="play-button"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>


          </div>

          <div className="flex items-center gap-4 md:gap-4 gap-2 flex-col md:flex-row">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleZoomChange(50)}
                disabled={!loadedAndReady}
                className="p-1 rounded transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset zoom to default"
              >
                <ZoomIn size={16} className="text-gray-600" />
              </button>
              <input
                type="range"
                min="5"
                max="75"
                value={zoom}
                onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                className="w-20 md:w-24 accent-blue-600"
                disabled={!loadedAndReady}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSpeedChange(100)}
                disabled={!loadedAndReady}
                className="p-1 rounded transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset speed to default"
              >
                <Gauge size={16} className="text-gray-600" />
              </button>
              <input
                type="range"
                min="50"
                max="150"
                value={speed}
                onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                className="w-20 md:w-24 accent-blue-600"
                disabled={!loadedAndReady}
              />
              <span className="text-xs text-gray-600 min-w-[35px]">{speed}%</span>
            </div>
          </div>
        </div>

        {/* Video Element with Hover Controls */}
        {isVideo && (
          <div 
            className={getVideoContainerClasses()}
            onMouseEnter={() => setIsVideoHovered(true)}
            onMouseLeave={() => setIsVideoHovered(false)}
          >
            <video
              ref={setVideoElement}
              className="w-full h-full shadow-lg cursor-pointer rounded"
              preload="auto"
              title="Video playback"
              controls={false}
              playsInline
              webkit-playsinline=""
            >
              <source src={source} />
            </video>

            {/* Position Controls - Upper Left */}
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

            {/* Size Controls - Upper Right */}
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
                className={`p-1.5 transition-all border-l border-white border-opacity-30 rounded-r ${
                  videoSize === 'big' 
                    ? 'text-gray-900 bg-white bg-opacity-80' 
                    : 'text-white hover:text-gray-900 hover:bg-white hover:bg-opacity-80'
                }`}
                title="Large size"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </>
  );
};
