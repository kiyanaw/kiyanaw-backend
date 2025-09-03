import { services } from '../services';
import { TranscriptionModel } from '../services/adt';
import type { TranscriptionData } from '../types/shared';

export interface UpdateTranscriptionConfig {
  transcriptionId: string;
  updates?: {
    title?: string;
    comments?: string;
    source?: string;
    length?: number;
    isPrivate?: boolean;
    lang?: string;
  };
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any;
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

    if (!this.config.store) {
      throw new Error('store is required');
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

    const { transcriptionId, updates, store, services } = this.config;

    // Set saving status
    store.setSaveStatus('saving');

    // Get current user from auth service
    const user = services.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Calculate the complete updated transcription
    const currentTranscription = store.transcription;
    if (!currentTranscription) {
      throw new Error('No transcription found in store');
    }

        const { regionCount, issueCount, coverage } = store.calculateTranscriptionMetadata();
    
    // Only send updatable fields to API
    const apiUpdate = {
      ...updates,
      regionCount,
      issueCount,
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
    store.setTranscription(transcriptionModel);

    try {
      // Save to API with retry logic for version conflicts
      const result = await this.saveWithRetry(transcriptionId, apiUpdate, services, 3);

      // Set saved status
      store.setSaveStatus('saved');

      return result;
    } catch (error) {
      console.error('Failed to update transcription:', error);
      store.setSaveStatus('error');
      throw error;
    }
  }

  /**
   * Save transcription with automatic retry on version conflicts
   */
  private async saveWithRetry(
    transcriptionId: string, 
    apiUpdate: any, 
    services: any, 
    maxRetries: number
  ): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📝 Attempting to save transcription (attempt ${attempt}/${maxRetries})`);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await services.transcriptionService.updateTranscription(transcriptionId, apiUpdate as any);
        
        if (attempt > 1) {
          console.log(`✅ Transcription saved successfully on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if this is a version conflict
        const isConflict = error && 
          typeof error === 'object' && 
          'errors' in error &&
          Array.isArray(error.errors) &&
          error.errors.some((err: any) => 
            err?.errorType === 'ConflictUnhandled' || 
            err?.message?.includes('Conflict resolver rejects mutation')
          );
        
        if (isConflict && attempt < maxRetries) {
          const waitTime = attempt * 100; // 100ms, 200ms, 300ms
          console.log(`⚠️ Transcription version conflict on attempt ${attempt}, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // If not a conflict or we've exhausted retries, throw the error
        console.error(`❌ Failed to save transcription after ${attempt} attempts:`, error);
        throw error;
      }
    }
    
    throw lastError;
  }
} 