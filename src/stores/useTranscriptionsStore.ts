import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DataStore } from '@aws-amplify/datastore';
import { Transcription } from '../models';

interface TranscriptionsState {
  transcriptions: Transcription[];
  loading: boolean;
  error: string | null;
  loadTranscriptions: () => Promise<void>;
}

export const useTranscriptionsStore = create<TranscriptionsState>()(
  devtools(
    (set) => ({
      transcriptions: [],
      loading: false,
      error: null,
      loadTranscriptions: async () => {
        set({ loading: true, error: null });
        try {
          const transcriptions = await DataStore.query(Transcription);
          set({ transcriptions: transcriptions as Transcription[], loading: false });
        } catch (error) {
          set({ error: 'Failed to load transcriptions', loading: false });
        }
      },
    }),
    { name: 'TranscriptionsStore' }
  )
); 