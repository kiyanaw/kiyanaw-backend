
import { services } from '../services';

interface CreateRegionConfig {
  transcriptionId: string;
  newRegion: any;
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
      console.log(regions)


      // TODO make sure you return RegionModel

      // const data = await transcriptionService.loadInFull(this.config.transcriptionId);
      // this.config.store.setFullTranscriptionData(data);

      // // load wavesurfer details _outside_ the React system
      // wavesurferService.load(data.source, data.peaks)
      // wavesurferService.setRegions(data.regions)
      
    } catch (error) {
      throw error;
    }
  }
} 