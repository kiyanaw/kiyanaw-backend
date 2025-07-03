import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { generateClient } from 'aws-amplify/api';
import { Transcription } from '../models';
// @ts-ignore - GraphQL queries are generated as JS files
import { listTranscriptions } from '../graphql/queries.js';

// Create GraphQL client
const client = generateClient();

interface TranscriptionsState {
  transcriptions: Transcription[];
  loading: boolean;
  error: string | null;
  loadTranscriptions: () => Promise<void>;
}

// TODO: move this to use-case
export const useTranscriptionsStore = create<TranscriptionsState>()(
  devtools(
    (set) => ({
      transcriptions: [],
      loading: false,
      error: null,
      loadTranscriptions: async () => {
        set({ loading: true, error: null });

        try {
          console.log('🔍 Loading transcriptions via GraphQL API...');
          const { data } = await client.graphql({ query: listTranscriptions });

          // The GraphQL result is of shape { listTranscriptions: { items: [...] } }
          const items = (data as any)?.listTranscriptions?.items ?? [];

          set({ transcriptions: items as Transcription[], loading: false });
        } catch (error) {
          console.error('❌ GraphQL API query failed:', error);
          set({ error: 'Failed to load transcriptions', loading: false });
        }
      },
    }),
    { name: 'TranscriptionsStore' }
  )
); 