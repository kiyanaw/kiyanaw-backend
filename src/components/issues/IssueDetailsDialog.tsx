import { useState, useEffect, useRef } from 'react';
import { Check, Trash2, X, MessageSquare } from 'lucide-react';
import { useEditorStore } from '../../stores/useEditorStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCreateComment } from '../../hooks/useCreateComment';
import { useDeleteComment } from '../../hooks/useDeleteComment';
import { canComment, canDeleteComment } from '../../lib/permissions';
import type { CommentData } from '../../services/adt';

interface IssueDetailsDialogProps {
  issueId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateIssue?: (issueId: string, updates: Record<string, unknown>) => void;
  onDeleteIssue?: (issueId: string) => void;
}

const issueTypes = [
  { value: 'needs-help', label: 'Needs Help', color: '#dc2626', bgColor: '#ffe6e6' },
  { value: 'indexing', label: 'Indexing', color: '#d97706', bgColor: '#fff9e6' },
  { value: 'new-word', label: 'New Word', color: '#166534', bgColor: '#f0fdf4' },
] as const;

export const IssueDetailsDialog = ({
  issueId,
  isOpen,
  onClose,
  onUpdateIssue,
  onDeleteIssue,
}: IssueDetailsDialogProps) => {
  const user = useAuthStore((state) => state.user);
  const transcription = useEditorStore((state) => state.transcription);
  const issue = useEditorStore((state) => state.issueById(issueId));
  const rawComments = useEditorStore((state) => state.commentsByIssue(issueId));
  // Sort comments oldest to newest (chronological order)
  const comments = [...rawComments].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Handle adding a comment
  const handleAddComment = async () => {
    if (!newCommentText.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      await createComment({
        entityType: 'issue',
        entityId: issueId,
        text: newCommentText.trim(),
      });
      setNewCommentText('');
    } catch (error) {
      console.error('Failed to add comment:', error);
      // TODO: Show user-friendly error message
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await deleteComment({ commentId });
    } catch (error) {
      console.error('Failed to delete comment:', error);
      // TODO: Show user-friendly error message
    }
  };

  // Handle resolving/reopening issue
  const handleToggleResolved = () => {
    if (issue && onUpdateIssue) {
      onUpdateIssue(issueId, { resolved: !issue.resolved });
    }
  };

  // Handle deleting issue
  const handleDeleteIssue = () => {
    if (window.confirm('Are you sure you want to delete this issue?') && onDeleteIssue) {
      onDeleteIssue(issueId);
      onClose(); // Close dialog after deletion
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      return 'Unknown';
    }
  };

  const getIssueTypeInfo = (type: string) => {
    return issueTypes.find((t) => t.value === type) || issueTypes[0];
  };

  // Don't render if not open or issue not found
  if (!isOpen || !issue) {
    return null;
  }

  const typeInfo = getIssueTypeInfo(issue.type);
  const isIssueOwner = user?.userId === issue.owner;
  const userCanComment = canComment(transcription, user);
  const userCanEdit = transcription && user ? 
    (transcription.author === user.userId || (transcription.editors?.includes(user.userId) ?? false)) : false;
  const canDelete = userCanEdit && isIssueOwner;
  const canResolve = userCanEdit;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div 
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Issue Details</h2>
            {/* Note: linkStatus is not available on IssueData from store, only passed from EditorPage */}
          </div>
          <div className="flex items-center gap-1">
            {canResolve && (
              <button
                onClick={handleToggleResolved}
                title={issue.resolved ? 'Reopen issue' : 'Resolve issue'}
                className={`p-2 rounded-md transition-colors ${
                  issue.resolved
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                }`}
              >
                <Check className="w-5 h-5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDeleteIssue}
                title="Delete issue"
                className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Issue Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            {/* Type badge */}
            <span
              className="inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase flex-shrink-0"
              style={{ 
                backgroundColor: issue.resolved ? '#f3f4f6' : typeInfo.bgColor, 
                color: issue.resolved ? '#6b7280' : typeInfo.color,
                border: `1px solid ${issue.resolved ? '#6b7280' : typeInfo.color}`
              }}
            >
              {issue.resolved ? 'RESOLVED' : typeInfo.label}
            </span>

            {/* Issue text and metadata */}
            <div className="flex-1">
              <p className={`text-lg mb-2 ${issue.resolved ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {issue.text}
              </p>
              <div className="text-sm text-gray-500">
                <span>Created by {user?.userId === issue.owner ? 'me' : issue.ownerFriendly}</span>
                <span className="mx-2">•</span>
                <span>{formatDate(issue.createdAt || new Date().toISOString())}</span>
                {(issue.commentCount || 0) > 0 && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="flex items-center gap-1 inline-flex">
                      <MessageSquare className="w-3 h-3" />
                      {issue.commentCount} comment{issue.commentCount !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Former action buttons moved to header as compact icon buttons */}
        </div>

        {/* Comments Section */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Comments Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">
              Comments {comments.length > 0 && `(${comments.length})`}
            </h3>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No comments yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment: CommentData) => {
                  const canDeleteThisComment = canDeleteComment(comment.author, transcription, user);
                  
                  return (
                    <div key={comment.id} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                      {/* Comment content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {user?.userId === comment.author ? 'me' : comment.authorFriendly}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-800">{comment.text}</p>
                      </div>

                      {/* Delete button */}
                      {canDeleteThisComment && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                          title="Delete comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comment Composer */}
          {userCanComment && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    disabled={isSubmittingComment}
                  />
                </div>
                <button
                  onClick={handleAddComment}
                  disabled={!newCommentText.trim() || isSubmittingComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors self-start"
                >
                  {isSubmittingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};