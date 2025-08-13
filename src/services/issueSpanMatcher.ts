import type { IssueHighlight, IssueType } from './textHighlightService';

export interface IssueSpan {
  index: number;
  length: number;
  id: string;
  type: IssueType;
}

export interface IssueSpanMatcher {
  /**
   * Find all exact string matches of issue text within the given text
   * Uses exact string matching - case sensitive, punctuation included
   * Returns all occurrences sorted by index
   */
  findIssueSpans(text: string, issues: IssueHighlight[]): IssueSpan[];
}

class IssueSpanMatcherImpl implements IssueSpanMatcher {
  findIssueSpans(text: string, issues: IssueHighlight[]): IssueSpan[] {
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
}

export const issueSpanMatcher = new IssueSpanMatcherImpl();