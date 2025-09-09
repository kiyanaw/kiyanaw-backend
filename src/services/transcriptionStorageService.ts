import Dexie from 'dexie';
import { TranscriptionModel, type TranscriptionData } from './adt';

// Cached transcription with metadata
interface CachedTranscription {
  id: string;
  data: TranscriptionData;
  lastUpdated: string;
  cachedAt: string;
}

// Sync metadata for tracking last sync times
interface SyncMetadata {
  id: string; // 'transcriptions-{userId}'
  lastSyncedAt: string;
  userId: string; // Track per-user sync state
}

class KiyanawDB extends Dexie {
  transcriptions!: Dexie.Table<CachedTranscription>;
  syncMetadata!: Dexie.Table<SyncMetadata>;

  constructor() {
    super('KiyanawSyncDB'); // Changed name to avoid migration issues
    this.version(1).stores({
      transcriptions: 'id, lastUpdated, cachedAt',
      syncMetadata: 'id, userId'
    });
  }
}

// Singleton database instance
export const db = new KiyanawDB();

/**
 * Storage service for transcriptions using IndexedDB via Dexie
 * Handles caching, sync metadata, and provides clean API for transcription service
 */
export class TranscriptionStorageService {
  private static instance: TranscriptionStorageService;
  private memoryCache = new Map<string, TranscriptionModel>();

  static getInstance(): TranscriptionStorageService {
    if (!TranscriptionStorageService.instance) {
      TranscriptionStorageService.instance = new TranscriptionStorageService();
    }
    return TranscriptionStorageService.instance;
  }

  /**
   * Get transcription by ID from memory cache first, then IndexedDB
   */
  async getById(id: string): Promise<TranscriptionModel | null> {
    // Check memory cache first
    const cached = this.memoryCache.get(id);
    if (cached) {
      return cached;
    }

    // Check IndexedDB
    const stored = await db.transcriptions.get(id);
    if (stored) {
      const model = new TranscriptionModel(stored.data);
      this.memoryCache.set(id, model);
      return model;
    }

    return null;
  }

  /**
   * Get all cached transcriptions
   */
  async getAll(): Promise<TranscriptionModel[]> {
    const stored = await db.transcriptions.toArray();
    const models = stored.map(item => {
      // Check memory cache first
      const cached = this.memoryCache.get(item.id);
      if (cached) {
        return cached;
      }
      
      // Create new model and cache it
      const model = new TranscriptionModel(item.data);
      this.memoryCache.set(item.id, model);
      return model;
    });

    return models;
  }

  /**
   * Get owned transcriptions from cache
   */
  async getOwnedTranscriptions(userId: string): Promise<TranscriptionModel[]> {
    const all = await this.getAll();
    return all.filter(transcription => transcription.author === userId);
  }

  /**
   * Get shared transcriptions from cache
   */
  async getSharedTranscriptions(userId: string): Promise<TranscriptionModel[]> {
    const all = await this.getAll();
    return all.filter(transcription => transcription.author !== userId);
  }

  /**
   * Store transcriptions in both memory and IndexedDB
   */
  async storeTranscriptions(transcriptions: TranscriptionModel[]): Promise<void> {
    const now = new Date().toISOString();
    
    const cachedItems: CachedTranscription[] = transcriptions.map(model => ({
      id: model.id,
      data: model.data,
      lastUpdated: model.dateLastUpdated || now, // Fallback to current time if undefined
      cachedAt: now
    }));

    // Store in IndexedDB
    await db.transcriptions.bulkPut(cachedItems);

    // Update memory cache
    transcriptions.forEach(model => {
      this.memoryCache.set(model.id, model);
    });
  }

  /**
   * Get last sync timestamp for current user (all transcriptions)
   */
  async getLastSyncedAt(userId: string): Promise<string | null> {
    const syncId = `transcriptions-${userId}`;
    const metadata = await db.syncMetadata.get(syncId);
    console.log(`🔍 Getting last sync for ${syncId}:`, metadata?.lastSyncedAt || 'null');
    return metadata?.lastSyncedAt || null;
  }

  /**
   * Update last sync timestamp for current user (all transcriptions)
   */
  async setLastSyncedAt(userId: string, timestamp: string): Promise<void> {
    const syncId = `transcriptions-${userId}`;
    console.log(`💾 Setting last sync for ${syncId}:`, timestamp);
    await db.syncMetadata.put({
      id: syncId,
      userId,
      lastSyncedAt: timestamp
    });
  }

  /**
   * Get last sync timestamp for owned transcriptions
   */
  async getLastOwnedSyncedAt(userId: string): Promise<string | null> {
    const syncId = `owned-${userId}`;
    const metadata = await db.syncMetadata.get(syncId);
    console.log(`🔍 Getting last owned sync for ${syncId}:`, metadata?.lastSyncedAt || 'null');
    return metadata?.lastSyncedAt || null;
  }

  /**
   * Update last sync timestamp for owned transcriptions
   */
  async setLastOwnedSyncedAt(userId: string, timestamp: string): Promise<void> {
    const syncId = `owned-${userId}`;
    console.log(`💾 Setting last owned sync for ${syncId}:`, timestamp);
    await db.syncMetadata.put({
      id: syncId,
      userId,
      lastSyncedAt: timestamp
    });
  }

  /**
   * Get last sync timestamp for shared transcriptions
   */
  async getLastSharedSyncedAt(userId: string): Promise<string | null> {
    const syncId = `shared-${userId}`;
    const metadata = await db.syncMetadata.get(syncId);
    console.log(`🔍 Getting last shared sync for ${syncId}:`, metadata?.lastSyncedAt || 'null');
    return metadata?.lastSyncedAt || null;
  }

  /**
   * Update last sync timestamp for shared transcriptions
   */
  async setLastSharedSyncedAt(userId: string, timestamp: string): Promise<void> {
    const syncId = `shared-${userId}`;
    console.log(`💾 Setting last shared sync for ${syncId}:`, timestamp);
    await db.syncMetadata.put({
      id: syncId,
      userId,
      lastSyncedAt: timestamp
    });
  }

  /**
   * Check if we need to sync based on cache age
   * Returns true if no cache exists or cache is older than maxAge
   */
  async shouldSync(userId: string, maxAgeMinutes: number = 5): Promise<boolean> {
    const lastSynced = await this.getLastSyncedAt(userId);
    
    if (!lastSynced) {
      return true; // No previous sync, need full sync
    }

    const lastSyncTime = new Date(lastSynced).getTime();
    const now = new Date().getTime();
    const ageMinutes = (now - lastSyncTime) / (1000 * 60);

    return ageMinutes > maxAgeMinutes;
  }

  /**
   * Check if we need to validate cache (remove orphaned transcriptions)
   * Returns true if cache validation hasn't been done in the last hour
   */
  async shouldValidateCache(userId: string): Promise<boolean> {
    const validationId = `validation-${userId}`;
    const lastValidated = await db.syncMetadata.get(validationId);
    
    if (!lastValidated) {
      return true; // Never validated, need validation
    }

    const lastValidationTime = new Date(lastValidated.lastSyncedAt).getTime();
    const now = new Date().getTime();
    const ageMinutes = (now - lastValidationTime) / (1000 * 60);

    return ageMinutes > 60; // Validate every hour
  }

  /**
   * Mark cache as validated
   */
  async markCacheValidated(userId: string): Promise<void> {
    const validationId = `validation-${userId}`;
    await db.syncMetadata.put({
      id: validationId,
      userId,
      lastSyncedAt: new Date().toISOString()
    });
  }

  /**
   * Clear all cached data (useful for logout or cache reset)
   */
  async clearCache(): Promise<void> {
    await db.transcriptions.clear();
    await db.syncMetadata.clear();
    this.memoryCache.clear();
  }

  /**
   * Remove specific transcription from cache
   */
  async removeTranscription(id: string): Promise<void> {
    await db.transcriptions.delete(id);
    this.memoryCache.delete(id);
  }

  /**
   * Get cache statistics for debugging
   */
  async getCacheStats(): Promise<{
    totalCached: number;
    memoryCount: number;
    oldestCacheTime: string | null;
    newestCacheTime: string | null;
  }> {
    const all = await db.transcriptions.toArray();
    const cacheTimes = all.map(item => item.cachedAt).sort();
    
    return {
      totalCached: all.length,
      memoryCount: this.memoryCache.size,
      oldestCacheTime: cacheTimes[0] || null,
      newestCacheTime: cacheTimes[cacheTimes.length - 1] || null
    };
  }
}

// Export singleton instance
export const transcriptionStorage = TranscriptionStorageService.getInstance();
