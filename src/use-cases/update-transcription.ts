import { services } from '../services';
import { showToast } from '../services/toastService';
import { TranscriptionModel } from '../services/adt';
import type { TranscriptionData } from '../types/shared';

export interface UpdateTranscriptionConfig {
  transcriptionId: string;
  updates?: {
    title?: string;
    comments?: string;
    source?: string;
    length?: number;
  };
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: any;
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

    if (!this.config.state) {
      throw new Error('state is required');
    }

    // Check if title is provided and validate it
    if (this.config.updates?.title !== undefined) {
      if (!this.config.updates.title || this.config.updates.title.trim() === '') {
        throw new Error('title cannot be empty');
      }
    }
  }

  async execute(): Promise<TranscriptionData> {
    this.validate();

    const { transcriptionId, updates, state, services } = this.config;

    // Get current user from auth service
    const user = services.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Calculate the complete updated transcription
    const currentTranscription = state.transcription;
    if (!currentTranscription) {
      throw new Error('No transcription found in state');
    }

        const { coverage } = state.calculateTranscriptionMetadata();
    
    // Only send updatable fields to API
    const apiUpdate = {
      ...updates,
      coverage,
      userLastUpdated: user.username.split('@')[0], // Extract username part from email
      dateLastUpdated: new Date().toISOString(),
    };

    // Create complete updated object for optimistic store update
    const updated = {
      ...currentTranscription,
      ...apiUpdate,
    };

    // Update store immediately (optimistic update) 
    const transcriptionModel = new TranscriptionModel(updated);
    state.setTranscription(transcriptionModel);

    try {
      // Save to API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await services.transcriptionService.updateTranscription(transcriptionId, apiUpdate as any);

      // TODO: how to handle roll-back or conflict if this fails

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