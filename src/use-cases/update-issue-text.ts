import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { rteService } from '../services/rteService';
import { currentUser } from '../services/userService';
import { services } from '../services';
import { UpdateTranscriptionUseCase } from './update-transcription';
import Timeout from 'smart-timeout';

export interface UpdateIssueTextInput {
  issueId: string;
  newText: string;
}

// Debounced save state - stores timeout keys instead of timeout objects
const pendingIssueTextSaves = new Map<string, string>();

export class UpdateIssueTextUseCase {
  constructor() {}

  validate(input: UpdateIssueTextInput): void {
    if (!input.issueId) {
      throw new Error('Issue ID is required');
    }
    if (typeof input.newText !== 'string') {
      throw new Error('New text must be a string');
    }
  }

  async execute(input: UpdateIssueTextInput): Promise<void> {
    this.validate(input);

    const { issueId, newText } = input;

    try {
      // Get the current issue from store
      const store = useEditorStore.getState();
      const currentIssue = store.issueById(issueId);
      if (!currentIssue) {
        console.warn(`Issue ${issueId} not found in store, skipping update`);
        return;
      }

      // Skip if text hasn't actually changed
      if (currentIssue.text === newText.trim()) {
        return;
      }

      // Capture the version BEFORE any optimistic updates
      const originalVersion = currentIssue._version || 0;

      // 1. Update the store immediately (optimistic update for UI responsiveness)
      const optimisticUpdate = { ...currentIssue, text: newText.trim() };
      store.updateIssue(issueId, optimisticUpdate);

      // 2. Update text editor highlighting immediately
      if (currentIssue.regionId) {
        rteService.updateIssueHighlighting(currentIssue.regionId);
      }

      // 3. Clear any existing timeout for this issue
      const existingTimeoutKey = pendingIssueTextSaves.get(issueId);
      if (existingTimeoutKey) {
        Timeout.clear(existingTimeoutKey);
      }

      // 4. Set up debounced backend save (2500ms)
      const timeoutKey = `save-issue-text-${issueId}`;
      
      Timeout.set(timeoutKey, async () => {
        try {
          // Get current user for the save operation
          const user = currentUser();
          if (!user) {
            console.error(`❌ User not authenticated, cannot save issue text for ${issueId}`);
            return;
          }

          console.log(`💾 Saving issue text for ${issueId}: "${newText.trim()}" (version: ${originalVersion})`);
          const updatedIssue = await updateExistingIssue(issueId, { text: newText.trim() }, originalVersion, user.username);
          console.log(`✅ Issue text saved successfully for ${issueId}`);

          // Update transcription (this will show "Transcription saved" toast)
          const updateTranscriptionUseCase = new UpdateTranscriptionUseCase({
            transcriptionId: updatedIssue.transcriptionId,
            services,
            store,
          });
          
          await updateTranscriptionUseCase.execute();
        } catch (error) {
          console.error(`❌ Failed to save issue text for ${issueId}:`, error);
          // TODO: Consider reverting optimistic update on error or showing user notification
        } finally {
          pendingIssueTextSaves.delete(issueId);
        }
      }, 2500);

      pendingIssueTextSaves.set(issueId, timeoutKey);

    } catch (error) {
      console.error('Failed to update issue text:', error);
      throw error;
    }
  }
}