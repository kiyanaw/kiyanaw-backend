import type { LocalServices } from '../services/localServices';
import type { TranscriptionModel } from '../services/adt';

export interface CreateLocalProjectInput {
  title: string;
  file: File;
  services: Pick<LocalServices, 'localMediaService' | 'localPeaksService' | 'localTranscriptionService'>;
  newId: () => string;
  now: () => string;
}

/**
 * Creates a project that lives only on this device: computes the waveform from the file,
 * stores the media in OPFS and the project in IndexedDB. Nothing is uploaded.
 */
export class CreateLocalProjectUseCase {
  private readonly title: string;
  private readonly file: File;
  private readonly services: CreateLocalProjectInput['services'];
  private readonly newId: () => string;
  private readonly now: () => string;

  constructor(input: CreateLocalProjectInput) {
    this.title = input.title;
    this.file = input.file;
    this.services = input.services;
    this.newId = input.newId;
    this.now = input.now;
  }

  validate(): void {
    if (!this.title?.trim()) {
      throw new Error('Title is required');
    }
    if (!this.file) {
      throw new Error('File is required');
    }
    if (this.file.size === 0) {
      throw new Error('The file is empty');
    }
  }

  async execute(): Promise<TranscriptionModel> {
    this.validate();
    const { localMediaService, localPeaksService, localTranscriptionService } = this.services;

    // Peaks first: it also proves the browser can decode the file before we store anything.
    const peaks = await localPeaksService.computePeaks(this.file);

    const id = this.newId();
    await localMediaService.putMedia(id, this.file);

    const now = this.now();
    try {
      return await localTranscriptionService.createLocalProject(
        {
          id,
          title: this.title.trim(),
          mediaName: this.file.name,
          mediaType: this.file.type,
          isVideo: peaks.hasVideo,
          length: peaks.duration,
          regionCount: 0,
          coverage: 0,
          createdAt: now,
          dateLastUpdated: now,
        },
        { length: peaks.length, data: peaks.data }
      );
    } catch (error) {
      await localMediaService.deleteMedia(id);
      throw error;
    }
  }
}
