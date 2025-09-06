import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

interface SyncLatestTranscriptionsConfig {
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with transcriptions management capabilities
  sinceTimestamp?: string;
  isFullSync?: boolean;
}

export class SyncLatestTranscriptions {
  private config: SyncLatestTranscriptionsConfig;

  constructor(config: SyncLatestTranscriptionsConfig) {
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
    const { sinceTimestamp, isFullSync } = this.config;
    
    try {
      console.log(`🔄 SyncLatestTranscriptions use-case executing (${isFullSync ? 'full' : 'incremental'} sync)...`);
      
      // Set syncing status (both global and tab-specific)
      this.config.store.setSyncStatus(true);
      
      // Set both tab sync statuses to syncing since this is a full sync
      this.config.store.setOwnedSyncStatus('syncing');
      this.config.store.setSharedSyncStatus('syncing');
      
      // Perform sync operation
      const syncedTranscriptions = await transcriptionService.syncLatestChanges(sinceTimestamp);
      
      if (syncedTranscriptions.length > 0) {
        // Merge new transcriptions with existing ones
        this.config.store.mergeTranscriptions(syncedTranscriptions);
        console.log(`✅ SyncLatestTranscriptions completed: ${syncedTranscriptions.length} transcriptions synced`);
      } else {
        console.log('✅ SyncLatestTranscriptions completed: No new transcriptions to sync');
      }
      
      // Update cache stats after sync
      const newCacheStats = await transcriptionService.getCacheStats();
      this.config.store.updateCacheStats(newCacheStats);
      
      // Set both tab sync statuses to synced since this was a full sync
      this.config.store.setOwnedSyncStatus('synced');
      this.config.store.setSharedSyncStatus('synced');
      
      return syncedTranscriptions;
      
    } catch (error) {
      console.error('❌ SyncLatestTranscriptions use-case failed:', error);
      
      // Clear syncing status on error
      this.config.store.setOwnedSyncStatus(null);
      this.config.store.setSharedSyncStatus(null);
      
      // Update store with error state
      this.config.store.setError(error instanceof Error ? error.message : 'Failed to sync transcriptions');
      throw error;
      
    } finally {
      // Always clear syncing status
      this.config.store.setSyncStatus(false);
    }
  }
}
