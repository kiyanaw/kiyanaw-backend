import type { RegionData, TranscriptionModel } from '../services/adt';

export interface ExportTranscriptionOptions {
  includeRegionNumbers: boolean;
  includeTimestamps: boolean;
  includeOriginalLanguage: boolean;
  includeTranslation: boolean;
}

export interface ExportTranscriptionConfig {
  transcription: TranscriptionModel;
  regions: ExportRegion[];
  options: ExportTranscriptionOptions;
}

export interface ExportTranscriptionResult {
  filename: string;
  content: string;
}

export type ExportRegion = Pick<RegionData, 'start' | 'end' | 'isNote' | 'regionText' | 'translation' | 'id'>;

const padNumber = (value: number, length: number): string => value.toString().padStart(length, '0');

const formatTimecode = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0;
  const totalMillis = Math.round(safeSeconds * 1000);
  const hours = Math.floor(totalMillis / 3_600_000);
  const minutes = Math.floor((totalMillis % 3_600_000) / 60_000);
  const secs = Math.floor((totalMillis % 60_000) / 1_000);
  const millis = totalMillis % 1_000;
  return `${padNumber(hours, 2)}:${padNumber(minutes, 2)}:${padNumber(secs, 2)},${padNumber(millis, 3)}`;
};

const sanitizeLine = (value: string): string => value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

export class ExportTranscriptionUseCase {
  private readonly transcription: TranscriptionModel;
  private readonly regions: ExportRegion[];
  private readonly options: ExportTranscriptionOptions;

  constructor(config: ExportTranscriptionConfig) {
    this.transcription = config.transcription;
    this.regions = config.regions;
    this.options = config.options;
  }

  execute(): ExportTranscriptionResult {
    if (!this.transcription) {
      throw new Error('Transcription is required to export.');
    }

    const content = this.buildContent();
    const filename = this.deriveFilename();

    return { filename, content };
  }

  private buildContent(): string {
    const segments = this.regions
      .filter((region) => !(region.isNote ?? false))
      .sort((a, b) => a.start - b.start)
      .map((region, index) => {
        const lines: string[] = [];

        if (this.options.includeOriginalLanguage) {
          const primaryText = region.regionText?.trim();
          if (primaryText) {
            lines.push(sanitizeLine(primaryText));
          }
        }

        if (this.options.includeTranslation) {
          const translationText = region.translation?.trim();
          if (translationText) {
            lines.push(sanitizeLine(translationText));
          }
        }

        const segmentParts: string[] = [];

        if (this.options.includeRegionNumbers) {
          segmentParts.push(`${index + 1}`);
        }

        if (this.options.includeTimestamps) {
          const startTime = formatTimecode(region.start);
          const endBoundary = region.end > region.start ? region.end : region.start + 0.001;
          const endTime = formatTimecode(endBoundary);
          segmentParts.push(`${startTime} --> ${endTime}`);
        }

        segmentParts.push(...lines);

        return segmentParts.join('\n');
      });

    if (segments.length === 0) {
      throw new Error('There are no transcription regions with text to export.');
    }

    return segments.join('\n\n');
  }

  private deriveFilename(): string {
    // Use .srt extension only when format is valid SRT (has both region numbers and timestamps)
    const extension = (this.options.includeRegionNumbers && this.options.includeTimestamps) ? 'srt' : 'txt';
    
    const fallbackBase = this.transcription.title?.trim() || this.transcription.id || 'transcription';
    const sourceFilename = this.transcription.getSourceFilename();

    if (!sourceFilename || sourceFilename === 'Unknown') {
      return `${fallbackBase}.${extension}`;
    }

    const lastDotIndex = sourceFilename.lastIndexOf('.');
    const baseName = lastDotIndex > 0 ? sourceFilename.slice(0, lastDotIndex) : sourceFilename;
    return `${baseName}.${extension}`;
  }
}

