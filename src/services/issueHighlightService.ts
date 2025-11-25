import type { IssueData, IssueType } from './adt';
import type { IssueHighlight } from './textHighlightService';

export interface IssueHighlightService {
  /**
   * Convert issue data to highlight format for text highlighting
   */
  convertIssuesToHighlights(issues: IssueData[]): IssueHighlight[];
}

class IssueHighlightServiceImpl implements IssueHighlightService {
  convertIssuesToHighlights(issues: IssueData[]): IssueHighlight[] {
    if (!issues || issues.length === 0) {
      return [];
    }

    // Filter out resolved issues - they should not be highlighted
    const activeIssues = issues.filter(issue => !issue.resolved);

    return activeIssues.map(issue => ({
      text: issue.text,
      id: issue.id,
      type: issue.type as IssueType,
      commentCount: issue.commentCount || 0
    }));
  }
}

export const issueHighlightService = new IssueHighlightServiceImpl();