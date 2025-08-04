import { services } from '../services';
import { UpdateRegionUseCase } from './update-region';
import type { User } from '../types/shared';

// NOTE: Conflict handling functions moved to versionConflictService.ts for reuse

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

  execute(): void {
    this.validate();

    const { regionId, newStart, newEnd, services, store } = this.config;

    // Delegate to unified UpdateRegionUseCase
    const updateRegionUseCase = new UpdateRegionUseCase({
      regionId,
      changes: { start: newStart, end: newEnd },
      debounceMs: 2500, // 2.5 second debounce for bounds
      primaryField: 'start', // Primary field for conflict resolution UI
      services,
      store
    });

    updateRegionUseCase.execute();
  }
} 