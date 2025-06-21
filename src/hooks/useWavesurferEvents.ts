import { useRef, useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { wavesurferService } from '../services/wavesurferService';
import { browserService } from '../services/browserService';
import { services } from '../services';


import { CreateRegion } from '../use-cases/create-region';
import { UpdateRegionBounds } from '../use-cases/update-region-bounds';

export const useWavesurferEvents = (transcriptionId: string): void => {
  const lastCalledRef = useRef<string | undefined>(undefined);
  const styleIdRef = useRef<Map<string, string>>(new Map()); // Maps regionId to styleId
  // Track which region currently has inbound highlighting applied in the region list
  // This is needed because region-out events can be ignored (for wavesurfer highlighting)
  // but we still need to clear previous region list highlighting when moving to a new region
  const highlightedInboundRegionRef = useRef<string | null>(null);
  const regions = useEditorStore((state) => state.regions);

  const playerStore = usePlayerStore.getState()
  
  
  // THE ONLY TIME USEEFFECT IS ALLOWED
  useEffect(() => {
    return () => {
      // Clear any remaining highlighting styles
      styleIdRef.current.forEach((styleId) => {
        browserService.removeCustomStyle(styleId);
      });
      
      // Reset internal state
      styleIdRef.current.clear();
      highlightedInboundRegionRef.current = null;
    };
  }, [transcriptionId]);
  
  // Only run region update when transcription changes or regions change
  if (lastCalledRef.current !== transcriptionId) {
    lastCalledRef.current = transcriptionId;
    console.log('initializing for transcription:', transcriptionId);

    // Clear all existing listeners before registering new ones
    wavesurferService.clearAllListeners();

    // handle events
    wavesurferService.on('region-created', (event) => {
      console.log('Region Created', event)
      const store = useEditorStore.getState();
      const usecase = new CreateRegion({
        transcriptionId,
        newRegion: {
          id: event.id,
          start: event.start,
          end: event.end
        },
        regions,
        services,
        store
      })
      usecase.execute()
    })

    wavesurferService.on('region-update-end', (event) => {
      console.log('Region Updated', event)
      const store = useEditorStore.getState();
      const usecase = new UpdateRegionBounds({
        transcriptionId,
        regionId: event.id,
        start: event.start,
        end: event.end,
        services,
        store
      })
      usecase.execute()
    })

    wavesurferService.on('play', () => {
      playerStore.setPlaying();
    })
    
    wavesurferService.on('pause', () => {
      playerStore.setPaused();
    })

    wavesurferService.on('region-in', ({regionId}) => {
      /**
       * INBOUND REGION HIGHLIGHTING
       * ---------------------------
       * Used to clear previous "inbound region" highlight.
       * On "normal" playback or clicking around the wavesurfer interface, we get both
       * a 'region-in' and 'region-out' event so the highlight will clear naturally. 
       * However on "inbound region" we ignore the first 'region-out' event, so we 
       * need to manually keep track of it and clear it here.
       */
      if (highlightedInboundRegionRef.current) {
        const previousStyleId = styleIdRef.current.get(highlightedInboundRegionRef.current);
        if (previousStyleId) {
          browserService.removeCustomStyle(previousStyleId);
          styleIdRef.current.delete(highlightedInboundRegionRef.current);
        }
      }

      // Apply inbound region highlighting to the region list item
      const selector = `div#regionitem-${regionId}`;
      const styles = { 
        'background-color': 'rgba(0, 213, 255, 0.1) !important' 
      };
      const styleId = browserService.addCustomStyle(selector, styles);
      styleIdRef.current.set(regionId, styleId);
      highlightedInboundRegionRef.current = regionId;
    })

    wavesurferService.on('region-out', ({regionId}) => {
      /** 
       * INBOUND REGION HIGHLIGHTING
       * ---------------------------
       * See note above.
       */
      const styleId = styleIdRef.current.get(regionId);
      if (styleId) {
        browserService.removeCustomStyle(styleId);
        styleIdRef.current.delete(regionId);
        // Clear inbound region tracking if this was the highlighted region
        if (highlightedInboundRegionRef.current === regionId) {
          highlightedInboundRegionRef.current = null;
        }
      }
    })
  }
}; 