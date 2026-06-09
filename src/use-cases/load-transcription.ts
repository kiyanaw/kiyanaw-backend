import { services } from '../services';
import type { WordAnalysis } from '../services/adt';

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
    
    // Force fresh credentials when loading a transcription
    await transcriptionService.forceFreshCredentials();
    
    const data = await transcriptionService.loadInFull(this.config.transcriptionId);

    // Check if access was denied
    if (data === false) {
      this.config.store.setAccessDenied(true);
      return;
    }

    // Check if media is still processing (or errored) — show status UI, skip wavesurfer
    if ('processing' in data) {
      const canEdit = userService.canEditTranscription(data.transcription);
      this.config.store.setCanEdit(canEdit);
      this.config.store.setTranscription(data.transcription);
      this.config.store.setMediaStatus(data.mediaStatus);
      return;
    }

    // Check if user can edit this transcription
    const canEdit = userService.canEditTranscription(data.transcription);
    this.config.store.setCanEdit(canEdit);

    // Read deep-link params
    const selectedRegionId = browserService.getRegionIdFromUrl();
    const selectedIssueId = browserService.getIssueIdFromUrl?.() || null;

    // Set transcription data in store - use null instead of undefined for consistency with tests
    this.config.store.setFullTranscriptionData(data, selectedRegionId || null);
    // Persist selected issue id in store if provided
    if (selectedIssueId && this.config.store.setSelectedIssueId) {
      this.config.store.setSelectedIssueId(selectedIssueId);
    }

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
    await wavesurferService.load(data.transcription.source, data.peaks, data.peaksDuration)
    wavesurferService.setRegions(data.regions)
    
    // If we have a selected region, seek to it in the wavesurfer and apply styling
    if (selectedRegionId) {
      const selectedRegion = data.regions.find((region) => region.id === selectedRegionId);
      if (selectedRegion) {
        wavesurferService.seekToRegion(selectedRegion);
        // Apply selected region styling
        browserService.setSelectedRegion(selectedRegionId);
      }
    } else if (selectedIssueId) {
      // If only issueId is present, seek to its region if found
      const issue = data.issues?.find((i) => i.id === selectedIssueId);
      const regionIdFromIssue = issue?.regionId;
      if (regionIdFromIssue) {
        const selectedRegion = data.regions.find((r) => r.id === regionIdFromIssue);
        if (selectedRegion) {
          wavesurferService.seekToRegion(selectedRegion);
          browserService.setSelectedRegion(regionIdFromIssue);
          if (this.config.store.setSelectedRegion) {
            this.config.store.setSelectedRegion(regionIdFromIssue);
          }
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractKnownWordsFromRegions(regions: any[]): WordAnalysis[] {
    const allKnownWords: WordAnalysis[] = [];
    const seenWords = new Set<string>();
    
    // TODO: REMOVE LEGACY FORMAT PROCESSING
    if (regions && Array.isArray(regions)) {
      regions.forEach((region) => {
        if (region.regionAnalysis && Array.isArray(region.regionAnalysis)) {
          let hasLegacyFormat = false;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          region.regionAnalysis.forEach((item: any) => {
            // Handle new WordAnalysis format - only add words with VALID analysis
            if (typeof item === 'object' && item.word) {
              // Only add if analysis is complete (non-empty) and not already seen
              if (item.analysis && item.analysis !== '' && 
                  item.allAnalysis && item.allAnalysis.length > 0 &&
                  !seenWords.has(item.word)) {
                allKnownWords.push(item);
                seenWords.add(item.word);
              }
              // Skip words with empty analysis - they need to be re-analyzed
            } else if (typeof item === 'string') {
              // Legacy string format detected
              hasLegacyFormat = true;
            }
          });
          
          // Warn once per region if legacy format detected
          if (hasLegacyFormat) {
            console.warn(`⚠️ Region ${region.id} has legacy string[] analysis format. Words will be re-analyzed on selection.`);
          }
        }
      });
    }
    return allKnownWords;
  }
} 