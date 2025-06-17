
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

    console.log('USE CASE')

    const regionService = this.config.services.regionService
    const wavesurferService = this.config.services.wavesurferService

    try {

      const regions = this.config.store.regions

      const newRegion = {
        ...this.config.newRegion,
        userLastUpdated: this.user.username,
        dateLastUpdated: `${+new Date()}`
      }

      this.config.store.addNewRegion(newRegion)

      /**
       * Plan:
       *  - use case createRegion
       *    - consolidated function to sort & index the regions
       *    - set the regions on the store
       *    - service call to save the new region
       *    - re-render the regions to wavesurfer service
       *  - add Regions list back on the page & test
       */
      // TODO make sure you return RegionModel

      
    } catch (error) {
      throw error;
    }
  }
} 