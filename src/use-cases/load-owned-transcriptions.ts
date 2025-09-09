import { loadOwnedTranscriptionsOnly } from '../services/transcriptionService';
import { TranscriptionModel } from '../services/adt';

/**
 * Use case: Load transcriptions owned by the current user
 * Uses efficient GSI query to fetch only owned transcriptions
 */
export const loadOwnedTranscriptions = async (): Promise<TranscriptionModel[]> => {
  try {
    console.log('🔍 Loading owned transcriptions...');
    const ownedTranscriptions = await loadOwnedTranscriptionsOnly();
    console.log(`✅ Loaded ${ownedTranscriptions.length} owned transcriptions`);
    return ownedTranscriptions;
  } catch (error) {
    console.error('❌ Failed to load owned transcriptions:', error);
    throw new Error(`Failed to load owned transcriptions: ${error}`);
  }
};
