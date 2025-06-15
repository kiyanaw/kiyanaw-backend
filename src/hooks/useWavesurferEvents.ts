import { useRef, useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { wavesurferService } from '../services/wavesurferService';

export const useWavesurferEvents = (transcriptionId: string): void => {
  const lastCalledRef = useRef<string | undefined>(undefined);
  const regions = useEditorStore((state) => state.regions);
  const peaks = useEditorStore((state) => state.peaks);
  
  // Only run region update when transcription changes or regions change
  if (lastCalledRef.current !== transcriptionId) {
    lastCalledRef.current = transcriptionId;
    console.log('initializing for transcription:', transcriptionId);

    // Clear all existing listeners before registering new ones
    wavesurferService.clearAllListeners();

    // handle events
    wavesurferService.on('region-created', (event) => {
      console.log('got event here', event)
      /**
       * Plan:
       *  - use case createRegion
       *    - consolidated function to sort & index the regions
       *    - set the regions on the store
       *    - service call to save the new region
       *    - re-render the regions to wavesurfer service
       *  - 
       */
    })

  }
}; 