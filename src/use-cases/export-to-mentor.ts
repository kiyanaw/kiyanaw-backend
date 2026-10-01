import { createExport, type ExportData } from '../services/exportService';
import type { ExportRegion } from './export-transcription';

// Business logic for queuing an "Export to Mentor" job. The heavy lifting (clipping
// audio, building import.csv, zipping) happens server-side in the mentorExport
// Lambda; this use-case only validates the request and creates the PENDING record.

export interface ExportToMentorInput {
  transcriptionId: string;
  ownerSub: string;      // transcription author's Cognito sub — Export record owner
  canExport: boolean;    // current user may export (transcription owner, or an Admin)
  speaker: string;       // value written into every CSV row's Speaker column
  regions: ExportRegion[];
}

// Mirrors the server-side exportable-region rule (see mentorExport csv.js): not a
// note, and carrying at least one of original text / translation.
const isExportable = (region: ExportRegion): boolean => {
  if (region.isNote ?? false) return false;
  const original = (region.regionText ?? '').trim();
  const translation = (region.translation ?? '').trim();
  return original.length > 0 || translation.length > 0;
};

export class ExportToMentorUseCase {
  private readonly transcriptionId: string;
  private readonly ownerSub: string;
  private readonly canExport: boolean;
  private readonly speaker: string;
  private readonly regions: ExportRegion[];

  constructor(input: ExportToMentorInput) {
    this.transcriptionId = input.transcriptionId;
    this.ownerSub = input.ownerSub;
    this.canExport = input.canExport;
    this.speaker = input.speaker;
    this.regions = input.regions;
  }

  validate(): void {
    if (!this.transcriptionId?.trim()) {
      throw new Error('Transcription ID is required.');
    }
    if (!this.canExport) {
      throw new Error('You do not have permission to export this transcription.');
    }
    if (!this.speaker?.trim()) {
      throw new Error('A speaker name is required.');
    }
    if (!this.regions.some(isExportable)) {
      throw new Error('There are no regions with text to export.');
    }
  }

  async execute(): Promise<ExportData> {
    this.validate();

    return createExport({
      transcriptionId: this.transcriptionId,
      owner: this.ownerSub,
      speaker: this.speaker.trim(),
    });
  }
}
