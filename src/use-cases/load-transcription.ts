
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

    // Log current user for debugging/audit purposes
    const user = this.config.services.authService.currentUser();
    console.log('User loading transcription:', user?.username || 'anonymous');
  }

  async execute(): Promise<void> {
    this.validate();

    const transcriptionService = this.config.services.transcriptionService
    const wavesurferService = this.config.services.wavesurferService
    try {
      const data = await transcriptionService.loadInFull(this.config.transcriptionId);
      console.log('data loaded', data)
      this.config.store.setData(data);
      wavesurferService.load(data.source, data.peaks)
      
    } catch (error) {
      throw error;
    }
  }
} 