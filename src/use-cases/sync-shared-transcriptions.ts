import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

interface SyncSharedTranscriptionsConfig {
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with transcriptions management capabilities
}

export class SyncSharedTranscriptions {
  private config: SyncSharedTranscriptionsConfig;

  constructor(config: SyncSharedTranscriptionsConfig) {
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
      console.log('🔄 SyncSharedTranscriptions executing...');
      
      // Set syncing status for shared tab
      this.config.store.setSharedSyncStatus('syncing');
      
      // Get last sync timestamp for incremental sync
      const cacheStats = await transcriptionService.getCacheStats();
      const sinceTimestamp = cacheStats.lastSyncedAt;
      
      // Load shared transcriptions specifically
      const sharedTranscriptions = await transcriptionService.loadSharedTranscriptionsOnly(sinceTimestamp || undefined);
      
      if (sharedTranscriptions.length > 0) {
        // Merge new transcriptions with existing ones
        this.config.store.mergeTranscriptions(sharedTranscriptions);
        console.log(`✅ SyncSharedTranscriptions completed: ${sharedTranscriptions.length} shared transcriptions synced`);
      } else {
        console.log('✅ SyncSharedTranscriptions completed: No new shared transcriptions to sync');
      }
      
      // Set synced status for shared tab (stays visible)
      this.config.store.setSharedSyncStatus('synced');
      
      return sharedTranscriptions;
      
    } catch (error) {
      console.error('❌ SyncSharedTranscriptions failed:', error);
      
      // Clear syncing status on error
      this.config.store.setSharedSyncStatus(null);
      throw error;
    }
  }
}
