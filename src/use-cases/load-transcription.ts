import { services } from '../services';

interface LoadTranscriptionConfig {
  transcriptionId: string;
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with transcription management capabilities
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
    const spellCheckerService = this.config.services.spellCheckerService
    const userService = this.config.services.userService
    
    const data = await transcriptionService.loadInFull(this.config.transcriptionId);

    // Check if access was denied
    if (data === false) {
      this.config.store.setAccessDenied(true);
      return;
    }
    
    // Check if user can edit this transcription
    const canEdit = userService.canEditTranscription(data.transcription);
    this.config.store.setCanEdit(canEdit);
    
    // Check if there's a regionId in the URL that we should select
    const selectedRegionId = browserService.getRegionIdFromUrl();
    
    // Set transcription data in store - use null instead of undefined for consistency with tests
    this.config.store.setFullTranscriptionData(data, selectedRegionId || null);

    // Extract and populate known words from existing regions (business logic)
    // Only do this if the transcription has a language index set for spell checking
    if (data.transcription.lang) {
      const allKnownWords = this.extractKnownWordsFromRegions(data.regions);
      if (allKnownWords.length > 0) {
        // Populate spell checker service cache
        spellCheckerService.addKnownWords(allKnownWords);
        // Update store with known words
        this.config.store.addKnownWords(allKnownWords);
      }
    }

    // load wavesurfer details _outside_ the React system
    await wavesurferService.load(data.transcription.source, data.peaks)
    wavesurferService.setRegions(data.regions)
    
    // If we have a selected region, seek to it in the wavesurfer and apply styling
    if (selectedRegionId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selectedRegion = data.regions.find((region: any) => region.id === selectedRegionId);
      if (selectedRegion) {
        wavesurferService.seekToRegion(selectedRegion);
        // Apply selected region styling
        browserService.setSelectedRegion(selectedRegionId);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractKnownWordsFromRegions(regions: any[]): string[] {
    const allKnownWords = new Set<string>();
    if (regions && Array.isArray(regions)) {
      regions.forEach((region) => {
        if (region.regionAnalysis && Array.isArray(region.regionAnalysis)) {
          region.regionAnalysis.forEach((word: string) => {
            allKnownWords.add(word);
          });
        }
      });
    }
    return Array.from(allKnownWords);
  }
} 