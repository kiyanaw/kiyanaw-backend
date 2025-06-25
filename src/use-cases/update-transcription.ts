import { services } from '../services';
import { useEditorStore } from '../stores/useEditorStore';
import { TranscriptionModel } from '../services/adt';
import { showToast } from '../services/toastService';

export interface UpdateTranscriptionConfig {
  transcriptionId: string;
  updates: {
    title?: string;
    comments?: string;
  };
  username: string;
  services: typeof services;
  store: ReturnType<typeof useEditorStore.getState>;
}

export class UpdateTranscriptionUseCase {
  private config: UpdateTranscriptionConfig;

  constructor(config: UpdateTranscriptionConfig) {
    this.config = config;
  }

  validate() {
    if (!this.config.transcriptionId) {
      throw new Error('transcriptionId is required');
    }
    if (!this.config.username) {
      throw new Error('username is required');
    }
    if (!this.config.updates || Object.keys(this.config.updates).length === 0) {
      throw new Error('updates are required');
    }
    if (this.config.updates.title !== undefined && this.config.updates.title.trim().length === 0) {
      throw new Error('title cannot be empty');
    }
  }

  async execute() {
    this.validate();

    try {
      const rawUpdatedTranscription = await this.config.services.transcriptionService.updateTranscription(
        this.config.transcriptionId,
        {
          ...this.config.updates,
          userLastUpdated: this.config.username,
        }
      );

      // Convert the raw DataStore result back to a TranscriptionModel to preserve computed properties like isVideo
      const updatedTranscription = new TranscriptionModel(rawUpdatedTranscription as any);

      // Update the store with the properly typed transcription data
      this.config.store.setTranscription(updatedTranscription);

      // Show success toast
      showToast('Transcription saved', 'success');
      
    } catch (error) {
      console.error('Failed to update transcription:', error);
      showToast('Failed to save transcription', 'error');
      throw error;
    }
  }
} 