import { updateExistingComment } from '../services/commentService';
import { useEditorStore } from '../stores/useEditorStore';

export interface UpdateCommentInput {
  commentId: string;
  text: string;
}

export class UpdateCommentUseCase {
  async execute({ commentId, text }: UpdateCommentInput): Promise<void> {
    try {
      const store = useEditorStore.getState();
      const currentComment = store.commentById(commentId);
      
      if (!currentComment) {
        console.warn(`Comment ${commentId} not found in store, skipping update`);
        return;
      }
      
      // Validate input
      if (!text.trim()) {
        throw new Error('Comment text cannot be empty');
      }
      
      // Skip if text hasn't actually changed
      if (currentComment.text === text.trim()) {
        return;
      }
      
      // Capture the version BEFORE any optimistic updates
      const originalVersion = currentComment._version || 0;
      
      // 1. Update the store immediately (optimistic update for UI responsiveness)
      const optimisticUpdate = { ...currentComment, text: text.trim() };
      store.updateComment(commentId, optimisticUpdate);
      
      // 2. Save to backend
      try {
        console.log(`💾 Updating comment ${commentId}: "${text.trim()}" (version: ${originalVersion})`);
        await updateExistingComment(commentId, { text: text.trim() }, originalVersion);
        console.log(`✅ Comment updated successfully: ${commentId}`);
      } catch (error) {
        console.error(`❌ Failed to update comment ${commentId}:`, error);
        // TODO: Consider reverting optimistic update on error or showing user notification
        throw error;
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }
}