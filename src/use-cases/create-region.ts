import { services } from '../services';
import { UpdateTranscriptionUseCase } from './update-transcription';

interface CreateRegionConfig {
  transcriptionId: string;
  newRegion: {
    id: string;
    start: number;
    end: number;
  };
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with region management capabilities
}

export class CreateRegion {
  private config: CreateRegionConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private user: any | null = null; 

  constructor(config: CreateRegionConfig) {
    this.config = config;
  }

  validate(): void {
    if (!this.config.transcriptionId || this.config.transcriptionId.trim() === '') {
      throw new Error('transcriptionId is required and cannot be empty');
    }

    // Log current user for debugging/audit purposes
    const user = this.config.services.authService.currentUser();
    this.user = user
  }

  async execute(): Promise<void> {
    this.validate();

    const store = this.config.store
    const regionService = this.config.services.regionService
    const newRegion = this.config.newRegion
    const transcriptionId = this.config.transcriptionId
    const userLastUpdated = this.user?.username || 'unknown'

    // Add transcriptionId to region before saving to store (needed for text updates)
    const regionWithTranscriptionId = {
      ...newRegion,
      transcriptionId: transcriptionId
    };

    // save to store (optimistic update)
    store.addNewRegion(regionWithTranscriptionId)

    try {
      // async save to DB
      await regionService.createRegion(transcriptionId, newRegion, userLastUpdated)
      
      // Update the transcription with metadata
      const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
        transcriptionId: this.config.transcriptionId,
        services: this.config.services,
        store: store,
      });
      
      await updateTranscriptionUseCase.execute();
      
    } catch (error) {
      console.error('Failed to create region:', error);
      
      // TODO: Consider reverting optimistic update on error
      throw error;
    }
  }
} 