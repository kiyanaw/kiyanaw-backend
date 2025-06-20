import { services } from '../services';

interface LoadTranscriptionConfig {
  transcriptionId: string;
  services: typeof services;
  store: any; // whole store object
}

export class LoadTranscription {
  private config: LoadTranscriptionConfig;

  constructor(config: LoadTranscriptionConfig) {
    this.config = config;
  }

  validate(): void {
    if (!this.config.transcriptionId || this.config.transcriptionId.trim() === '') {
      throw new Error('transcriptionId is required and cannot be empty');
    }
  }

  async execute(): Promise<void> {
    this.validate();

    const transcriptionService = this.config.services.transcriptionService
    const wavesurferService = this.config.services.wavesurferService
    const browserService = this.config.services.browserService
    
    try {
      const data = await transcriptionService.loadInFull(this.config.transcriptionId);

      console.log('>>> loaded in full')
      
      // Check if there's a regionId in the URL that we should select
      const selectedRegionId = browserService.getRegionIdFromUrl();
      
      this.config.store.setFullTranscriptionData(data, selectedRegionId);

      // load wavesurfer details _outside_ the React system
      wavesurferService.load(data.transcription.source, data.peaks)
      wavesurferService.setRegions(data.regions)
      
      // If we have a selected region, seek to it in the wavesurfer and apply styling
      if (selectedRegionId) {
        const selectedRegion = data.regions.find((region: any) => region.id === selectedRegionId);
        if (selectedRegion) {
          wavesurferService.seekToTime(selectedRegion.start);
          // Apply selected region styling
          browserService.setSelectedRegion(selectedRegionId);
        }
      }
      
    } catch (error) {
      throw error;
    }
  }
} 