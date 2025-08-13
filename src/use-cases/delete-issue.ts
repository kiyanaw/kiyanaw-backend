import { deleteExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';

export interface DeleteIssueConfig {
  issueId: string;
}

export class DeleteIssueUseCase {
  constructor(private config: DeleteIssueConfig) {}

  validate(): void {
    if (!this.config.issueId) {
      throw new Error('Issue ID is required');
    }
  }

  async execute(): Promise<void> {
    this.validate();

    try {
      // Get the issue and its version before deleting it
      const store = useEditorStore.getState();
      const issue = store.issues.find(i => i.id === this.config.issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${this.config.issueId} not found`);
      }
      
      const regionId = issue.regionId;
      const version = issue._version || 0;

      // Delete the issue via the service with version for conflict resolution
      await deleteExistingIssue(this.config.issueId, version);

      // Update the store by removing the deleted issue using the proper store method
      store.deleteIssue(this.config.issueId);

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