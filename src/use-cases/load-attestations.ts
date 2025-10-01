import type { Attestation } from '../services/adt';
import * as databaseService from '../services/databaseService';

export interface LoadAttestationsConfig {
  lemma: string;
  surface: string;
  lang?: string; // Optional language filter (crk, crgn)
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
    if (this.config.lang && !['crk', 'crgn'].includes(this.config.lang)) {
      throw new Error('Invalid language code. Must be "crk" or "crgn"');
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
