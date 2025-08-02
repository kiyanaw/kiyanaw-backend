import { services } from '../services';
import { UpdateTranscriptionUseCase } from './update-transcription';
import type { User, WavesurferRegion } from '../types/shared';

interface DeleteRegionConfig {
  regionId: string;
  transcriptionId: string;
  user: User;
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with region management capabilities
}

export class DeleteRegion {
  private config: DeleteRegionConfig;
  private user: User | null;

  constructor(config: DeleteRegionConfig) {
    this.config = config;
    this.user = this.config.services.authService.currentUser();
  }

  validate(): void {
    if (!this.config.regionId) {
      throw new Error('Region ID is required');
    }
    if (!this.config.transcriptionId) {
      throw new Error('Transcription ID is required');
    }
    if (!this.user) {
      throw new Error('User must be authenticated to delete a region');
    }

    const region = this.config.store.regionById(this.config.regionId);
    if (!region) {
      throw new Error('Region not found');
    }
  }

  async execute(): Promise<void> {
    this.validate();

    console.log(`🗑️ Starting deletion of region ${this.config.regionId}`);

    try {
      // Stop playback first to prevent race conditions with playing regions
      this.config.services.wavesurferService.pause();
      this.config.services.wavesurferService.clearRegionBoundedPlayback();
      console.log(`🗑️ Stopped playback before deleting region ${this.config.regionId}`);

      // Remove from wavesurfer first (immediate UI feedback)
      const regionsPlugin = this.config.services.wavesurferService.getRegionsPlugin();
      if (regionsPlugin) {
        const wsRegion = regionsPlugin.getRegions().find((r: WavesurferRegion) => r.id === this.config.regionId);
        if (wsRegion) {
          wsRegion.remove();
          console.log(`🗑️ Removed region ${this.config.regionId} from wavesurfer`);
          // Recalculate region indices after deletion
          this.config.services.wavesurferService.updateRegionIndices();
          console.log(`🗑️ Recalculated region indices after deletion`);
        }
      }

      // Get the region's transcriptionId before we delete it
      const region = this.config.store.regionById(this.config.regionId);
      const transcriptionId = region.transcriptionId;

      // Remove from store (optimistic update) - this is now synchronous
      this.config.store.deleteRegion(this.config.regionId);
      console.log(`🗑️ Removed region ${this.config.regionId} from store`);

      // Remove from backend
      await this.config.services.regionService.deleteRegion(this.config.regionId);
      console.log(`🗑️ Successfully deleted region ${this.config.regionId} from backend`);
      
      // Update the transcription with metadata
      const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
        transcriptionId,
        services: this.config.services,
        store: this.config.store,
      });
      
      await updateTranscriptionUseCase.execute();

    } catch (error) {
      console.error('Failed to delete region:', error);
      // TODO: Revert optimistic update if backend call fails
      throw error;
    }
  }
} 