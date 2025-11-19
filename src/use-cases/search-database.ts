import type { SearchResponse } from '../services/adt';
import * as databaseService from '../services/databaseService';
import { isValidLanguageCode, LANGUAGE_CODES } from '../config/languages';

export interface SearchDatabaseConfig {
  query: string;
  lang?: string; // Optional language filter
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
    if (this.config.lang && !isValidLanguageCode(this.config.lang)) {
      throw new Error(`Invalid language code. Must be one of: ${LANGUAGE_CODES.join(', ')}`);
    }
  }

  async execute(): Promise<SearchResponse> {
    this.validate();

    console.log(`🔎 SearchDatabaseUseCase executing for query: "${this.config.query}"`);
    
    try {
      const response = await databaseService.searchDatabase(
        this.config.query.trim(),
        this.config.lang,
        this.config.page,
        this.config.limit
      );
      
      console.log(`✅ SearchDatabaseUseCase completed: ${response.results.length} attestations (page ${response.page})`);
      
      return response;
    } catch (error) {
      console.error('❌ SearchDatabaseUseCase failed:', error);
      throw error;
    }
  }
}
