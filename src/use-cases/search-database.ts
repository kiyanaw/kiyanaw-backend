import type { Attestation } from '../services/adt';
import * as databaseService from '../services/databaseService';

export interface SearchDatabaseConfig {
  query: string;
  lang?: string; // Optional language filter (crk, crgn)
  page?: number;
  limit?: number;
}

export class SearchDatabaseUseCase {
  constructor(private config: SearchDatabaseConfig) {}

  validate(): void {
    if (!this.config.query?.trim()) {
      throw new Error('Search query is required');
    }
    
    // Language is optional, but if provided should be valid
    if (this.config.lang && !['crk', 'crgn'].includes(this.config.lang)) {
      throw new Error('Invalid language code. Must be "crk" or "crgn"');
    }
  }

  async execute(): Promise<Attestation[]> {
    this.validate();

    console.log(`🔎 SearchDatabaseUseCase executing for query: "${this.config.query}"`);
    
    try {
      const results = await databaseService.searchDatabase(
        this.config.query.trim(),
        this.config.lang,
        this.config.page,
        this.config.limit
      );
      
      console.log(`✅ SearchDatabaseUseCase completed: ${results.length} attestations found`);
      
      return results;
    } catch (error) {
      console.error('❌ SearchDatabaseUseCase failed:', error);
      throw error;
    }
  }
}
