interface SelectAndPlayRegionConfig {
  regionId: string;
  services: {
    wavesurferService: {
      seekToTime: (time: number) => void;
      play: () => Promise<void>;
    };
    browserService: {
      updateUrl: (url: string) => void;
      setSelectedRegion: (regionId: string) => void;
    };
  };
  store: any; // whole store object
}

export class SelectAndPlayRegion {
  constructor(private config: SelectAndPlayRegionConfig) {}

  validate() {
    if (!this.config.regionId) {
      throw new Error('regionId is required');
    }
  }

  async execute() {
    this.validate();

    // Get the region from the store's regionMap
    const region = this.config.store.regionById(this.config.regionId);
    if (!region) {
      throw new Error(`Region with id ${this.config.regionId} not found`);
    }

    // Get transcription data for URL update
    const transcription = this.config.store.transcription;
    if (transcription && transcription.id) {
      // Update URL to reflect current region being played
      this.config.services.browserService.updateUrl(
        `/transcribe-edit/${transcription.id}/${this.config.regionId}`
      );
    }

    // Apply selected region styling
    this.config.services.browserService.setSelectedRegion(this.config.regionId);

    // Seek to the region's start time using the service
    this.config.services.wavesurferService.seekToTime(region.start);
    
    // Play audio
    await this.config.services.wavesurferService.play();
  }
} 