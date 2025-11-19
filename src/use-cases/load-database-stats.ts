import type { DatabaseStats } from '../services/adt';
import * as databaseService from '../services/databaseService';
import { isValidLanguageCode, LANGUAGE_CODES } from '../config/languages';

export interface LoadDatabaseStatsConfig {
  lang?: string; // Optional language filter
}

export class LoadDatabaseStatsUseCase {
  constructor(private config: LoadDatabaseStatsConfig) {}

  validate(): void {
    // Language is optional, but if provided should be valid
    if (this.config.lang && !isValidLanguageCode(this.config.lang)) {
      throw new Error(`Invalid language code. Must be one of: ${LANGUAGE_CODES.join(', ')}`);
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
