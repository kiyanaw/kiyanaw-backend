import { useState, useEffect, useCallback, useRef } from 'react';
import { ExportToMentorUseCase } from '../use-cases/export-to-mentor';
import type { ExportRegion } from '../use-cases/export-transcription';
import {
  getExportByTranscription,
  deleteExport as deleteExportService,
  getExportDownloadUrl,
  EXPORT_STATUS,
  type ExportData,
} from '../services/exportService';

// How often to re-check a pending export's status.
const POLL_INTERVAL_MS = 3000;

const isPending = (record: ExportData | null): boolean =>
  record?.status === EXPORT_STATUS.PENDING || record?.status === EXPORT_STATUS.PROCESSING;

// Amplify GraphQL failures reject with a plain object ({ errors: [...] }), not an Error,
// so surface the real message instead of a generic fallback.
const describeError = (err: unknown): string => {
  const gqlErrors = (err as { errors?: Array<{ message?: string }> })?.errors;
  if (Array.isArray(gqlErrors) && gqlErrors[0]?.message) {
    return gqlErrors.map(e => e.message).filter(Boolean).join('; ');
  }
  if (err instanceof Error) return err.message;
  return 'Failed to start export.';
};

interface StartExportParams {
  ownerSub: string;
  isOwner: boolean;
  speaker: string;
  regions: ExportRegion[];
}

/**
 * Drives the "Export to Mentor" lifecycle for one transcription:
 * loads any existing export on mount, polls while it is pending, and exposes
 * start / download / delete actions. Business logic lives in the use-case; this
 * hook only wires React (state + the poll timer) to it.
 */
export const useMentorExport = (transcriptionId: string, enabled: boolean = true) => {
  const [exportRecord, setExportRecord] = useState<ExportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const refresh = useCallback(async (): Promise<ExportData | null> => {
    const record = await getExportByTranscription(transcriptionId);
    setExportRecord(record);
    if (!isPending(record)) {
      stopPolling();
    }
    return record;
  }, [transcriptionId, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollTimer.current = setInterval(() => {
      refresh().catch(err => console.error('Export poll failed:', err));
    }, POLL_INTERVAL_MS);
  }, [refresh, stopPolling]);

  // Load current state on mount; begin polling if a pending export exists.
  // Only owners can export, so skip all export I/O for everyone else.
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getExportByTranscription(transcriptionId)
      .then(record => {
        if (cancelled) return;
        setExportRecord(record);
        if (isPending(record)) startPolling();
      })
      .catch(err => {
        if (!cancelled) console.error('Failed to load export:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [transcriptionId, enabled, startPolling, stopPolling]);

  const start = useCallback(async (params: StartExportParams): Promise<void> => {
    setError(null);
    setIsStarting(true);
    try {
      const record = await new ExportToMentorUseCase({
        transcriptionId,
        ownerSub: params.ownerSub,
        isOwner: params.isOwner,
        speaker: params.speaker,
        regions: params.regions,
      }).execute();
      setExportRecord(record);
      startPolling();
    } catch (err) {
      console.error('Mentor export start failed:', err);
      setError(describeError(err));
      throw err;
    } finally {
      setIsStarting(false);
    }
  }, [transcriptionId, startPolling]);

  const download = useCallback(async (): Promise<void> => {
    if (!exportRecord?.downloadKey) return;
    const url = await getExportDownloadUrl(exportRecord.downloadKey);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${transcriptionId}-mentor-bundle.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [exportRecord, transcriptionId]);

  const remove = useCallback(async (): Promise<void> => {
    if (!exportRecord) return;
    setError(null);
    try {
      await deleteExportService(exportRecord);
      stopPolling();
      setExportRecord(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete export.');
      throw err;
    }
  }, [exportRecord, stopPolling]);

  return {
    exportRecord,
    isLoading,
    isStarting,
    isPending: isPending(exportRecord),
    isReady: exportRecord?.status === EXPORT_STATUS.READY,
    isError: exportRecord?.status === EXPORT_STATUS.ERROR,
    error,
    start,
    download,
    remove,
    refresh,
  };
};
