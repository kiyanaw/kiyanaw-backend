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
   */
  private tokenizeText(text: string): Token[] {
    const tokens: Token[] = [];
    const tokenPattern = /([\p{L}\p{N}_-]+)/gu;
    let match;

    while ((match = tokenPattern.exec(text)) !== null) {
      tokens.push({
        token: match[1].trim().toLowerCase(),
        start: match.index,
        end: match.index + match[1].length
      });
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
   */
  private findCandidates(issueText: string, tokens: Token[], maxSuggestions = 3): TokenCandidate[] {
    const normalizedIssueText = this.normalizeText(issueText);
    const candidates: TokenCandidate[] = [];

    // Calculate edit distance for each token
    for (const token of tokens) {
      const score = this.editDistance(normalizedIssueText, token.token);
      
      // Only consider candidates within reasonable edit distance
      const maxDistance = Math.max(1, Math.floor(normalizedIssueText.length * 0.3));
      if (score <= maxDistance) {
        candidates.push({
          token: token.token,
          start: token.start,
          end: token.end,
          score
        });
      }
    }

    // Sort by score (lower = better) and return top candidates
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