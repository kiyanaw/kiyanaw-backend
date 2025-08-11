export interface HighlightMatch {
  word: string;
  index: number;
  length: number;
}

export interface IssueHighlight {
  text: string;
  id: string;
}

export interface HighlightOptions {
  knownWords?: Set<string>;
  issues?: IssueHighlight[];
}

export interface TextHighlightService {
  /**
   * Generate HTML markup with known words wrapped in spans
   * Optimized for RegionItem rendering - O(tokens) complexity
   */
  generateHTML(text: string, knownWords: Set<string>): string;
  
  /**
   * Generate HTML markup with both known words and issue highlighting
   * Issues take priority over known words for overlapping text
   */
  generateHTMLWithOptions(text: string, options: HighlightOptions): string;
  
  /**
   * Find character indices of known words for RTE formatting
   * Returns matches sorted by position for safe formatting
   */
  findMatches(text: string, knownWords: Set<string>): HighlightMatch[];
}

class TextHighlightServiceImpl implements TextHighlightService {
  // Unicode-aware tokenizer that captures words and preserves separators
  // Include hyphens to match spellCheckerService tokenization for words like "kâ-kîsikâk"
  private readonly tokenPattern = /([\p{L}\p{N}_-]+)/u;
  
  generateHTML(text: string, knownWords: Set<string>): string {
    return this.generateHTMLWithOptions(text, { knownWords });
  }

  generateHTMLWithOptions(text: string, options: HighlightOptions): string {
    if (!text) {
      return '';
    }

    const { knownWords = new Set(), issues = [] } = options;
    
    if (knownWords.size === 0 && issues.length === 0) {
      return text;
    }

    // Create issue text lookup for efficient matching
    const issueTextSet = new Set(issues.map(issue => issue.text.toLowerCase()));
    
    // Split text into tokens while preserving separators
    const tokens = text.split(this.tokenPattern);
    
    return tokens.map(token => {
      // Check if token is a word (matches our pattern)
      if (this.tokenPattern.test(token)) {
        const lowerToken = token.toLowerCase();
        
        // Issues take priority over known words
        if (issueTextSet.has(lowerToken)) {
          return `<span class="issue-text">${token}</span>`;
        } else if (knownWords.has(lowerToken)) {
          return `<span class="known-word">${token}</span>`;
        }
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