import { post } from 'aws-amplify/api';
import type { WordAnalysis, SpellCheckResult, SpellingSuggestion } from './adt';

class SpellCheckerServiceImpl {
  private knownWordsCache = new Set<string>();
  private unknownWordsCache = new Set<string>();
  private pendingRequests = new Map<string, Promise<SpellCheckResult>>();

  /**
   * Check which words are known/unknown, using cache and batching API calls
   * Returns WordAnalysis[] for known words with FST analysis details
   */
  async check(words: string[], languageCode: string = 'crk'): Promise<SpellCheckResult> {
    if (words.length === 0) {
      return { known: [], unknown: [], suggestions: new Map() };
    }

    // Filter out words we already know about
    const unknownWords = words.filter(word => 
      !this.knownWordsCache.has(word) && !this.unknownWordsCache.has(word)
    );

    if (unknownWords.length === 0) {
      // Return cached results - words in cache get empty analysis
      return {
        known: words
          .filter(word => this.knownWordsCache.has(word))
          .map(word => ({
            word,
            analysis: '',
            allAnalysis: []
          })),
        unknown: words.filter(word => this.unknownWordsCache.has(word))
      };
    }

    // Create cache key for this batch of unknown words
    const cacheKey = unknownWords.sort().join('|');
    
    // Check if we already have a pending request for this exact batch
    if (this.pendingRequests.has(cacheKey)) {
      const result = await this.pendingRequests.get(cacheKey)!;
      return this.combineWithCached(words, result);
    }

    // Make API request
    const promise = this.makeApiRequest(unknownWords, languageCode);
    this.pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      
      // Update caches
      result.known.forEach(item => this.knownWordsCache.add(item.word));
      result.unknown.forEach(word => this.unknownWordsCache.add(word));

      return this.combineWithCached(words, result);
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async makeApiRequest(words: string[], languageCode: string): Promise<SpellCheckResult> {
    try {
      // Use Amplify's REST API client with the spellcheck API
      // New endpoint format: /bulk-lookup with languageCode in body
      const { response } = await post({
        apiName: 'spellcheck',
        path: '/bulk-lookup',
        options: {
          body: {
            languageCode,
            words
          }
        }
      });
      const res = await response;
      const result = await res.body.json() as Record<string, string[] | { word: string; analysis: string }[]>;
      
      console.debug('🔍 SPELL-CHECK: API Response:', result);
      
      // Parse API response - keys are words, values are arrays of analyses
      const known: WordAnalysis[] = [];
      const unknown: string[] = [];
      const suggestions = new Map<string, SpellingSuggestion[]>();

      // Extract _suggestions if present
      if ('_suggestions' in result && result._suggestions) {
        console.debug('🔍 SPELL-CHECK: Found _suggestions field:', result._suggestions);
        const suggestionsData = result._suggestions;
        if (typeof suggestionsData === 'object' && suggestionsData !== null && !Array.isArray(suggestionsData)) {
          for (const [misspelledWord, suggestionList] of Object.entries(suggestionsData)) {
            if (Array.isArray(suggestionList)) {
              console.debug(`🔍 SPELL-CHECK: Adding suggestions for "${misspelledWord}":`, suggestionList);
              suggestions.set(misspelledWord, suggestionList as SpellingSuggestion[]);
            }
          }
        }
      } else {
        console.debug('🔍 SPELL-CHECK: No _suggestions field in response');
      }

      for (const word of words) {
        const analyses = result[word];
        if (analyses && Array.isArray(analyses) && analyses.length > 0) {
          // Check if this is an array of strings (analyses) or objects (shouldn't happen for word keys)
          if (typeof analyses[0] === 'string') {
            known.push({
              word,
              analysis: analyses[0] as string,  // Use first analysis as primary
              allAnalysis: analyses as string[]   // Keep all for potential user selection
            });
          }
        } else {
          unknown.push(word);
        }
      }

      return { known, unknown, suggestions };
    } catch (error) {
      console.error('Spell check API error:', error);
      // On error, treat all words as unknown to avoid false positives
      return { known: [], unknown: words, suggestions: new Map() };
    }
  }

  private combineWithCached(originalWords: string[], apiResult: SpellCheckResult): SpellCheckResult {
    const known: WordAnalysis[] = [];
    const unknown: string[] = [];

    for (const word of originalWords) {
      // Check if in API result
      const apiAnalysis = apiResult.known.find(item => item.word === word);
      if (apiAnalysis) {
        known.push(apiAnalysis);
        continue;
      }
      
      // Check if in known cache
      if (this.knownWordsCache.has(word)) {
        known.push({
          word,
          analysis: '',
          allAnalysis: []
        });
        continue;
      }
      
      // Must be unknown
      if (this.unknownWordsCache.has(word) || apiResult.unknown.includes(word)) {
        unknown.push(word);
      }
    }

    // Preserve suggestions from API result
    return { known, unknown, suggestions: apiResult.suggestions };
  }

  /**
   * Add words to known cache (useful for loading saved analysis)
   */
  addKnownWords(words: WordAnalysis[]): void {
    words.forEach(word => {
      this.knownWordsCache.add(word.word);
    });
  }

  /**
   * Get current known words (for debugging)
   */
  getKnownWords(): string[] {
    return Array.from(this.knownWordsCache);
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache(): void {
    this.knownWordsCache.clear();
    this.unknownWordsCache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Simple tokenizer - split on whitespace and remove punctuation
   */
  tokenize(text: string): string[] {
    if (!text) return [];
    
    return text
      .split(/\s+/)
      .map(word => word.replace(/[.,()!?;:"']/g, '').toLowerCase())
      .filter(word => word.length > 0);
  }

  /**
   * Analyze region text and return merged word analysis.
   * 
   * Coordinates between:
   * - Fresh API analysis for unknown words
   * - Global known words cache
   * - Existing region analysis (for persistence)
   * 
   * This is the primary method for spell checking region text.
   * 
   * @param text - The text to analyze
   * @param languageCode - Language code for spell checking (e.g., 'crk')
   * @param globalKnownWords - Map of globally cached word analyses
   * @param existingAnalysis - Existing analysis from the region (for fallback)
   * @returns Array of WordAnalysis objects for all words in text
   */
  async analyzeRegionText(
    text: string,
    languageCode: string,
    globalKnownWords: Map<string, WordAnalysis>,
    existingAnalysis: WordAnalysis[] = []
  ): Promise<{ analysis: WordAnalysis[]; newlyKnown: WordAnalysis[]; suggestions: SpellingSuggestion[] }> {
    // Tokenize
    const words = this.tokenize(text);
    if (words.length === 0) {
      return { analysis: [], newlyKnown: [], suggestions: [] };
    }
    
    // Build a map of existing analysis by word for fast lookup
    const existingAnalysisMap = new Map<string, WordAnalysis>();
    if (Array.isArray(existingAnalysis)) {
      existingAnalysis.forEach((item: unknown) => {
        if (typeof item === 'object' && item !== null && 'word' in item) {
          const analysis = item as WordAnalysis;
          // Only keep complete analysis (not empty)
          if (analysis.word && analysis.analysis && analysis.allAnalysis?.length > 0) {
            existingAnalysisMap.set(analysis.word, analysis);
          }
        }
      });
    }
    
    const uniqueWords = [...new Set(words)];
    
    // Separate cached words from unknown words
    const cachedWords: string[] = [];
    const unknownUniqueWords: string[] = [];
    
    uniqueWords.forEach(word => {
      if (globalKnownWords.has(word)) {
        cachedWords.push(word);
      } else {
        unknownUniqueWords.push(word);
      }
    });
    
    // Get fresh analysis from API for unknown words only
    const freshAnalysis: WordAnalysis[] = [];
    const suggestions: SpellingSuggestion[] = [];
    if (unknownUniqueWords.length > 0) {
      try {
        const result = await this.check(unknownUniqueWords, languageCode);
        
        if (result.known.length > 0) {
          freshAnalysis.push(...result.known);
        }
        
        // Extract suggestions for unknown words
        if (result.suggestions) {
          for (const [word, suggestionList] of result.suggestions.entries()) {
            suggestions.push(...suggestionList);
          }
        }
      } catch (error) {
        console.error('Spell check API error during region analysis:', error);
      }
    }
    
    // CRITICAL: Merge analysis from THREE sources:
    // 1. Fresh analysis from API (highest priority)
    // 2. Global cache (has full WordAnalysis objects)
    // 3. Existing region analysis (fallback)
    //
    // IMPORTANT: Create ONE entry per occurrence (not per unique word)
    // This allows each instance of a duplicate word to have its own user selection
    const mergedAnalysis: WordAnalysis[] = [];
    const freshAnalysisMap = new Map(freshAnalysis.map(item => [item.word, item]));
    
    // Build map of existing analysis by word AND index for duplicate word handling
    const existingByWordAndIndex = new Map<string, WordAnalysis>();
    if (Array.isArray(existingAnalysis)) {
      existingAnalysis.forEach((item, idx) => {
        if (typeof item === 'object' && item !== null && 'word' in item) {
          const analysis = item as WordAnalysis;
          if (analysis.word && analysis.analysis && analysis.allAnalysis?.length > 0) {
            existingByWordAndIndex.set(`${analysis.word}-${idx}`, analysis);
          }
        }
      });
    }
    
    // Iterate over ALL words (including duplicates) to create one entry per occurrence
    words.forEach((word, index) => {
      const existingKey = `${word}-${index}`;
      const existingEntry = existingByWordAndIndex.get(existingKey);
      
      if (freshAnalysisMap.has(word)) {
        // 1. Fresh analysis from API takes highest priority
        // Always mark as 'auto' since this is fresh from the API
        const fresh = freshAnalysisMap.get(word)!;
        mergedAnalysis.push({
          ...fresh,
          source: 'auto',
          index
        });
      } else if (existingEntry) {
        // 2. Preserve existing analysis for this specific occurrence (including user selections)
        mergedAnalysis.push({
          ...existingEntry,
          index
        });
      } else if (globalKnownWords.has(word)) {
        // 3. Get full analysis from global cache (new occurrence of a known word)
        const cachedAnalysis = globalKnownWords.get(word)!;
        mergedAnalysis.push({
          ...cachedAnalysis,
          source: 'auto',
          index
        });
      }
      // If none of the above, skip (unknown word with no analysis)
    });
    
    return {
      analysis: mergedAnalysis,
      newlyKnown: freshAnalysis,
      suggestions: suggestions
    };
  }
}

export const spellCheckerService = new SpellCheckerServiceImpl();
