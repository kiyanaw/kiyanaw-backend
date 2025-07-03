import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DataStore } from '@aws-amplify/datastore';
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

export const useTranscriptionsStore = create<TranscriptionsState>()(
  devtools(
    (set) => ({
      transcriptions: [],
      loading: false,
      error: null,
      loadTranscriptions: async () => {
        set({ loading: true, error: null });
        try {
          // Load via DataStore (existing method)
          const transcriptions = await DataStore.query(Transcription);
          set({ transcriptions: transcriptions as Transcription[], loading: false });

          // Load via GraphQL API (for comparison/testing)
          try {
            console.log('🔍 Loading transcriptions via GraphQL API...');
            const graphqlResult = await client.graphql({
              query: listTranscriptions
            });
            console.log('📊 GraphQL API result:', JSON.stringify(graphqlResult, null, 2));
          } catch (error) {
            console.error('❌ GraphQL API query failed:', error);
          }
        } catch (error) {
          set({ error: 'Failed to load transcriptions', loading: false });
        }
      },
    }),
    { name: 'TranscriptionsStore' }
  )
); 