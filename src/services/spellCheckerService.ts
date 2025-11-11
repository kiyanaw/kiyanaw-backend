import { post } from 'aws-amplify/api';

export interface WordAnalysis {
  word: string;
  analysis: string;           // The primary analysis to use
  allAnalysis: string[];      // All available analyses
}

export interface SpellCheckResult {
  known: WordAnalysis[];
  unknown: string[];
}

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
      return { known: [], unknown: [] };
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
      const { response } = await post({
        apiName: 'spellcheck',
        path: `/${languageCode}/bulk-lookup`,
        options: {
          body: words
        }
      });
      const res = await response;
      const result = await res.body.json() as Record<string, string[]>;
      
      // Parse API response - keys are words, values are arrays of analyses
      const known: WordAnalysis[] = [];
      const unknown: string[] = [];

      for (const word of words) {
        const analyses = result[word];
        if (analyses && Array.isArray(analyses) && analyses.length > 0) {
          known.push({
            word,
            analysis: analyses[0],  // Use first analysis as primary
            allAnalysis: analyses   // Keep all for potential user selection
          });
        } else {
          unknown.push(word);
        }
      }

      return { known, unknown };
    } catch (error) {
      console.error('Spell check API error:', error);
      // On error, treat all words as unknown to avoid false positives
      return { known: [], unknown: words };
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

    return { known, unknown };
  }

  /**
   * Add words to known cache (useful for loading saved analysis)
   * Accepts both string[] (legacy) and WordAnalysis[] (new format)
   */
  addKnownWords(words: string[] | WordAnalysis[]): void {
    words.forEach(word => {
      if (typeof word === 'string') {
        this.knownWordsCache.add(word);
      } else {
        this.knownWordsCache.add(word.word);
      }
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
}

export const spellCheckerService = new SpellCheckerServiceImpl();
