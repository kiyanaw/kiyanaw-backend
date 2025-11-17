import type { DatabaseStats } from '../services/adt';
import * as databaseService from '../services/databaseService';

export interface LoadDatabaseStatsConfig {
  lang?: string; // Optional language filter (crk, crgn)
}

export class LoadDatabaseStatsUseCase {
  constructor(private config: LoadDatabaseStatsConfig) {}

  validate(): void {
    // Language is optional, but if provided should be valid
    if (this.config.lang && !['crk', 'crgn'].includes(this.config.lang)) {
      throw new Error('Invalid language code. Must be "crk" or "crgn"');
    }
  }

  async execute(): Promise<DatabaseStats> {
    this.validate();

    console.log('📊 LoadDatabaseStatsUseCase executing...');
    
    try {
      const stats = await databaseService.getDatabaseStats(this.config.lang);
      
      console.log(`✅ LoadDatabaseStatsUseCase completed: ${stats.totalWords} words, ${stats.totalTranscriptions} transcriptions`);
      
      return stats;
    } catch (error) {
      console.error('❌ LoadDatabaseStatsUseCase failed:', error);
      throw error;
    }
  }
}
