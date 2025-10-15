import { spellCheckerService, type WordAnalysis } from '../services/spellCheckerService';
import type { EditorKey } from '../services/rteService';
import { issueHighlightService } from '../services/issueHighlightService';
import { services } from '../services';
import { UpdateRegionUseCase } from './update-region';
import { migrateRegionAnalysis, mergeAnalysis, extractWords, isNewFormat } from '../services/migrationService';
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

        // Get existing region analysis and migrate if needed
        const currentRegion = store.regionById(regionId);
        const existingAnalysis = migrateRegionAnalysis(currentRegion?.regionAnalysis);
        const isLegacyUpgrade = !isNewFormat(currentRegion?.regionAnalysis);
        
        // Get global known words from store (ensure it's a Set)
        const globalKnownWords = (store.knownWords as Set<string>) || new Set<string>();
        
        // Get unique words to minimize API calls
        const uniqueWords = [...new Set(words)];
        
        // For legacy upgrades, analyze ALL words to get proper FST analysis
        // For normal analysis, only analyze unknown words
        const knownFromCache = new Set<string>();
        const unknownWords: string[] = [];
        
        if (isLegacyUpgrade) {
          console.log(`🔄 Legacy upgrade mode - will analyze ALL ${uniqueWords.length} words`);
          unknownWords.push(...uniqueWords); // Analyze everything
        } else {
          uniqueWords.forEach(word => {
            if (globalKnownWords.has(word)) {
              knownFromCache.add(word);
            } else {
              unknownWords.push(word);
            }
          });
        }

        let newAnalysisResults: WordAnalysis[] = [];

        // Only make API call if we have unknown words
        if (unknownWords.length > 0) {
          try {
            // Check unknown words against FST API using the transcription's language code
            console.log(`🔍 Spell checking ${unknownWords.length} words with language: ${transcription.lang}`);
            console.log(`📝 Words to analyze:`, unknownWords);
            
            const result = await spellCheckerService.check(unknownWords, transcription.lang, isLegacyUpgrade);
            
            console.log(`📊 FST SPELL CHECK RESULT:`, result);
            if (result.known.length > 0) {
              console.log(`🔍 DETAILED FST ANALYSIS:`, result.known.map(item => `${item.word} → ${item.analysis} (${item.allAnalysis.length} options)`));
            }
            
            // Store the detailed analysis results
            newAnalysisResults = result.known;
            
            // Filter out analyses containing "Err/Frag"
            newAnalysisResults = newAnalysisResults.map(item => {
              const validAnalyses = item.allAnalysis.filter(analysis => !analysis.includes('Err/Frag'));
              return {
                word: item.word,
                analysis: validAnalyses.length > 0 ? validAnalyses[0] : '',
                allAnalysis: validAnalyses
              };
            });
            
            // Update global store with newly discovered known words
            if (result.known.length > 0) {
              store.addKnownWords(result.known); // Now supports WordAnalysis[]
              console.log(`💾 Added ${result.known.length} new known words to global cache`);
            }
          } catch (error) {
            console.error('Error checking unknown words:', error);
          }
        }

        // Create analysis objects for cached words that are NOT already in existing analysis
        // This prevents wiping out FST data for words we already analyzed
        const existingWords = new Set(existingAnalysis.map(item => item.word));
        const cachedAnalysis: WordAnalysis[] = isLegacyUpgrade ? [] : 
          Array.from(knownFromCache)
            .filter(word => !existingWords.has(word)) // Only add if not already in region
            .map(word => ({
              word,
              analysis: '',
              allAnalysis: []
            }));

        // Combine cached and new analysis
        const combinedAnalysis = [...cachedAnalysis, ...newAnalysisResults];
        
        // Merge with existing analysis to preserve user selections and existing FST data
        // Only keep words that are still in the current text (uniqueWords)
        const finalAnalysis = mergeAnalysis(existingAnalysis, combinedAnalysis, uniqueWords);
        
        // Extract words for highlighting (backward compatibility)
        const allKnownWords = extractWords(finalAnalysis);

        // Update store immediately for UI highlighting
        // Store the full WordAnalysis objects (new format)
        console.log(`💾 SETTING REGION ANALYSIS for ${regionId}:`, finalAnalysis);
        store.setRegionAnalysis(regionId, finalAnalysis);
        
        if (isLegacyUpgrade) {
          console.log(`✅ LEGACY UPGRADE COMPLETE for ${regionId} - format changed from string[] to WordAnalysis[]`);
        }

        // Check if analysis changed for save trigger
        const currentWords = extractWords(existingAnalysis);
        const wordsChanged = JSON.stringify([...currentWords].sort()) !== JSON.stringify([...allKnownWords].sort());
        const formatChanged = !isNewFormat(currentRegion?.regionAnalysis); // Legacy format needs saving
        const analysisChanged = wordsChanged || formatChanged;
        
        console.log(`🔍 ANALYSIS CHANGE CHECK for ${regionId}:`, {
          wordsChanged,
          formatChanged,
          analysisChanged,
          currentWords,
          newWords: allKnownWords
        });

    // If analysis changed, trigger a save
    // The subscription will ignore this because it's self-triggered (lines 41-46 in subscribe-to-region-changes.ts)
    if (analysisChanged) {
      console.log(`💾 TRIGGERING SAVE for ${regionId} - analysis changed from:`, currentWords, 'to:', allKnownWords);
      
      const updateRegionUseCase = new UpdateRegionUseCase({
        regionId,
        changes: { regionAnalysis: finalAnalysis },
        debounceMs: 1000,
        primaryField: 'regionText',
        force: true, // Force because we already updated the store
        services: this.config.services,
        store
      });
      updateRegionUseCase.execute();
    } else {
      console.log(`ℹ️ NO SAVE NEEDED for ${regionId} - analysis unchanged`);
    }

    // Apply known words and issue highlighting to the main editor
    const mainEditorKey: EditorKey = `${regionId}:main`;
    const configRteService = this.config.services.rteService;
    if (configRteService.hasEditor(mainEditorKey)) {
      const issues = store.getIssuesForRegion(regionId);
      const issueHighlights = issueHighlightService.convertIssuesToHighlights(issues);
      
      configRteService.applyHighlighting(mainEditorKey, {
        knownWords: allKnownWords, // This is already extracted as string[] for highlighting
        issues: issueHighlights
      });
    }

  }
} 
