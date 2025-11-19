import type { Attestation } from '../services/adt';
import * as databaseService from '../services/databaseService';
import { isValidLanguageCode, LANGUAGE_CODES } from '../config/languages';

export interface LoadAttestationsConfig {
  lemma: string;
  surface: string;
  lang?: string; // Optional language filter
}

export class LoadAttestationsUseCase {
  constructor(private config: LoadAttestationsConfig) {}

  validate(): void {
    if (!this.config.lemma?.trim()) {
      throw new Error('Lemma is required');
    }
    
    if (!this.config.surface?.trim()) {
      throw new Error('Surface form is required');
    }
    
    // Language is optional, but if provided should be valid
    if (this.config.lang && !isValidLanguageCode(this.config.lang)) {
      throw new Error(`Invalid language code. Must be one of: ${LANGUAGE_CODES.join(', ')}`);
    }
  }

  async execute(): Promise<Attestation[]> {
    this.validate();

    console.log(`📋 LoadAttestationsUseCase executing for: ${this.config.lemma} -> ${this.config.surface}`);
    
    try {
      const attestations = await databaseService.getAttestations(
        this.config.lemma.trim(),
        this.config.surface.trim(),
        this.config.lang
      );
      
      console.log(`✅ LoadAttestationsUseCase completed: ${attestations.length} attestations found`);
      
      return attestations;
    } catch (error) {
      console.error('❌ LoadAttestationsUseCase failed:', error);
      throw error;
    }
  }
}
