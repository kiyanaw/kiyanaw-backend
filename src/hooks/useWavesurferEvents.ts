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

    // SET THE PEAKS HERE

    // wavesurferService.setPeaks(peaks)
    
    // Update regions when they change - this runs during render
    // const regionsPlugin = wavesurferService.getRegionsPlugin();
    // if (regionsPlugin && regions) {
    //   console.log('🎨 Updating regions in WaveSurfer:', regions.length);
      
    //   regionsPlugin.clearRegions();

    //   regions.forEach((region) => {
    //     if (!region.isNote) {
    //       regionsPlugin.addRegion({
    //         id: region.id,
    //         start: region.start,
    //         end: region.end,
    //         color: 'rgba(0, 0, 0, 0.1)',
    //         resize: true, // TODO: get canEdit from somewhere
    //         drag: true,
    //         content: region.displayIndex?.toString() || '',
    //       });
    //     }
    //   });
    // }
  }
}; 