import type { LemmaDetails } from '../services/adt';
import * as databaseService from '../services/databaseService';

export interface LoadLemmaDetailsConfig {
  lemma: string;
  lang?: string; // Optional language filter (crk, crgn)
}

export class LoadLemmaDetailsUseCase {
  constructor(private config: LoadLemmaDetailsConfig) {}

  validate(): void {
    if (!this.config.lemma?.trim()) {
      throw new Error('Lemma is required');
    }
    
    // Language is optional, but if provided should be valid
    if (this.config.lang && !['crk', 'crgn'].includes(this.config.lang)) {
      throw new Error('Invalid language code. Must be "crk" or "crgn"');
    }
  }

  async execute(): Promise<LemmaDetails> {
    this.validate();

    console.log(`🔍 LoadLemmaDetailsUseCase executing for lemma: ${this.config.lemma}`);
    
    try {
      const lemmaDetails = await databaseService.getLemmaDetails(
        this.config.lemma.trim(),
        this.config.lang
      );
      
      console.log(`✅ LoadLemmaDetailsUseCase completed: ${lemmaDetails.surfaceForms.length} surface forms, ${lemmaDetails.totalOccurrences} total occurrences`);
      
      return lemmaDetails;
    } catch (error) {
      console.error('❌ LoadLemmaDetailsUseCase failed:', error);
      throw error;
    }
  }
}
