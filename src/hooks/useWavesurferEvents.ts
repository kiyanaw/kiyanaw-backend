import { useRef } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { wavesurferService } from '../services/wavesurferService';
import { browserService } from '../services/browserService';
import { services } from '../services';


import { CreateRegion } from '../use-cases/create-region';

export const useWavesurferEvents = (transcriptionId: string): void => {
  const lastCalledRef = useRef<string | undefined>(undefined);
  const styleIdRef = useRef<Map<string, string>>(new Map()); // Maps regionId to styleId
  const currentHighlightedRegionRef = useRef<string | null>(null); // Track currently highlighted region
  const regions = useEditorStore((state) => state.regions);

  const playerStore = usePlayerStore.getState()
  
  // const peaks = useEditorStore((state) => state.peaks);
  
  // Only run region update when transcription changes or regions change
  if (lastCalledRef.current !== transcriptionId) {
    lastCalledRef.current = transcriptionId;
    console.log('initializing for transcription:', transcriptionId);

    // Clear all existing listeners before registering new ones
    wavesurferService.clearAllListeners();

    // handle events
    wavesurferService.on('region-created', (event) => {
      console.log('got event here', event)
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

    wavesurferService.on('play', () => {
      playerStore.setPlaying();
    })
    
    wavesurferService.on('pause', () => {
      playerStore.setPaused();
    })

    wavesurferService.on('region-in', ({regionId}) => {
      // Clear the previous region's highlight if there is one
      if (currentHighlightedRegionRef.current) {
        const previousStyleId = styleIdRef.current.get(currentHighlightedRegionRef.current);
        if (previousStyleId) {
          browserService.removeCustomStyle(previousStyleId);
          styleIdRef.current.delete(currentHighlightedRegionRef.current);
        }
      }

      // Apply highlight to the new region
      const selector = `div#regionitem-${regionId}`;
      const styles = { 
        'background-color': 'rgba(0, 213, 255, 0.1) !important' 
      };
      const styleId = browserService.addCustomStyle(selector, styles);
      styleIdRef.current.set(regionId, styleId);
      currentHighlightedRegionRef.current = regionId;
    })

    wavesurferService.on('region-out', ({regionId}) => {
      const styleId = styleIdRef.current.get(regionId);
      if (styleId) {
        browserService.removeCustomStyle(styleId);
        styleIdRef.current.delete(regionId);
        // Clear tracking if this was the currently highlighted region
        if (currentHighlightedRegionRef.current === regionId) {
          currentHighlightedRegionRef.current = null;
        }
      }
    })
  }
}; 