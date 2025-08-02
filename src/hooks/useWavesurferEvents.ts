import { useRef, useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { wavesurferService } from '../services/wavesurferService';
import { browserService } from '../services/browserService';
import { services } from '../services';


import { CreateRegion } from '../use-cases/create-region';
import { UpdateRegionBounds } from '../use-cases/update-region-bounds';
import { UpdateTranscriptionUseCase } from '../use-cases/update-transcription';

// Wavesurfer event interfaces
interface RegionCreatedEvent {
  id: string;
  start: number;
  end: number;
}

interface RegionUpdateEndEvent {
  id: string;
  start: number;
  end: number;
}

interface TimeUpdateEvent {
  currentTime: number;
}

interface ReadyEvent {
  duration: number;
}

interface RegionEvent {
  regionId: string;
}

export const useWavesurferEvents = (transcriptionId: string, source?: string): void => {
  const styleIdRef = useRef<Map<string, string>>(new Map()); // Maps regionId to styleId
  const highlightedInboundRegionRef = useRef<string | null>(null);
  const regions = useEditorStore((state) => state.regions);

  // Reset loading state when source changes
  useEffect(() => {
    usePlayerStore.getState().setLoadedAndReady(false);
  }, [source]);

  useEffect(() => {
    if (transcriptionId === undefined || transcriptionId === null) {
      return;
    }

    // Copy ref values to variables for cleanup function
    const currentStyleIdMap = styleIdRef.current;

    const handleRegionCreated = (data: unknown) => {
      const event = data as RegionCreatedEvent;
      console.log('Region Created', event);
      const usecase = new CreateRegion({
        transcriptionId,
        newRegion: { id: event.id, start: event.start, end: event.end },
        services,
        store: useEditorStore.getState(),
      });
      usecase.execute();
    };

    const handleRegionUpdateEnd = (data: unknown) => {
      const event = data as RegionUpdateEndEvent;
      console.log('Region Updated', event);
      const user = services.authService.currentUser();
      if (!user) {
        console.warn('Cannot update region bounds: user not authenticated');
        return;
      }
      
      const usecase = new UpdateRegionBounds({
        regionId: event.id,
        newStart: event.start,
        newEnd: event.end,
        user,
        services,
        store: useEditorStore.getState(),
      });
      usecase.execute();
    };

    const handlePlay = () => {
      usePlayerStore.getState().setPlaying();
    };

    const handlePause = () => {
      usePlayerStore.getState().setPaused();
    };

    const handleRegionIn = (data: unknown) => {
      const { regionId } = data as RegionEvent;
      if (highlightedInboundRegionRef.current) {
        const previousStyleId = styleIdRef.current.get(highlightedInboundRegionRef.current);
        if (previousStyleId) {
          browserService.removeCustomStyle(previousStyleId);
          styleIdRef.current.delete(highlightedInboundRegionRef.current);
        }
      }

      const targetRegionSelector = `div#regionitem-${regionId}`;
      const styles = { 'background-color': 'rgba(0, 213, 255, 0.1) !important' };
      const styleId = browserService.addCustomStyle(targetRegionSelector, styles);
      styleIdRef.current.set(regionId, styleId);
      highlightedInboundRegionRef.current = regionId;

      // Scroll the region item into view
      browserService.scrollElementIntoView(targetRegionSelector);
    };

    const handleRegionOut = (data: unknown) => {
      const { regionId } = data as RegionEvent;
      const styleId = styleIdRef.current.get(regionId);
      if (styleId) {
        browserService.removeCustomStyle(styleId);
        styleIdRef.current.delete(regionId);
        if (highlightedInboundRegionRef.current === regionId) {
          highlightedInboundRegionRef.current = null;
        }
      }
    };

    const handleTimeUpdate = (data: unknown) => {
      const event = data as TimeUpdateEvent;
      usePlayerStore.getState().setCurrentTime(event.currentTime);
    };

    const handleReadyWithDuration = (data: unknown) => {
      const event = data as ReadyEvent;
      console.log('wavesurfer ready', event)
      usePlayerStore.getState().setLoadedAndReady(true);
      usePlayerStore.getState().setDuration(event.duration);
      
      // Update transcription length with the actual duration from wavesurfer
      const state = useEditorStore.getState();
      const transcription = state.transcription
      if (transcription && transcription.length === 0 && event.duration > 0) {
        const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
          transcriptionId: transcription.id,
          updates: { length: event.duration },
          services,
          state,
        });
        updateTranscriptionUseCase.execute().catch(error => {
          console.warn('Failed to update transcription length:', error);
        });
      }
    };

    wavesurferService.on('region-created', handleRegionCreated);
    wavesurferService.on('region-update-end', handleRegionUpdateEnd);
    wavesurferService.on('play', handlePlay);
    wavesurferService.on('pause', handlePause);
    wavesurferService.on('region-in', handleRegionIn);
    wavesurferService.on('region-out', handleRegionOut);
    wavesurferService.on('ready', handleReadyWithDuration);
    wavesurferService.on('timeupdate', handleTimeUpdate);

    return () => {
      wavesurferService.clearAllListeners();

      currentStyleIdMap.forEach((styleId) => {
        browserService.removeCustomStyle(styleId);
      });
      currentStyleIdMap.clear();
      highlightedInboundRegionRef.current = null;
    };
  }, [transcriptionId, regions]);
}; 