import { issueHighlightService } from './issueHighlightService';
import type { IssueData } from './adt';

describe('IssueHighlightService', () => {
  describe('convertIssuesToHighlights', () => {
    it('should convert issue data to highlight format', () => {
      const issues: IssueData[] = [
        {
          id: 'issue-1',
          text: 'problematic word',
          owner: 'user-1',
          ownerFriendly: 'user@example.com',
          index: 1,
          type: 'spelling',
          regionId: 'region-1',
          transcriptionId: 'transcription-1'
        },
        {
          id: 'issue-2',
          text: 'another issue',
          owner: 'user-2',
          ownerFriendly: 'user2@example.com',
          index: 2,
          type: 'grammar',
          regionId: 'region-1',
          transcriptionId: 'transcription-1'
        }
      ];

      const result = issueHighlightService.convertIssuesToHighlights(issues);

      expect(result).toEqual([
        { text: 'problematic word', id: 'issue-1', type: 'needs-help' },
        { text: 'another issue', id: 'issue-2', type: 'needs-help' }
      ]);
    });

    it('should handle empty issues array', () => {
      const issues: IssueData[] = [];

      const result = issueHighlightService.convertIssuesToHighlights(issues);

      expect(result).toEqual([]);
    });

    it('should handle undefined/null issues', () => {
      const result1 = issueHighlightService.convertIssuesToHighlights(undefined as any);
      const result2 = issueHighlightService.convertIssuesToHighlights(null as any);

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });
});