import { services } from '../services';
import { TranscriptionModel } from '../services/adt';
import { LoadTranscriptionsFromCache } from './load-transcriptions-from-cache';
import { SyncLatestTranscriptions } from './sync-latest-transcriptions';
import { useTranscriptionsStore } from '../stores/useTranscriptionsStore';

interface LoadTranscriptionsConfig {
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with transcriptions management capabilities
}

export class LoadTranscriptions {
  private config: LoadTranscriptionsConfig;

  constructor(config: LoadTranscriptionsConfig) {
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
    
    try {
      console.log('🔍 LoadTranscriptions use-case executing (two-stage loading)...');
      
      // Stage 1: Load from cache immediately (instant UI update)
      console.log('⚡ Stage 1: Loading from cache...');
      const cacheUseCase = new LoadTranscriptionsFromCache(this.config);
      const cacheResult = await cacheUseCase.execute();
      
      // Stage 2: Sync latest changes in background
      console.log('🔄 Stage 2: Syncing latest changes...');
      const syncUseCase = new SyncLatestTranscriptions({
        ...this.config,
        sinceTimestamp: cacheResult.cacheStats.lastSyncedAt || undefined,
        isFullSync: cacheResult.cacheStats.count === 0
      });
      
      // Fire sync in background - don't await to keep UI responsive
      syncUseCase.execute().catch((error) => {
        console.error('❌ Background sync failed:', error);
        // Error is already handled in the sync use-case
      });
      
      // Return cached transcriptions immediately for instant UI
      const finalTranscriptions = useTranscriptionsStore.getState().transcriptions;
      console.log(`✅ LoadTranscriptions use-case completed: ${finalTranscriptions.length} transcriptions loaded (${cacheResult.transcriptions.length} from cache, sync running in background)`);
      
      return finalTranscriptions;
      
    } catch (error) {
      console.error('❌ LoadTranscriptions use-case failed:', error);
      
      // Fallback to legacy single-stage loading if two-stage fails
      console.log('🔄 Falling back to legacy single-stage loading...');
      try {
        const transcriptionService = this.config.services.transcriptionService;
        const transcriptions = await transcriptionService.loadAll();
        
        this.config.store.setTranscriptions(transcriptions);
        console.log(`✅ Fallback loading completed: ${transcriptions.length} transcriptions loaded`);
        return transcriptions;
        
      } catch (fallbackError) {
        console.error('❌ Fallback loading also failed:', fallbackError);
        this.config.store.setError(fallbackError instanceof Error ? fallbackError.message : 'Failed to load transcriptions');
        throw fallbackError;
      }
    }
  }
} 