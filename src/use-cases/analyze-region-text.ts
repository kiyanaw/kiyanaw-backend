import { spellCheckerService } from '../services/spellCheckerService';
import type { EditorKey } from '../services/rteService';
import { issueHighlightService } from '../services/issueHighlightService';
import { services } from '../services';
import Timeout from 'smart-timeout';

interface AnalyzeRegionTextConfig {
  regionId: string;
  text: string;
  services: typeof services;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any; // ZustandStore with text editing capabilities
}

// Debounced analysis state - now stores timeout keys instead of timeout objects
const pendingAnalysis = new Map<string, string>();

export class AnalyzeRegionTextUseCase {
  private config: AnalyzeRegionTextConfig;

  constructor(config: AnalyzeRegionTextConfig) {
    this.config = config;
  }

  validate(): void {
    if (!this.config.regionId) {
      throw new Error('regionId is required');
    }
    if (typeof this.config.text !== 'string') {
      throw new Error('text must be a string');
    }
  }

  async execute(): Promise<void> {
    this.validate();

    const { regionId, text } = this.config;

    // Clear any existing timeout for this region
    const existingTimeoutKey = pendingAnalysis.get(regionId);
    if (existingTimeoutKey) {
      Timeout.clear(existingTimeoutKey);
    }

    // Create unique timeout key for this analysis
    const timeoutKey = `analyze-region-${regionId}`;

    // Set up debounced analysis (1.5 seconds - faster than before to complete before save)
    Timeout.set(timeoutKey, async () => {
      await this.performAnalysis(text);
      pendingAnalysis.delete(regionId);
    }, 500);

    pendingAnalysis.set(regionId, timeoutKey);
  }

  private async performAnalysis(text: string): Promise<void> {
    const { regionId, store } = this.config;

    // Check if transcription has an index set for spell checking
    const transcription = store.transcription;
    if (!transcription?.lang) {
      // No language index set - skip spell checking and set empty analysis
      console.log('⚠️ Skipping spell checking - no language index set on transcription');
      store.setRegionAnalysis(regionId, []);
      return;
    }

    // Tokenize the text
    const words = spellCheckerService.tokenize(text);
    if (words.length === 0) {
      // Set empty analysis for empty text
      store.setRegionAnalysis(regionId, []);
      return;
    }

    // Get global known words from store
    const globalKnownWords = store.knownWords as Set<string>;
    

    
    // Get unique words to minimize API calls
    const uniqueWords = [...new Set(words)];
    
    // Separate unique words into already known and unknown
    const knownUniqueWords = new Set<string>();
    const unknownUniqueWords: string[] = [];
    
    uniqueWords.forEach(word => {
      if (globalKnownWords.has(word)) {
        knownUniqueWords.add(word);
      } else {
        unknownUniqueWords.push(word);
      }
    });

    // Only make API call if we have unknown words
    if (unknownUniqueWords.length > 0) {
      try {
        // Check unknown words against API using the transcription's language code
        console.log(`🔍 Spell checking ${unknownUniqueWords.length} words with language: ${transcription.lang}`);
        const result = await spellCheckerService.check(unknownUniqueWords, transcription.lang);
        
        // Add newly discovered known words to our known set
        if (result.known.length > 0) {
          result.known.forEach(word => knownUniqueWords.add(word));
          // Update global store with newly discovered known words
          store.addKnownWords(result.known);
        }
      } catch (error) {
        console.error('Error checking unknown words:', error);
      }
    }

    // Build final analysis array as unique known words (for highlighting reference)
    const allKnownWords = Array.from(knownUniqueWords);

    // Update region analysis in store (this will be picked up by the coordinated save)
    store.setRegionAnalysis(regionId, allKnownWords);

    // Apply known words and issue highlighting to the main editor
    const mainEditorKey: EditorKey = `${regionId}:main`;
    const configRteService = this.config.services.rteService;
    if (configRteService.hasEditor(mainEditorKey)) {
      const issues = store.getIssuesForRegion(regionId);
      const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
      
      configRteService.applyHighlighting(mainEditorKey, {
        knownWords: allKnownWords,
        issues: issueHighlights
      });
    }

  }
} 