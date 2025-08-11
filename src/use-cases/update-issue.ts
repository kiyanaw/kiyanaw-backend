import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
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
      // Get the current issue and its version from the store
      const store = useEditorStore.getState();
      const currentIssue = store.issueById(input.issueId);
      if (!currentIssue) {
        throw new Error(`Issue ${input.issueId} not found`);
      }

      // Update the issue via the service with version
      const updatedIssue = await updateExistingIssue(input.issueId, input.updates, currentIssue._version || 0);

      // Update the store with the updated issue using the proper store method
      store.updateIssue(input.issueId, updatedIssue);

      // Update text editor highlighting for the affected region
      rteService.updateIssueHighlighting(updatedIssue.regionId);

      return updatedIssue;
    } catch (error) {
      console.error('Failed to update issue:', error);
      throw error;
    }
  }
}