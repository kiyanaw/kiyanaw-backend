import { useState, useEffect, useCallback } from 'react';
import { DataStore } from '@aws-amplify/datastore';
import { Transcription, Region } from '../models';
import { eventBus } from '../lib/eventBus';

export interface TranscriptionState {
  transcription: any | null;
  transcriptions: any[];
  editingUsers: Record<string, any>;
  saved: boolean;
  loading: boolean;
  error: string | null;
}

export const useTranscriptions = () => {
  const [state, setState] = useState<TranscriptionState>({
    transcription: null,
    transcriptions: [],
    editingUsers: {},
    saved: false,
    loading: false,
    error: null,
  });

  const setTranscription = useCallback((transcription: any) => {
    setState((prev) => ({ ...prev, transcription }));
  }, []);

  const setTranscriptions = useCallback((transcriptions: any[]) => {
    setState((prev) => ({ ...prev, transcriptions }));
  }, []);

  const setSaved = useCallback((saved: boolean) => {
    setState((prev) => ({ ...prev, saved }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const loadTranscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Wait for DataStore to be ready
      await DataStore.start();

      const transcriptions = await DataStore.query(Transcription);
      setTranscriptions(transcriptions);
    } catch (error) {
      console.error('Error loading transcriptions:', error);
      setError('Failed to load transcriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTranscription = useCallback(async (transcriptionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const [transcription] = await Promise.all([
        DataStore.query(Transcription, transcriptionId),
        DataStore.query(Region, (r) => r.transcription.id.eq(transcriptionId)),
      ]);

      if (!transcription) {
        throw new Error('Transcription not found');
      }

      setTranscription(transcription);

      // Emit event for other components
      eventBus.emit('transcription-ready');

      // Set up subscriptions for real-time updates
      const transcriptionSubscription = DataStore.observe(
        Transcription,
        transcriptionId
      ).subscribe((message) => {
        if (message.opType === 'UPDATE') {
          setTranscription(message.element);
        }
      });

      const regionSubscription = DataStore.observeQuery(Region, (r) =>
        r.transcription.id.eq(transcriptionId)
      ).subscribe((snapshot) => {
        // Handle region updates
        console.log('Region subscription update:', snapshot);
      });

      // Return cleanup function
      return () => {
        transcriptionSubscription.unsubscribe();
        regionSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error loading transcription:', error);
      setError('Failed to load transcription');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTranscription = useCallback(
    async (update: Partial<any>) => {
      try {
        if (!state.transcription) return;

        const updated = await DataStore.save(
          Transcription.copyOf(state.transcription, (draft) => {
            Object.assign(draft, update);
          })
        );

        setTranscription(updated);
        setSaved(true);
      } catch (error) {
        console.error('Error updating transcription:', error);
        setError('Failed to update transcription');
      }
    },
    [state.transcription]
  );

  // Initialize DataStore on mount
  useEffect(() => {
    DataStore.start();
  }, []);

  return {
    ...state,
    loadTranscriptions,
    loadTranscription,
    updateTranscription,
    setTranscription,
    setTranscriptions,
    setSaved,
  };
};
