import { deleteExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import type { IssueData } from '../services/adt';

export interface DeleteIssueInput {
  issueId: string;
}

export class DeleteIssueUseCase {
  constructor() {}

  validate(input: DeleteIssueInput): void {
    if (!input.issueId) {
      throw new Error('Issue ID is required');
    }
  }

  async execute(input: DeleteIssueInput): Promise<void> {
    this.validate(input);

    try {
      // Delete the issue via the service
      await deleteExistingIssue(input.issueId);

      // Update the store by removing the deleted issue
      const store = useEditorStore.getState();
      const currentIssues = store.issues;
      const updatedIssues = currentIssues.filter(issue => issue.id !== input.issueId);
      
      // Rebuild the issues by region map
      const issuesByRegionMap: Record<string, IssueData[]> = {};
      updatedIssues.forEach((issue) => {
        if (!issuesByRegionMap[issue.regionId]) {
          issuesByRegionMap[issue.regionId] = [];
        }
        issuesByRegionMap[issue.regionId].push(issue);
      });

      // Update the store
      store.setEditorData({
        issues: updatedIssues,
        issuesByRegionMap,
      });
    } catch (error) {
      console.error('Failed to delete issue:', error);
      throw error;
    }
  }
}