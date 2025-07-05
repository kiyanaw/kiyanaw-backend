import { services } from '../services';
import { showToast } from '../services/toastService';
import type { TranscriptionData } from '../types/shared';

export interface UpdateTranscriptionConfig {
  transcriptionId: string;
  updates: {
    title?: string;
    comments?: string;
    source?: string;
  };
  services: typeof services;
  username?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store?: any;
}

export class UpdateTranscriptionUseCase {
  private config: UpdateTranscriptionConfig;

  constructor(config: UpdateTranscriptionConfig) {
    this.config = config;
  }

  validate(): void {
    if (!this.config.transcriptionId) {
      throw new Error('transcriptionId is required');
    }

    if (!this.config.username) {
      throw new Error('username is required');
    }

    if (!this.config.updates || Object.keys(this.config.updates).length === 0) {
      throw new Error('updates are required');
    }

    // Check if title is provided and validate it
    if (this.config.updates.title !== undefined) {
      if (!this.config.updates.title || this.config.updates.title.trim() === '') {
        throw new Error('title cannot be empty');
      }
    }
  }

  async execute(): Promise<TranscriptionData> {
    this.validate();

    const { transcriptionId, updates, username, store } = this.config;

    // Add user tracking fields
    const updateData = {
      ...updates,
      userLastUpdated: username,
      dateLastUpdated: new Date().toISOString(),
    };

    try {
      // Update transcription  
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await this.config.services.transcriptionService.updateTranscription(transcriptionId, updateData as any);

      // Update store with raw transcription data
      if (store?.setTranscription) {
        store.setTranscription(result);
      }

      // Show success toast
      showToast('Transcription saved', 'success');

      return result;
    } catch (error) {
      console.error('Failed to update transcription:', error);
      showToast('Failed to save transcription', 'error');
      throw error;
    }
  }
} 