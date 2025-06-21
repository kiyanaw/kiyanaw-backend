import { useRef, useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { wavesurferService } from '../services/wavesurferService';
import { browserService } from '../services/browserService';
import { services } from '../services';


import { CreateRegion } from '../use-cases/create-region';
import { UpdateRegionBounds } from '../use-cases/update-region-bounds';

export const useWavesurferEvents = (transcriptionId: string): void => {
  const styleIdRef = useRef<Map<string, string>>(new Map()); // Maps regionId to styleId
  const highlightedInboundRegionRef = useRef<string | null>(null);
  const regions = useEditorStore((state) => state.regions);

  useEffect(() => {
    if (transcriptionId === undefined || transcriptionId === null) {
      return;
    }

    const handleRegionCreated = (event: any) => {
      console.log('Region Created', event);
      const store = useEditorStore.getState();
      const usecase = new CreateRegion({
        transcriptionId,
        newRegion: { id: event.id, start: event.start, end: event.end },
        regions,
        services,
        store,
      });
      usecase.execute();
    };

    const handleRegionUpdateEnd = (event: any) => {
      console.log('Region Updated', event);
      const store = useEditorStore.getState();
      const usecase = new UpdateRegionBounds({
        transcriptionId,
        regionId: event.id,
        start: event.start,
        end: event.end,
        services,
        store,
      });
      usecase.execute();
    };

    const handlePlay = () => {
      usePlayerStore.getState().setPlaying();
    };

    const handlePause = () => {
      usePlayerStore.getState().setPaused();
    };

    const handleRegionIn = ({ regionId }: { regionId: string }) => {
      if (highlightedInboundRegionRef.current) {
        const previousStyleId = styleIdRef.current.get(highlightedInboundRegionRef.current);
        if (previousStyleId) {
          browserService.removeCustomStyle(previousStyleId);
          styleIdRef.current.delete(highlightedInboundRegionRef.current);
        }
      }

      const selector = `div#regionitem-${regionId}`;
      const styles = { 'background-color': 'rgba(0, 213, 255, 0.1) !important' };
      const styleId = browserService.addCustomStyle(selector, styles);
      styleIdRef.current.set(regionId, styleId);
      highlightedInboundRegionRef.current = regionId;
    };

    const handleRegionOut = ({ regionId }: { regionId: string }) => {
      const styleId = styleIdRef.current.get(regionId);
      if (styleId) {
        browserService.removeCustomStyle(styleId);
        styleIdRef.current.delete(regionId);
        if (highlightedInboundRegionRef.current === regionId) {
          highlightedInboundRegionRef.current = null;
        }
      }
    };

    wavesurferService.on('region-created', handleRegionCreated);
    wavesurferService.on('region-update-end', handleRegionUpdateEnd);
    wavesurferService.on('play', handlePlay);
    wavesurferService.on('pause', handlePause);
    wavesurferService.on('region-in', handleRegionIn);
    wavesurferService.on('region-out', handleRegionOut);

    return () => {
      wavesurferService.clearAllListeners();

      styleIdRef.current.forEach((styleId) => {
        browserService.removeCustomStyle(styleId);
      });
      styleIdRef.current.clear();
      highlightedInboundRegionRef.current = null;
    };
  }, [transcriptionId, regions]);
}; 