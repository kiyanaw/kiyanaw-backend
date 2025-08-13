import { createNewComment } from '../services/commentService';
import { updateExistingIssue } from '../services/issueService';
import { useEditorStore } from '../stores/useEditorStore';
import { useAuthStore } from '../stores/useAuthStore';
import { currentUser } from '../services/userService';

export interface CreateCommentInput {
  entityType: 'issue' | 'region' | 'transcription';
  entityId: string;
  text: string;
}

export class CreateCommentUseCase {
  async execute({ entityType, entityId, text }: CreateCommentInput): Promise<void> {
    try {
      // Get current user and transcription
      const user = useAuthStore.getState().user;
      const transcription = useEditorStore.getState().transcription;
      
      if (!user) {
        throw new Error('User must be authenticated to create comments');
      }
      
      if (!transcription) {
        throw new Error('Transcription must be loaded to create comments');
      }
      
      // Validate input
      if (!text.trim()) {
        throw new Error('Comment text cannot be empty');
      }
      
      // Create comment via service
      const newComment = await createNewComment({
        text: text.trim(),
        author: user.userId,
        authorFriendly: user.username,
        transcriptionId: transcription.id,
        entityType,
        entityId,
        metadata: undefined,
      });
      
      // Add to store (this also increments commentCount locally for issue comments)
      const store = useEditorStore.getState();
      store.addNewComment(newComment);

      // Persist updated issue.commentCount to backend to avoid it being reset by subscriptions
      if (entityType === 'issue') {
        const issue = store.issueById(entityId);
        if (issue) {
          // Count actual comments from store instead of incrementing
          const actualComments = store.commentsByIssue(entityId);
          const actualCount = actualComments.length;
          try {
            const user = currentUser();
            if (!user) {
              throw new Error('User must be authenticated to update issue');
            }
            const updatedIssue = await updateExistingIssue(issue.id, { commentCount: actualCount }, issue._version || 0, user.username);
            // Sync version and any server-calculated fields back into the store
            store.updateIssue(issue.id, updatedIssue);
          } catch (persistErr) {
            console.error('Failed to persist issue commentCount:', persistErr);
          }
        }
      }
      
      console.log(`✅ Comment created for ${entityType} ${entityId}`);
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  }
}