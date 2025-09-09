import { loadSharedTranscriptionsOnly } from '../services/transcriptionService';
import { TranscriptionModel } from '../services/adt';

/**
 * Use case: Load transcriptions shared with the current user
 * Uses invite discovery to fetch only shared transcriptions
 */
export const loadSharedTranscriptions = async (): Promise<TranscriptionModel[]> => {
  try {
    console.log('🔍 Loading shared transcriptions...');
    const sharedTranscriptions = await loadSharedTranscriptionsOnly();
    console.log(`✅ Loaded ${sharedTranscriptions.length} shared transcriptions`);
    return sharedTranscriptions;
  } catch (error) {
    console.error('❌ Failed to load shared transcriptions:', error);
    throw new Error(`Failed to load shared transcriptions: ${error}`);
  }
};
