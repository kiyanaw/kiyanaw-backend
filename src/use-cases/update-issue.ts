import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import type { IssueData } from '../services/adt';

export interface UpdateIssueInput {
  issueId: string;
  updates: Partial<IssueData>;
}

export class UpdateIssueUseCase {
  constructor() {}

  validate(input: UpdateIssueInput): void {
    if (!input.issueId) {
      throw new Error('Issue ID is required');
    }
    if (!input.updates || Object.keys(input.updates).length === 0) {
      throw new Error('Updates are required');
    }
  }

  async execute(input: UpdateIssueInput): Promise<IssueData> {
    this.validate(input);

    try {
      // Update the issue via the service
      const updatedIssue = await updateExistingIssue(input.issueId, input.updates);

      // Update the store with the updated issue
      const store = useEditorStore.getState();
      const currentIssues = store.issues;
      const updatedIssues = currentIssues.map(issue => 
        issue.id === input.issueId ? updatedIssue : issue
      );
      
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

      return updatedIssue;
    } catch (error) {
      console.error('Failed to update issue:', error);
      throw error;
    }
  }
}