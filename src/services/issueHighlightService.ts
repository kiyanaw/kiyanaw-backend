import type { IssueData } from './adt';
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

    return issues.map(issue => ({
      text: issue.text,
      id: issue.id
    }));
  }
}

export const issueHighlightService = new IssueHighlightServiceImpl();