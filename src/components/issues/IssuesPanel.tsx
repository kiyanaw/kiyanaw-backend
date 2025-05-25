import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './IssuesPanel.css';

interface Issue {
  id: string;
  text: string;
  type: 'needs-help' | 'indexing' | 'new-word' | 'general';
  owner: string;
  regionId?: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  comments: IssueComment[];
}

interface IssueComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface IssuesPanelProps {
  selectedRegionId?: string;
  issues: Issue[];
  canEdit: boolean;
  onCreateIssue: (
    issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt' | 'comments'>
  ) => void;
  onUpdateIssue: (issueId: string, updates: Partial<Issue>) => void;
  onDeleteIssue: (issueId: string) => void;
  onAddComment: (
    issueId: string,
    comment: Omit<IssueComment, 'id' | 'createdAt'>
  ) => void;
}

const issueTypes = [
  { value: 'needs-help', label: 'Needs Help', color: '#dc3545' },
  { value: 'indexing', label: 'Indexing', color: '#ffc107' },
  { value: 'new-word', label: 'New Word', color: '#17a2b8' },
  { value: 'general', label: 'General', color: '#6c757d' },
] as const;

export const IssuesPanel = ({
  selectedRegionId,
  issues,
  canEdit,
  onCreateIssue,
  onUpdateIssue,
  onDeleteIssue,
  onAddComment,
}: IssuesPanelProps) => {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newIssueText, setNewIssueText] = useState('');
  const [newIssueType, setNewIssueType] = useState<Issue['type']>('general');
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Filter issues based on current filter and selected region
  const filteredIssues = issues.filter((issue) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'open' && !issue.resolved) ||
      (filter === 'resolved' && issue.resolved);

    const matchesRegion =
      !selectedRegionId || issue.regionId === selectedRegionId;

    return matchesFilter && matchesRegion;
  });

  const handleCreateIssue = () => {
    if (!newIssueText.trim()) return;

    onCreateIssue({
      text: newIssueText.trim(),
      type: newIssueType,
      owner: user?.username || 'anonymous',
      regionId: selectedRegionId,
      resolved: false,
    });

    setNewIssueText('');
    setNewIssueType('general');
    setShowCreateForm(false);
  };

  const handleToggleResolved = (issue: Issue) => {
    onUpdateIssue(issue.id, {
      resolved: !issue.resolved,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteIssue = (issueId: string) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      onDeleteIssue(issueId);
    }
  };

  const handleToggleExpanded = (issueId: string) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId);
    } else {
      newExpanded.add(issueId);
    }
    setExpandedIssues(newExpanded);
  };

  const handleAddComment = (issueId: string) => {
    const commentText = commentTexts[issueId]?.trim();
    if (!commentText) return;

    onAddComment(issueId, {
      text: commentText,
      author: user?.username || 'anonymous',
    });

    setCommentTexts((prev) => ({ ...prev, [issueId]: '' }));
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

  const getIssueTypeInfo = (type: Issue['type']) => {
    return issueTypes.find((t) => t.value === type) || issueTypes[3];
  };

  return (
    <div className="issues-panel">
      <div className="issues-header">
        <h3>Issues</h3>
        <div className="issues-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="filter-select"
          >
            <option value="all">All Issues</option>
            <option value="open">Open Issues</option>
            <option value="resolved">Resolved Issues</option>
          </select>

          {canEdit && (
            <button
              className="create-issue-button"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              + New Issue
            </button>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="create-issue-form">
          <div className="form-group">
            <label>Issue Type</label>
            <select
              value={newIssueType}
              onChange={(e) => setNewIssueType(e.target.value as Issue['type'])}
              className="issue-type-select"
            >
              {issueTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newIssueText}
              onChange={(e) => setNewIssueText(e.target.value)}
              placeholder="Describe the issue..."
              className="issue-textarea"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button
              onClick={handleCreateIssue}
              disabled={!newIssueText.trim()}
              className="create-button"
            >
              Create Issue
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="issues-list">
        {filteredIssues.length === 0 ? (
          <div className="empty-state">
            <p>No issues found.</p>
            {selectedRegionId && (
              <p className="empty-hint">
                Issues will be filtered to the selected region.
              </p>
            )}
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const typeInfo = getIssueTypeInfo(issue.type);
            const isExpanded = expandedIssues.has(issue.id);
            const canModify = canEdit && user?.username === issue.owner;

            return (
              <div
                key={issue.id}
                className={`issue-item ${issue.resolved ? 'resolved' : 'open'}`}
              >
                <div
                  className="issue-header"
                  onClick={() => handleToggleExpanded(issue.id)}
                >
                  <div className="issue-info">
                    <span
                      className="issue-type-badge"
                      style={{ backgroundColor: typeInfo.color }}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="issue-text">{issue.text}</span>
                  </div>

                  <div className="issue-meta">
                    <span className="issue-owner">by {issue.owner}</span>
                    <span className="issue-date">
                      {formatDate(issue.createdAt)}
                    </span>
                    <span
                      className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
                    >
                      ▼
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="issue-details">
                    <div className="issue-actions">
                      {canEdit && (
                        <button
                          onClick={() => handleToggleResolved(issue)}
                          className={`resolve-button ${issue.resolved ? 'unresolve' : 'resolve'}`}
                        >
                          {issue.resolved ? 'Reopen' : 'Resolve'}
                        </button>
                      )}

                      {canModify && (
                        <button
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {issue.comments.length > 0 && (
                      <div className="comments-section">
                        <h4>Comments ({issue.comments.length})</h4>
                        <div className="comments-list">
                          {issue.comments
                            .sort(
                              (a, b) =>
                                new Date(b.createdAt).getTime() -
                                new Date(a.createdAt).getTime()
                            )
                            .map((comment) => (
                              <div key={comment.id} className="comment-item">
                                <div className="comment-header">
                                  <span className="comment-author">
                                    {comment.author}
                                  </span>
                                  <span className="comment-date">
                                    {formatDate(comment.createdAt)}
                                  </span>
                                </div>
                                <div className="comment-text">
                                  {comment.text}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {canEdit && (
                      <div className="add-comment-form">
                        <textarea
                          value={commentTexts[issue.id] || ''}
                          onChange={(e) =>
                            setCommentTexts((prev) => ({
                              ...prev,
                              [issue.id]: e.target.value,
                            }))
                          }
                          placeholder="Add a comment..."
                          className="comment-textarea"
                          rows={2}
                        />
                        <button
                          onClick={() => handleAddComment(issue.id)}
                          disabled={!commentTexts[issue.id]?.trim()}
                          className="add-comment-button"
                        >
                          Add Comment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
