export interface HighlightMatch {
  word: string;
  index: number;
  length: number;
}

export interface IssueSpan {
  index: number;
  length: number;
  id: string;
  type: IssueType;
}

export type IssueType = 'needs-help' | 'indexing' | 'new-word';

export interface IssueHighlight {
  text: string;
  id: string;
  type: IssueType;
  commentCount?: number;
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

    // Get exact string matches for issues using the new span matcher
    const issueSpans = this.findIssueSpans(text, issues);
    
    // Create a map of issue spans by their text content for efficient lookup
    const issueSpanMap = new Map<string, { type: IssueType; commentCount: number; id: string }>();
    issues.forEach(issue => {
      issueSpanMap.set(issue.text.trim(), {
        type: issue.type,
        commentCount: issue.commentCount || 0,
        id: issue.id
      });
    });

    // Build HTML by processing spans in order
    let result = '';
    let lastIndex = 0;

    // Sort spans by index to process in order
    const sortedSpans = [...issueSpans].sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return b.length - a.length; // Longer spans first for overlaps
    });

    for (const span of sortedSpans) {
      // Skip overlapping spans (shorter ones that start within a longer span)
      if (span.index < lastIndex) {
        continue;
      }

      // Add any text before this span, applying known word highlighting
      if (span.index > lastIndex) {
        const beforeText = text.slice(lastIndex, span.index);
        result += this.applyKnownWordHighlighting(beforeText, knownWords);
      }

      // Add the issue span
      const spanText = text.slice(span.index, span.index + span.length);
      const issueInfo = issueSpanMap.get(spanText);
      if (issueInfo) {
        const commentIcon = issueInfo.commentCount > 0 
          ? `<span class="issue-comment-icon"><svg class="w-3 h-3 inline ml-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span class="text-xs ml-0.5">${issueInfo.commentCount}</span></span>` 
          : '';
        result += `<span class="issue-${issueInfo.type}">${spanText}${commentIcon}</span>`;
      } else {
        result += spanText; // Fallback if issue info not found
      }

      lastIndex = span.index + span.length;
    }

    // Add any remaining text after the last span
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      result += this.applyKnownWordHighlighting(remainingText, knownWords);
    }

    return result;
  }

  /**
   * Find exact string matches for issues (inline implementation to avoid circular dependencies)
   */
  private findIssueSpans(text: string, issues: IssueHighlight[]): IssueSpan[] {
    if (!text || issues.length === 0) {
      return [];
    }

    const spans: IssueSpan[] = [];

    // Find all exact string matches for each issue
    for (const issue of issues) {
      const issueText = issue.text.trim();
      if (!issueText) continue;

      // Find all occurrences of this exact string
      let startIndex = 0;
      let foundIndex;
      
      while ((foundIndex = text.indexOf(issueText, startIndex)) !== -1) {
        spans.push({
          index: foundIndex,
          length: issueText.length,
          id: issue.id,
          type: issue.type
        });
        startIndex = foundIndex + 1; // Continue searching after this match
      }
    }

    // Sort by index (position in text), then by length descending for deterministic order
    return spans.sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return b.length - a.length;
    });
  }

  /**
   * Apply known word highlighting to text that doesn't have issue spans
   */
  private applyKnownWordHighlighting(text: string, knownWords: Set<string>): string {
    if (!text || knownWords.size === 0) {
      return text;
    }

    // Split text into tokens while preserving separators
    const tokens = text.split(this.tokenPattern);
    
    return tokens.map(token => {
      // Check if token is a word (matches our pattern)
      if (this.tokenPattern.test(token)) {
        const lowerToken = token.trim().toLowerCase();
        if (knownWords.has(lowerToken)) {
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