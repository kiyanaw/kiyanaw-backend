
import { services } from '../services';

interface CreateRegionConfig {
  transcriptionId: string;
  newRegion: {
    id: string;
    start: number;
    end: number;
  };
  regions: any[];
  services: typeof services;
  store: any; // whole store object
}

export class CreateRegion {
  private config: CreateRegionConfig;
  private user: any; 

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

    try {
      const store = this.config.store
      const regionService = this.config.services.regionService
      const newRegion = this.config.newRegion
      const transcriptionId = this.config.transcriptionId
      const userLastUpdated = this.user.username

      // save to store
      store.addNewRegion(newRegion)

      // async save to DB
      regionService.createRegion(transcriptionId, newRegion, userLastUpdated)

    } catch (error) {
      throw error;
    }
  }
} 