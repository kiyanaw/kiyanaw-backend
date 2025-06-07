import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEditorStore } from '../stores/useEditorStore';
import { getEditorData } from '../services/transcriptionService';

export const useEditorData = (transcriptionId: string | undefined) => {
  const setData = useEditorStore((state) => state.setData);
  const cleanup = useEditorStore((state) => state.cleanup);

  const {
    isLoading,
    error,
    data,
  } = useQuery({
    queryKey: ['editorData', transcriptionId],
    queryFn: () => getEditorData(transcriptionId!),
    enabled: !!transcriptionId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data) {
      setData({
        transcription: data.transcription,
        regions: data.regions,
        issues: data.issues,
        source: data.source ?? undefined,
        peaks: data.peaks,
        isVideo: data.isVideo,
      });
    }
  }, [data, setData]);

  // Cleanup on unmount or transcriptionId change
  useEffect(() => {
    if (!transcriptionId) return;
    return () => {
      cleanup();
    };
  }, [transcriptionId, cleanup]);

  return { isLoading, error };
}; 