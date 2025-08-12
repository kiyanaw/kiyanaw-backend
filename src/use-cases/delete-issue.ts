import { deleteExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';

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
      // Get the issue and its version before deleting it
      const store = useEditorStore.getState();
      const issue = store.issues.find(i => i.id === input.issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${input.issueId} not found`);
      }
      
      const regionId = issue.regionId;
      const version = issue._version || 0;

      // Delete the issue via the service with version for conflict resolution
      await deleteExistingIssue(input.issueId, version);

      // Update the store by removing the deleted issue using the proper store method
      store.deleteIssue(input.issueId);

      // Update text editor highlighting for the affected region
      if (regionId) {
        rteService.updateIssueHighlighting(regionId);
      }
    } catch (error) {
      console.error('Failed to delete issue:', error);
      throw error;
    }
  }
}