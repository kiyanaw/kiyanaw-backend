import { useRef, useCallback } from 'react';
import { eventBus } from '../../lib/eventBus';
import { wavesurferService } from '../../services/wavesurferService';

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
  console.log('--- WaveformPlayer Render ---', { source, hasPeaks: !!peaks });

  const videoRef = useRef<HTMLVideoElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const containersReadyRef = useRef({ waveform: false, timeline: false });

  // Initialize WaveSurfer when both containers are ready
  const initializeWaveSurfer = useCallback(() => {
    const { waveform, timeline } = containersReadyRef.current;
    if (waveform && timeline && waveformContainerRef.current && timelineContainerRef.current) {
      console.log('🎵 Initializing WaveSurfer with containers');
      wavesurferService.initialize(waveformContainerRef.current, timelineContainerRef.current);
      
      // Handle video media element if needed
      if (isVideo && videoRef.current) {
        wavesurferService.updateMediaElement(videoRef.current);
      }
    }
  }, [isVideo]);

  // Callback refs to get DOM elements and initialize WaveSurfer
  const setWaveformContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      waveformContainerRef.current = node;
      containersReadyRef.current.waveform = true;
      initializeWaveSurfer();
    }
  }, [initializeWaveSurfer]);

  const setTimelineContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      timelineContainerRef.current = node;
      containersReadyRef.current.timeline = true;
      initializeWaveSurfer();
    }
  }, [initializeWaveSurfer]);

  // Simple event handlers that emit to the event bus
  const handlePlayPause = () => {
    eventBus.emit('waveform-play-pause');
  };

  const handleMarkRegion = () => {
    eventBus.emit('waveform-mark-region');
  };

  const handleCancelRegion = () => {
    eventBus.emit('waveform-cancel-region');
  };

  const handleZoomChange = (value: number) => {
    wavesurferService.setZoom(value)
  };

  const handleSpeedChange = (value: number) => {
    eventBus.emit('waveform-speed-change', value);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-white border border-gray-300 rounded-lg overflow-hidden relative">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#dbdbdb] h-8 px-4 text-gray-900 font-bold text-sm">
        <div className="uppercase overflow-hidden text-ellipsis whitespace-nowrap flex-1">
          <span>{title}</span>
        </div>
        <div className="font-bold text-sm">
          {formatTime(0)}/{formatTime(0)}
        </div>
      </div>

      {/* Waveform */}
      <div ref={setWaveformContainer} className="w-full h-32 bg-white" />

      {/* Timeline */}
      <div ref={setTimelineContainer} className="w-full h-5 bg-gray-100 border-t border-gray-300" />

      {/* Controls */}
      <div className="flex items-center justify-between h-10 bg-gray-100 px-5 border-t border-gray-300 md:flex-row md:h-10 md:px-5 flex-col h-auto px-2.5 py-2.5 gap-2.5">
        <div className="flex items-center gap-2">
          <button
            className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-black hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePlayPause}
            data-testid="play-button"
          >
            ▶️
          </button>

          {canEdit && (
            <>
              <button
                className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-black hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleMarkRegion}
                data-testid="mark-region"
              >
                🎯
              </button>

              <button
                className="bg-none border-none text-base cursor-pointer px-2 py-1 rounded transition-colors hover:bg-black hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCancelRegion}
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
            defaultValue={20}
            onChange={(e) => handleZoomChange(parseInt(e.target.value))}
            className="w-25"
          />
          <button 
            className="bg-none border-none text-sm cursor-pointer px-1 py-0.5 rounded transition-colors hover:bg-black hover:bg-opacity-10"
            onClick={() => handleZoomChange(40)}
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
            defaultValue={100}
            onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
            className="w-25"
          />
          <button 
            className="bg-none border-none text-sm cursor-pointer px-1 py-0.5 rounded transition-colors hover:bg-black hover:bg-opacity-10"
            onClick={() => handleSpeedChange(100)}
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
          className="fixed bottom-4 right-4 max-w-[350px] max-h-[350px] z-[190] shadow-lg cursor-pointer rounded md:max-w-[350px] md:max-h-[350px] max-w-[250px] max-h-[200px]"
          playsInline
        />
      )}
    </div>
  );
};
