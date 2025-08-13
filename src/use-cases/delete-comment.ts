import { deleteExistingComment } from '../services/commentService';
import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { currentUser } from '../services/userService';

export interface DeleteCommentInput {
  commentId: string;
}

export class DeleteCommentUseCase {
  async execute({ commentId }: DeleteCommentInput): Promise<void> {
    try {
      const store = useEditorStore.getState();
      const currentComment = store.commentById(commentId);
      
      if (!currentComment) {
        console.warn(`Comment ${commentId} not found in store, skipping delete`);
        return;
      }
      
      // Capture the version for backend call
      const version = currentComment._version || 0;
      
      // 1. Delete from backend first (no optimistic delete for safety)
      console.log(`🗑️ Deleting comment ${commentId} (version: ${version})`);
      await deleteExistingComment(commentId, version);
      
      // 2. Remove from store after successful backend delete
      store.deleteComment(commentId);

      // 3. Update issue commentCount if this was an issue comment
      if (currentComment.entityType === 'issue') {
        const issue = store.issueById(currentComment.entityId);
        if (issue) {
          // Count actual remaining comments from store
          const remainingComments = store.commentsByIssue(currentComment.entityId);
          const actualCount = remainingComments.length;
          try {
            const user = currentUser();
            if (!user) {
              throw new Error('User must be authenticated to update issue');
            }
            const updatedIssue = await updateExistingIssue(issue.id, { commentCount: actualCount }, issue._version || 0, user.username);
            // Sync version and any server-calculated fields back into the store
            store.updateIssue(issue.id, updatedIssue);
          } catch (persistErr) {
            console.error('Failed to persist issue commentCount after delete:', persistErr);
          }
        }
      }
      
      console.log(`✅ Comment deleted successfully: ${commentId}`);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }
}