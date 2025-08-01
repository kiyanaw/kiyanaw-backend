import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TranscriptionModel } from '../services/adt';
import { services } from '../services';
import { LoadTranscriptions } from '../use-cases/load-transcriptions';

interface TranscriptionsState {
  transcriptions: TranscriptionModel[];
  loading: boolean;
  error: string | null;
  setTranscriptions: (transcriptions: TranscriptionModel[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reload: () => void;
}

export const useTranscriptionsStore = create<TranscriptionsState>()(
  devtools(
    (set) => ({
      transcriptions: [],
      loading: false,
      error: null,
      setTranscriptions: (transcriptions: TranscriptionModel[]) => {
        set({ transcriptions, loading: false, error: null });
      },
      setLoading: (loading: boolean) => {
        set({ loading });
      },
      setError: (error: string | null) => {
        set({ error, loading: false });
      },
      reload: () => {
        const store = useTranscriptionsStore.getState();
        store.setLoading(true);
        store.setError(null);
        
        const useCase = new LoadTranscriptions({
          services,
          store,
        });

        useCase.execute().catch((error) => {
          console.error('❌ Store reload failed:', error);
          // Error is already handled in the use-case
        });
      },
    }),
    { name: 'TranscriptionsStore' }
  )
); 