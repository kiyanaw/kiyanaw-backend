import { spellCheckerService } from '../services/spellCheckerService';
import { rteService, type EditorKey } from '../services/rteService';
import { services } from '../services';
import Timeout from 'smart-timeout';

interface AnalyzeRegionTextConfig {
  regionId: string;
  text: string;
  services: typeof services;
  store: any; // whole store object
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

    // Tokenize the text
    const words = spellCheckerService.tokenize(text);
    if (words.length === 0) {
      // Set empty analysis for empty text
      store.getState().setRegionAnalysis(regionId, []);
      return;
    }

    // Get global known words from store
    const globalKnownWords = store.getState().knownWords as Set<string>;
    
    // Separate words into already known and unknown
    const alreadyKnownWords: string[] = [];
    const unknownWords: string[] = [];
    
    words.forEach(word => {
      if (globalKnownWords.has(word)) {
        alreadyKnownWords.push(word);
      } else {
        unknownWords.push(word);
      }
    });

    // Start with words we already know are known
    let allKnownWords = [...alreadyKnownWords];

    // Only make API call if we have unknown words
    if (unknownWords.length > 0) {
      try {
        // Check unknown words against API
        const result = await spellCheckerService.check(unknownWords);
        
        // Add newly discovered known words
        if (result.known.length > 0) {
          allKnownWords.push(...result.known);
          // Update global store with newly discovered known words
          store.getState().addKnownWords(result.known);
        }
      } catch (error) {
        console.error('Error checking unknown words:', error);
      }
    }

    // Update region analysis in store (this will be picked up by the coordinated save)
    store.getState().setRegionAnalysis(regionId, allKnownWords);

    // Apply formatting to the main editor
    const mainEditorKey: EditorKey = `${regionId}:main`;
    if (rteService.hasEditor(mainEditorKey)) {
      rteService.applyKnownWordsFormatting(mainEditorKey, allKnownWords);
    }

    console.log(`Analyzed "${text.slice(0, 50)}..." - Found ${allKnownWords.length} known words (${alreadyKnownWords.length} cached, ${allKnownWords.length - alreadyKnownWords.length} from API):`, allKnownWords);
  }
} 