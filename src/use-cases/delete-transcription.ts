import { deleteTranscription } from '../services/transcriptionService';
import { currentUser } from '../services/userService';
import type { TranscriptionData } from '../types/shared';

export interface DeleteTranscriptionConfig {
  transcriptionId: string;
  currentUserId?: string;
}

export interface DeleteTranscriptionResult {
  success: boolean;
  deletedTranscription: TranscriptionData;
}

/**
 * Use case for deleting a transcription
 * Follows clean architecture pattern: validate() → execute()
 */
export class DeleteTranscriptionUseCase {
  constructor(private config: DeleteTranscriptionConfig) {}

  validate(): void {
    if (!this.config.transcriptionId?.trim()) {
      throw new Error('Transcription ID is required');
    }

    if (typeof this.config.transcriptionId !== 'string') {
      throw new Error('Transcription ID must be a string');
    }

    // Validate user is authenticated
    const user = currentUser();
    if (!user) {
      throw new Error('User must be authenticated to delete transcriptions');
    }

    // Store current user ID for authorization check
    this.config.currentUserId = user.userId;
  }

  async execute(): Promise<DeleteTranscriptionResult> {
    this.validate();

    const { transcriptionId } = this.config;

    try {
      // Call the service to delete the transcription
      const deletedTranscription = await deleteTranscription(transcriptionId);

      return {
        success: true,
        deletedTranscription,
      };
    } catch (error) {
      console.error('Failed to delete transcription:', error);
      
      // Re-throw with more context for the UI layer
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new Error('Transcription not found or you do not have permission to delete it');
        }
        if (error.message.includes('Unauthorized') || error.message.includes('Access denied')) {
          throw new Error('You do not have permission to delete this transcription');
        }
        throw error;
      }
      
      throw new Error('Failed to delete transcription. Please try again.');
    }
  }
}
