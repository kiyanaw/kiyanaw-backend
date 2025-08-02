import { services } from '../services';
import { showToast } from '../services/toastService';
import { UpdateTranscriptionUseCase } from './update-transcription';
import type { User } from '../types/shared';

interface UpdateRegionBoundsConfig {
  regionId: string;
  newStart: number;
  newEnd: number;
  user: User;
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with region management capabilities
}

export class UpdateRegionBounds {
  private config: UpdateRegionBoundsConfig;

  constructor(config: UpdateRegionBoundsConfig) {
    this.config = config;
  }

  validate() {
    if (!this.config.regionId) {
      throw new Error('regionId is required');
    }
    if (this.config.newStart < 0) {
      throw new Error('start time must be >= 0');
    }
    if (this.config.newEnd <= this.config.newStart) {
      throw new Error('end time must be greater than start time');
    }
  }

  async execute() {
    this.validate();

    const { regionId, newStart, newEnd, services, store } = this.config;

    // Check if the region exists
    const existingRegion = store.regionById(regionId);
    if (!existingRegion) {
      console.warn(`Region ${regionId} not found in store, skipping update`);
      return;
    }

    // Check if there's actually a change
    if (existingRegion.start === newStart && existingRegion.end === newEnd) {
      console.log(`Region ${regionId} bounds unchanged, skipping update`);
      return;
    }

    // Update store optimistically (for immediate UI feedback)
    store.updateRegionBounds(regionId, newStart, newEnd);

    try {
      // Get current user for audit trail
      const currentUser = services.authService.currentUser();
      const username = currentUser?.username || 'unknown';

      // Save to database with debouncing
      await services.regionService.updateRegion(
        regionId,
        { start: newStart, end: newEnd },
        username
      );

      // Update the transcription with metadata  
      const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
        transcriptionId: existingRegion.transcriptionId,
        services,
        store: store,
      });
      
      await updateTranscriptionUseCase.execute();

    } catch (error) {
      console.error(`❌ Failed to save region ${regionId} bounds:`, error);
      
      // Revert optimistic update on error
      store.updateRegionBounds(regionId, existingRegion.start, existingRegion.end);
    }
  }
} 