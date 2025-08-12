import type { IssueData } from './adt';

export interface TokenCandidate {
  token: string;
  start: number;
  end: number;
  score: number; // Lower is better (edit distance)
}

export interface MatchResult {
  matched: Set<string>; // Issue IDs that matched
  unmatched: Set<string>; // Issue IDs that couldn't match
  suggestions: Record<string, TokenCandidate[]>; // issueId -> top candidates
}

export interface Token {
  token: string;
  start: number;
  end: number;
}

export class IssueMatchingService {
  
  /**
   * Tokenize text into words with their positions
   * Simplified: just split by spaces and find positions
   */
  private tokenizeText(text: string): Token[] {
    const tokens: Token[] = [];
    const words = text.split(/\s+/);
    let currentIndex = 0;

    for (const word of words) {
      if (word.trim()) {
        // Find the actual position of this word in the original text
        const wordStart = text.indexOf(word, currentIndex);
        if (wordStart !== -1) {
          tokens.push({
            token: word.trim().toLowerCase(),
            start: wordStart,
            end: wordStart + word.length
          });
          currentIndex = wordStart + word.length;
        }
      }
    }

    return tokens;
  }

  /**
   * Calculate edit distance between two strings (Levenshtein)
   */
  private editDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [];
      matrix[i][0] = i;
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // deletion
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    return matrix[a.length][b.length];
  }

  /**
   * Normalize text for matching (trim, lowercase, etc.)
   */
  private normalizeText(text: string): string {
    return text.trim().toLowerCase();
  }

  /**
   * Find the best token candidates for an issue text
   * Prioritize by first letter match and similar length
   */
  private findCandidates(issueText: string, tokens: Token[], maxSuggestions = 10): TokenCandidate[] {
    const normalizedIssueText = this.normalizeText(issueText);
    const candidates: TokenCandidate[] = [];

    for (const token of tokens) {
      // Skip if length difference is too large (more than 50% different)
      const lengthDiff = Math.abs(normalizedIssueText.length - token.token.length);
      const maxLengthDiff = Math.max(normalizedIssueText.length, token.token.length) * 0.5;
      
      if (lengthDiff > maxLengthDiff && lengthDiff > 3) {
        continue; // Skip very different lengths
      }

      let score = this.editDistance(normalizedIssueText, token.token);
      
      // Bonus for same first letter
      if (normalizedIssueText[0] === token.token[0]) {
        score -= 5; // Lower score = better priority
      }
      
      // Bonus for similar length
      const lengthSimilarity = 1 - (lengthDiff / Math.max(normalizedIssueText.length, token.token.length));
      score -= lengthSimilarity * 2;

      candidates.push({
        token: token.token,
        start: token.start,
        end: token.end,
        score
      });
    }

    // Sort by score (lower = better) and return suggestions
    candidates.sort((a, b) => a.score - b.score);
    return candidates.slice(0, maxSuggestions);
  }

  /**
   * Match issues against text and return results
   */
  match(regionText: string, issues: IssueData[]): MatchResult {
    const tokens = this.tokenizeText(regionText);
    const tokenSet = new Set(tokens.map(t => t.token));
    
    const matched = new Set<string>();
    const unmatched = new Set<string>();
    const suggestions: Record<string, TokenCandidate[]> = {};

    // Check each issue for matches
    for (const issue of issues) {
      // Skip resolved issues - they don't need to be highlighted anyway
      if (issue.resolved) {
        continue;
      }

      const normalizedIssueText = this.normalizeText(issue.text);
      
      // Check for exact match first
      if (tokenSet.has(normalizedIssueText)) {
        matched.add(issue.id);
      } else {
        // No exact match - find suggestions
        unmatched.add(issue.id);
        const candidates = this.findCandidates(issue.text, tokens);
        if (candidates.length > 0) {
          suggestions[issue.id] = candidates;
        }
      }
    }

    return {
      matched,
      unmatched,
      suggestions
    };
  }
}

// Export singleton instance
export const issueMatchingService = new IssueMatchingService();