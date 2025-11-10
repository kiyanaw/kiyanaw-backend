import { useCallback } from 'react';
import {
  ExportTranscriptionUseCase,
  type ExportTranscriptionOptions,
  type ExportRegion
} from '../use-cases/export-transcription';
import type { TranscriptionModel } from '../services/adt';

interface ExportTranscriptionInput {
  transcription: TranscriptionModel;
  regions: ExportRegion[];
  options: ExportTranscriptionOptions;
}

export const useExportTranscription = () => {
  return useCallback(async ({ transcription, regions, options }: ExportTranscriptionInput) => {
    const useCase = new ExportTranscriptionUseCase({
      transcription,
      regions,
      options,
    });

    const { filename, content } = useCase.execute();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);
};

