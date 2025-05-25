import { useState, useEffect, useCallback } from 'react';
import { DataStore } from '@aws-amplify/datastore';
import { Transcription } from '../models';
import { useRegions } from './useRegions';
import { useIssues } from './useIssues';
import { eventBus } from '../lib/eventBus';

export interface TranscriptionState {
  transcription: any | null;
  loading: boolean;
  error: string | null;
  saved: boolean;
}

export const useTranscription = (transcriptionId?: string) => {
  const [state, setState] = useState<TranscriptionState>({
    transcription: null,
    loading: false,
    error: null,
    saved: false,
  });

  const regions = useRegions(transcriptionId);
  const issues = useIssues(transcriptionId);

  const setTranscription = useCallback((transcription: any) => {
    setState((prev) => ({ ...prev, transcription }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setSaved = useCallback((saved: boolean) => {
    setState((prev) => ({ ...prev, saved }));
    if (saved) {
      // Auto-reset saved state after 2 seconds
      setTimeout(() => setState((prev) => ({ ...prev, saved: false })), 2000);
    }
  }, []);

  const loadTranscription = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError(null);

        const transcription = await DataStore.query(Transcription, id);
        if (!transcription) {
          throw new Error('Transcription not found');
        }

        setTranscription(transcription);

        // Load related data
        await Promise.all([regions.loadRegions(id), issues.loadIssues(id)]);

        eventBus.emit('transcription-loaded', transcription);
      } catch (error) {
        console.error('Error loading transcription:', error);
        setError('Failed to load transcription');
      } finally {
        setLoading(false);
      }
    },
    [regions, issues]
  );

  const updateTranscription = useCallback(
    async (updates: Partial<any>) => {
      try {
        if (!state.transcription) return;

        // Optimistic update
        const optimisticTranscription = { ...state.transcription, ...updates };
        setTranscription(optimisticTranscription);

        const updated = await DataStore.save(
          Transcription.copyOf(state.transcription, (draft) => {
            Object.assign(draft, updates);
          })
        );

        setTranscription(updated);
        setSaved(true);
        eventBus.emit('transcription-updated', updated);
      } catch (error) {
        console.error('Error updating transcription:', error);
        setError('Failed to update transcription');
        // Revert optimistic update
        setTranscription(state.transcription);
      }
    },
    [state.transcription, setSaved]
  );

  // Auto-load transcription when ID changes
  useEffect(() => {
    if (transcriptionId) {
      loadTranscription(transcriptionId);
    }
  }, [transcriptionId, loadTranscription]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!transcriptionId) return;

    const subscription = DataStore.observe(
      Transcription,
      transcriptionId
    ).subscribe((message) => {
      if (message.opType === 'UPDATE') {
        setTranscription(message.element);
        eventBus.emit('transcription-updated', message.element);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [transcriptionId]);

  return {
    ...state,
    regions: regions.regions,
    selectedRegion: regions.selectedRegion,
    issues: issues.issues,
    // Actions
    loadTranscription,
    updateTranscription,
    setTranscription,
    setSaved,
    // Region actions
    setSelectedRegion: regions.setSelectedRegion,
    updateRegion: regions.updateRegion,
    createRegion: regions.createRegion,
    deleteRegion: regions.deleteRegion,
    // Issue actions
    createIssue: issues.createIssue,
    updateIssue: issues.updateIssue,
    deleteIssue: issues.deleteIssue,
    addComment: issues.addComment,
    // Computed values
    regionById: regions.regionById,
    issueById: issues.issueById,
    issuesByRegion: issues.issuesByRegion,
  };
};
