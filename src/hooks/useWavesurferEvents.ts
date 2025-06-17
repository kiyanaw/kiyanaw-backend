import { useRef, useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { wavesurferService } from '../services/wavesurferService';
import { services } from '../services';


import { CreateRegion } from '../use-cases/create-region';

export const useWavesurferEvents = (transcriptionId: string): void => {
  const lastCalledRef = useRef<string | undefined>(undefined);
  const regions = useEditorStore((state) => state.regions);
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

    // wavesurferService.on('play-pause', (event) => {

    // })

  }
}; 