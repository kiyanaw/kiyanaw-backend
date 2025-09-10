import { services } from '../services';
import { TranscriptionModel } from '../services/adt';

interface CacheStats {
  count: number;
  lastSyncedAt: string | null;
}

interface LoadTranscriptionsFromCacheConfig {
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with transcriptions management capabilities
}

export class LoadTranscriptionsFromCache {
  private config: LoadTranscriptionsFromCacheConfig;

  constructor(config: LoadTranscriptionsFromCacheConfig) {
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

  async execute(): Promise<{ transcriptions: TranscriptionModel[]; cacheStats: CacheStats }> {
    this.validate();

    const transcriptionService = this.config.services.transcriptionService;
    
    try {
      console.log('⚡ LoadTranscriptionsFromCache use-case executing...');
      
      // Load from cache (fast operation)
      const [cachedTranscriptions, cacheStats] = await Promise.all([
        transcriptionService.loadFromCache(),
        transcriptionService.getCacheStats()
      ]);
      
      // Update store with cached data immediately
      this.config.store.setTranscriptions(cachedTranscriptions);
      this.config.store.updateCacheStats(cacheStats);
      
      console.log(`⚡ LoadTranscriptionsFromCache completed: ${cachedTranscriptions.length} transcriptions from cache`);
      
      return {
        transcriptions: cachedTranscriptions,
        cacheStats
      };
      
    } catch (error) {
      console.error('❌ LoadTranscriptionsFromCache use-case failed:', error);
      
      // Don't update store with error for cache failures - just return empty results
      const emptyStats: CacheStats = { count: 0, lastSyncedAt: null };
      this.config.store.updateCacheStats(emptyStats);
      
      return {
        transcriptions: [],
        cacheStats: emptyStats
      };
    }
  }
}
