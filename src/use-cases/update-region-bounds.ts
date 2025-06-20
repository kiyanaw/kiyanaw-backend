interface UpdateRegionBoundsConfig {
  regionId: string;
  start: number;
  end: number;
  transcriptionId: string;
  services: {
    regionService: {
      updateRegion: (regionId: string, updates: any, username: string) => Promise<any>;
    };
    authService: {
      currentUser: () => { username: string } | null;
    };
  };
  store: {
    updateRegionBounds: (regionId: string, start: number, end: number) => void;
    regionById: (regionId: string) => any;
    regions: any[];
    regionMap: Record<string, any>;
  };
}

export class UpdateRegionBounds {
  constructor(private config: UpdateRegionBoundsConfig) {}

  validate() {
    if (!this.config.regionId) {
      throw new Error('regionId is required');
    }
    if (this.config.start < 0) {
      throw new Error('start time must be >= 0');
    }
    if (this.config.end <= this.config.start) {
      throw new Error('end time must be greater than start time');
    }
    if (!this.config.transcriptionId) {
      throw new Error('transcriptionId is required');
    }
  }

  async execute() {
    this.validate();

    const { regionId, start, end, services, store } = this.config;

    // Check if the region exists
    const existingRegion = store.regionById(regionId);
    if (!existingRegion) {
      console.warn(`Region ${regionId} not found in store, skipping update`);
      return;
    }

    // Check if there's actually a change
    if (existingRegion.start === start && existingRegion.end === end) {
      console.log(`Region ${regionId} bounds unchanged, skipping update`);
      return;
    }

    // Update store optimistically (for immediate UI feedback)
    store.updateRegionBounds(regionId, start, end);

    try {
      // Get current user for audit trail
      const currentUser = services.authService.currentUser();
      const username = currentUser?.username || 'unknown';

      // Save to database with debouncing
      await services.regionService.updateRegion(
        regionId,
        { start, end },
        username
      );

    } catch (error) {
      console.error(`❌ Failed to save region ${regionId} bounds:`, error);
      
      // Revert optimistic update on error
      store.updateRegionBounds(regionId, existingRegion.start, existingRegion.end);
    }
  }
} 