import { services } from '../services';
import { regionSaveManager } from '../services/regionSaveManager';
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

  execute(): void {
    this.validate();

    const { regionId, newStart, newEnd, services, store } = this.config;

    const existingRegion = store.regionById(regionId);
    if (!existingRegion) {
      throw new Error(`Region ${regionId} not found`);
    }
    if (existingRegion.start === newStart && existingRegion.end === newEnd) {
      return;
    }

    // Optimistic store update for immediate UI feedback
    store.updateRegionBounds(regionId, newStart, newEnd);
    // Protect the dragged bounds from remote updates until the save lands
    services.storeService.startPendingEdit(regionId, 'bounds');

    // Same per-region queue as text edits, so a drag never races a text save
    regionSaveManager.queueBoundsChange(regionId, newStart, newEnd);
  }
}
