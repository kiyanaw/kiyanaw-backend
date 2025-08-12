import type { IssueData } from './adt';
import type { IssueHighlight, IssueType } from './textHighlightService';

export interface IssueHighlightService {
  /**
   * Convert issue data to highlight format for text highlighting
   */
  convertIssuesToHighlights(issues: IssueData[]): IssueHighlight[];
}

class IssueHighlightServiceImpl implements IssueHighlightService {
  /**
   * Map issue type string to IssueType enum
   */
  private mapIssueType(typeString: string): IssueType {
    // Map common issue type strings to our standardized types
    switch (typeString.toLowerCase()) {
      case 'needs-help':
      case 'needs_help':
      case 'help':
        return 'needs-help';
      case 'indexing':
      case 'index':
        return 'indexing';
      case 'new-word':
      case 'new_word':
      case 'newword':
        return 'new-word';
      default:
        // Default to needs-help for unknown types
        console.warn(`Unknown issue type: ${typeString}, defaulting to 'needs-help'`);
        return 'needs-help';
    }
  }

  convertIssuesToHighlights(issues: IssueData[]): IssueHighlight[] {
    if (!issues || issues.length === 0) {
      return [];
    }

    // Filter out resolved issues - they should not be highlighted
    const activeIssues = issues.filter(issue => !issue.resolved);

    return activeIssues.map(issue => ({
      text: issue.text,
      id: issue.id,
      type: this.mapIssueType(issue.type),
      commentCount: issue.commentCount || 0
    }));
  }
}

export const issueHighlightService = new IssueHighlightServiceImpl();