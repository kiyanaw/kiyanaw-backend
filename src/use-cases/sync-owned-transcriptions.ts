import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

interface SyncOwnedTranscriptionsConfig {
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with transcriptions management capabilities
}

export class SyncOwnedTranscriptions {
  private config: SyncOwnedTranscriptionsConfig;

  constructor(config: SyncOwnedTranscriptionsConfig) {
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
      console.log('🔄 SyncOwnedTranscriptions executing...');
      
      // Set syncing status for owned tab
      this.config.store.setOwnedSyncStatus('syncing');
      
      // Get last sync timestamp for incremental sync
      const cacheStats = await transcriptionService.getCacheStats();
      const sinceTimestamp = cacheStats.lastSyncedAt;
      
      // Perform sync operation
      const syncedTranscriptions = await transcriptionService.syncLatestChanges(sinceTimestamp || undefined);
      
      if (syncedTranscriptions.length > 0) {
        // Merge new transcriptions with existing ones
        this.config.store.mergeTranscriptions(syncedTranscriptions);
        console.log(`✅ SyncOwnedTranscriptions completed: ${syncedTranscriptions.length} transcriptions synced`);
      } else {
        console.log('✅ SyncOwnedTranscriptions completed: No new transcriptions to sync');
      }
      
      // Update cache stats after sync
      const newCacheStats = await transcriptionService.getCacheStats();
      this.config.store.updateCacheStats(newCacheStats);
      
      // Set synced status for owned tab (stays visible)
      this.config.store.setOwnedSyncStatus('synced');
      
      return syncedTranscriptions;
      
    } catch (error) {
      console.error('❌ SyncOwnedTranscriptions failed:', error);
      
      // Clear syncing status on error
      this.config.store.setOwnedSyncStatus(null);
      throw error;
    }
  }
}
