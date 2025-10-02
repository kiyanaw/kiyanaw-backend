import { post } from 'aws-amplify/api';

export interface WordAnalysis {
  word: string;           // Original surface form
  analysis: string;       // Primary/selected analysis (first from FST)
  allAnalysis: string[];  // All possible analyses from FST
}

export interface SpellCheckResult {
  known: WordAnalysis[];  // Changed from string[] to WordAnalysis[]
  unknown: string[];
}

class SpellCheckerServiceImpl {
  private knownWordsCache = new Set<string>();
  private unknownWordsCache = new Set<string>();
  private pendingRequests = new Map<string, Promise<SpellCheckResult>>();

  /**
   * Check which words are known/unknown, using cache and batching API calls
   */
  async check(words: string[], languageCode: string = 'crk', forceAnalysis: boolean = false): Promise<SpellCheckResult> {
    if (words.length === 0) {
      return { known: [], unknown: [] };
    }

    // If forcing analysis, analyze all words regardless of cache
    // Otherwise, filter out words we already know about
    const unknownWords = forceAnalysis ? words : words.filter(word => 
      !this.knownWordsCache.has(word) && !this.unknownWordsCache.has(word)
    );

    if (unknownWords.length === 0 && !forceAnalysis) {
      // Return cached results as WordAnalysis objects
      const known: WordAnalysis[] = words
        .filter(word => this.knownWordsCache.has(word))
        .map(word => ({
          word,
          analysis: '',
          allAnalysis: []
        }));
      const unknown = words.filter(word => this.unknownWordsCache.has(word));
      
      return { known, unknown };
    }

    // Create cache key for this batch of unknown words
    const cacheKey = unknownWords.sort().join('|');
    
    // Check if we already have a pending request for this exact batch (only if not forcing)
    if (!forceAnalysis && this.pendingRequests.has(cacheKey)) {
      const result = await this.pendingRequests.get(cacheKey)!;
      return this.combineWithCached(words, result);
    }

    // Make API request
    const promise = this.makeApiRequest(unknownWords, languageCode);
    this.pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      
      // Update caches
      result.known.forEach(analysis => this.knownWordsCache.add(analysis.word));
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
      
      // Parse FST API response - keys are words, values are analysis arrays
      // Example: { 'otâpana': ['otâpân+N+I+Pl', 'nitâpân+N+A+D+Px3Sg+Obv'], 'kâ-kî-cîskâtahosocik': [] }
      const known: WordAnalysis[] = [];
      const unknown: string[] = [];

      for (const word of words) {
        const analyses = result[word];
        if (analyses && Array.isArray(analyses) && analyses.length > 0) {
          known.push({
            word,
            analysis: analyses[0], // Select first analysis as primary
            allAnalysis: analyses  // Keep all analyses for user selection
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
      // Check if word is in API results (new analysis)
      const apiAnalysis = apiResult.known.find(analysis => analysis.word === word);
      if (apiAnalysis) {
        known.push(apiAnalysis);
        continue;
      }

      // Check if word is in known cache (create legacy analysis object)
      if (this.knownWordsCache.has(word)) {
        known.push({
          word,
          analysis: '',
          allAnalysis: []
        });
        continue;
      }

      // Check if word is in unknown cache or API unknown results
      if (this.unknownWordsCache.has(word) || apiResult.unknown.includes(word)) {
        unknown.push(word);
      }
    }

    return { known, unknown };
  }

  /**
   * Add words to known cache (useful for loading saved analysis)
   * Supports both legacy string[] and new WordAnalysis[] formats
   */
  addKnownWords(words: string[] | WordAnalysis[]): void {
    if (words.length === 0) return;
    
    // Handle new WordAnalysis format
    if (typeof words[0] === 'object') {
      (words as WordAnalysis[]).forEach(analysis => 
        this.knownWordsCache.add(analysis.word)
      );
    } else {
      // Handle legacy string format
      (words as string[]).forEach(word => 
        this.knownWordsCache.add(word)
      );
    }
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
