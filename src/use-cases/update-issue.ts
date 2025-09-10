import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import { currentUser } from '../services/userService';
import { services } from '../services';
import { UpdateTranscriptionUseCase } from './update-transcription';
import type { IssueData } from '../services/adt';

export interface UpdateIssueConfig {
  issueId: string;
  updates: Partial<IssueData>;
}

export class UpdateIssueUseCase {
  constructor(private config: UpdateIssueConfig) {}

  validate(): void {
    if (!this.config.issueId) {
      throw new Error('Issue ID is required');
    }
    if (!this.config.updates || Object.keys(this.config.updates).length === 0) {
      throw new Error('Updates are required');
    }
  }

  async execute(): Promise<IssueData> {
    this.validate();

    try {
      // Get the current issue and its version from the store
      const store = useEditorStore.getState();
      const currentIssue = store.issueById(this.config.issueId);
      if (!currentIssue) {
        throw new Error(`Issue ${this.config.issueId} not found`);
      }

      // Create optimistic update for immediate UI feedback
      const optimisticUpdate = { ...currentIssue, ...this.config.updates };

      // 1. Update the store immediately (optimistic update)
      store.updateIssue(this.config.issueId, optimisticUpdate);

      // 2. Update text editor highlighting immediately
      rteService.updateIssueHighlighting(optimisticUpdate.regionId);

      // 3. Get current user and save to backend (async, in background)
      const user = currentUser();
      if (!user) {
        throw new Error('User must be authenticated to update issues');
      }
      
      const updatedIssue = await updateExistingIssue(this.config.issueId, this.config.updates, currentIssue._version || 0, user.username);

      // 4. Update store with server response (in case server changed anything)
      store.updateIssue(this.config.issueId, updatedIssue);

      // 5. Update transcription with new counts (this will show "Transcription saved" toast)
      const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
        transcriptionId: updatedIssue.transcriptionId,
        services,
        store,
      });
      
      await updateTranscriptionUseCase.execute();

      return updatedIssue;
    } catch (error) {
      console.error('Failed to update issue:', error);
      throw error;
    }
  }
}