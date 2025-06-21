export interface HighlightMatch {
  word: string;
  index: number;
  length: number;
}

export interface TextHighlightService {
  /**
   * Generate HTML markup with known words wrapped in spans
   * Optimized for RegionItem rendering - O(tokens) complexity
   */
  generateHTML(text: string, knownWords: Set<string>): string;
  
  /**
   * Find character indices of known words for RTE formatting
   * Returns matches sorted by position for safe formatting
   */
  findMatches(text: string, knownWords: Set<string>): HighlightMatch[];
}

class TextHighlightServiceImpl implements TextHighlightService {
  // Unicode-aware tokenizer that captures words and preserves separators
  private readonly tokenPattern = /([\p{L}\p{N}_]+)/u;
  
  generateHTML(text: string, knownWords: Set<string>): string {
    if (!text || knownWords.size === 0) {
      return text || '';
    }

    // Split text into tokens while preserving separators
    const tokens = text.split(this.tokenPattern);
    
    return tokens.map(token => {
      // Check if token is a word (matches our pattern) and is known
      if (this.tokenPattern.test(token) && knownWords.has(token.toLowerCase())) {
        return `<span class="known-word">${token}</span>`;
      }
      return token;
    }).join('');
  }
  
  findMatches(text: string, knownWords: Set<string>): HighlightMatch[] {
    if (!text || knownWords.size === 0) {
      return [];
    }

    const matches: HighlightMatch[] = [];
    const tokens = text.split(this.tokenPattern);
    let currentIndex = 0;
    
    for (const token of tokens) {
      if (this.tokenPattern.test(token) && knownWords.has(token.toLowerCase())) {
        matches.push({
          word: token,
          index: currentIndex,
          length: token.length
        });
      }
      currentIndex += token.length;
    }
    
    // Sort by index for safe RTE formatting (longest first if same index)
    return matches.sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return b.length - a.length;
    });
  }
}

export const textHighlightService = new TextHighlightServiceImpl(); 