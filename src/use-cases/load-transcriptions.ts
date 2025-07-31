import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

interface LoadTranscriptionsConfig {
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with transcriptions management capabilities
}

export class LoadTranscriptions {
  private config: LoadTranscriptionsConfig;

  constructor(config: LoadTranscriptionsConfig) {
    this.config = config;
  }

  validate(): void {
    if (!this.config.services) {
      throw new Error('services are required');
    }
    if (!this.config.store) {
      throw new Error('store is required');
    }
  }

  async execute(): Promise<TranscriptionModel[]> {
    this.validate();

    const transcriptionService = this.config.services.transcriptionService;
    
    try {
      console.log('🔍 LoadTranscriptions use-case executing...');
      const transcriptions = await transcriptionService.loadAll();
      
      // Update the store with the loaded transcriptions
      this.config.store.setTranscriptions(transcriptions);
      
      console.log(`✅ LoadTranscriptions use-case completed: ${transcriptions.length} transcriptions loaded`);
      return transcriptions;
    } catch (error) {
      console.error('❌ LoadTranscriptions use-case failed:', error);
      // Update store with error state
      this.config.store.setError(error instanceof Error ? error.message : 'Failed to load transcriptions');
      throw error;
    }
  }
} 