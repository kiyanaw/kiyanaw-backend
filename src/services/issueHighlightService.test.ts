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
          type: 'needs-help' as const,
          regionId: 'region-1',
          transcriptionId: 'transcription-1',
          dateLastUpdated: '2023-01-01T00:00:00Z',
          userLastUpdated: 'user-1',
          resolved: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          _version: 1
        },
        {
          id: 'issue-2',
          text: 'another issue',
          owner: 'user-2',
          ownerFriendly: 'user2@example.com',
          index: 2,
          type: 'needs-help' as const,
          regionId: 'region-1',
          transcriptionId: 'transcription-1',
          dateLastUpdated: '2023-01-01T00:00:00Z',
          userLastUpdated: 'user-2',
          resolved: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          _version: 1
        }
      ];

      const result = issueHighlightService.convertIssuesToHighlights(issues);

      expect(result).toEqual([
        { text: 'problematic word', id: 'issue-1', type: 'needs-help' as const, commentCount: 0 },
        { text: 'another issue', id: 'issue-2', type: 'needs-help' as const, commentCount: 0 }
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

    it('should include comment count in highlight data', () => {
      const issues: IssueData[] = [
        {
          id: 'issue-with-comments',
          text: 'commented word',
          type: 'needs-help' as const,
          owner: 'user1',
          ownerFriendly: 'User One',
          resolved: false,
          index: 1,
          regionId: 'region-1',
          transcriptionId: 'transcription-1',
          commentCount: 3,
          dateLastUpdated: '2023-01-01T00:00:00Z',
          userLastUpdated: 'user1',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          _version: 1
        },
        {
          id: 'issue-no-comments',
          text: 'uncommented word',
          type: 'needs-help' as const,
          owner: 'user1',
          ownerFriendly: 'User One', 
          resolved: false,
          index: 2,
          regionId: 'region-1',
          transcriptionId: 'transcription-1',
          dateLastUpdated: '2023-01-01T00:00:00Z',
          userLastUpdated: 'user1',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          _version: 1
          // No commentCount - should default to 0
        }
      ];

      const result = issueHighlightService.convertIssuesToHighlights(issues);

      expect(result).toEqual([
        { text: 'commented word', id: 'issue-with-comments', type: 'needs-help' as const, commentCount: 3 },
        { text: 'uncommented word', id: 'issue-no-comments', type: 'needs-help' as const, commentCount: 0 }
      ]);
    });
  });
});