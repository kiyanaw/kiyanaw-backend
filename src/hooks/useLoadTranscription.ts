import { useRef } from 'react';

import { services } from '../services';
import { LoadTranscription } from '../use-cases/load-transcription'
import { useEditorStore } from '../stores/useEditorStore';


export const useLoadTranscription = (transcriptionId: string): void => {
  const lastCalledRef = useRef<string | undefined>(undefined);
  
  // Only call loadTranscription when transcriptionId actually changes
  if (lastCalledRef.current !== transcriptionId) {
    lastCalledRef.current = transcriptionId;
    const store = useEditorStore.getState();
    const useCase = new LoadTranscription({
      transcriptionId,
      services,
      store,
    });

    useCase.execute()
  }
}; 
