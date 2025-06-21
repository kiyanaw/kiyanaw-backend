interface SpellCheckResult {
  known: string[];
  unknown: string[];
}

class SpellCheckerServiceImpl {
  private knownWordsCache = new Set<string>();
  private unknownWordsCache = new Set<string>();
  private pendingRequests = new Map<string, Promise<SpellCheckResult>>();
  private readonly endpoint = 'https://icagc4x2ok.execute-api.us-east-1.amazonaws.com/bulk-lookup';

  /**
   * Check which words are known/unknown, using cache and batching API calls
   */
  async check(words: string[]): Promise<SpellCheckResult> {
    if (words.length === 0) {
      return { known: [], unknown: [] };
    }

    // Filter out words we already know about
    const unknownWords = words.filter(word => 
      !this.knownWordsCache.has(word) && !this.unknownWordsCache.has(word)
    );

    if (unknownWords.length === 0) {
      // Return cached results
      return {
        known: words.filter(word => this.knownWordsCache.has(word)),
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
    const promise = this.makeApiRequest(unknownWords);
    this.pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      
      // Update caches
      result.known.forEach(word => this.knownWordsCache.add(word));
      result.unknown.forEach(word => this.unknownWordsCache.add(word));

      return this.combineWithCached(words, result);
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async makeApiRequest(words: string[]): Promise<SpellCheckResult> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify(words),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Parse API response - keys are words, values are arrays (empty if not found)
      const known: string[] = [];
      const unknown: string[] = [];

      for (const word of words) {
        if (result[word] && Array.isArray(result[word]) && result[word].length > 0) {
          known.push(word);
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
    return {
      known: originalWords.filter(word => 
        this.knownWordsCache.has(word) || apiResult.known.indexOf(word) !== -1
      ),
      unknown: originalWords.filter(word => 
        this.unknownWordsCache.has(word) || apiResult.unknown.indexOf(word) !== -1
      )
    };
  }

  /**
   * Add words to known cache (useful for loading saved analysis)
   */
  addKnownWords(words: string[]): void {
    words.forEach(word => this.knownWordsCache.add(word));
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