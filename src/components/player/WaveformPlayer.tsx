import { useRef, useCallback, useState } from 'react';
import { Play, Pause, Target, X, ZoomIn, Gauge, Loader2, Settings } from 'lucide-react';
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

            {canEdit && (
              <>
                <button
                  className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {/* noop */}}
                  disabled={!loadedAndReady}
                  data-testid="mark-region"
                >
                  <Target size={16} />
                </button>

                <button
                  className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {/* noop */}}
                  disabled={!loadedAndReady}
                >
                  <X size={16} />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 md:gap-4 gap-2 flex-col md:flex-row">
            <div className="flex items-center gap-2">
              <ZoomIn size={16} className="text-gray-600" />
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
              <Gauge size={16} className="text-gray-600" />
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

        {/* Video Element */}
        {isVideo && (
          <video
            ref={setVideoElement}
            className="fixed bottom-4 right-4 max-w-[350px] max-h-[350px] z-[190] shadow-lg cursor-pointer rounded md:max-w-[350px] md:max-h-[350px] max-w-[250px] max-h-[200px]"
            preload="auto"
            title="Video playback"
            controls={false}
            playsInline
            webkit-playsinline=""
          >
            <source src={source} />
          </video>
        )}
      </div>

    </>
  );
};
