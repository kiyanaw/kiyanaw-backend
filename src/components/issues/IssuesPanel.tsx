import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

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
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 md:flex-row md:p-4 flex-col p-3 gap-3">
        <h3 className="m-0 text-lg font-semibold text-gray-800">Issues</h3>
        <div className="flex gap-3 items-center md:gap-3 gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="py-1.5 px-3 border border-gray-300 rounded bg-white text-sm text-gray-700"
          >
            <option value="all">All Issues</option>
            <option value="open">Open Issues</option>
            <option value="resolved">Resolved Issues</option>
          </select>

          {canEdit && (
            <button
              className="py-2 px-4 bg-blue-600 text-white border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-blue-700"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              + New Issue
            </button>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="mb-3">
            <label className="block mb-1 font-semibold text-gray-700 text-sm">Issue Type</label>
            <select
              value={newIssueType}
              onChange={(e) => setNewIssueType(e.target.value as Issue['type'])}
              className="w-full py-2 px-3 border border-gray-300 rounded text-sm text-gray-700"
            >
              {issueTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block mb-1 font-semibold text-gray-700 text-sm">Description</label>
            <textarea
              value={newIssueText}
              onChange={(e) => setNewIssueText(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full py-2 px-3 border border-gray-300 rounded text-sm text-gray-700 resize-y min-h-[60px] font-inherit"
              rows={3}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateIssue}
              disabled={!newIssueText.trim()}
              className="py-2 px-4 bg-green-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              Create Issue
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="py-2 px-4 bg-gray-500 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-10 px-5 text-gray-500">
            <p className="m-0 mb-2">No issues found.</p>
            {selectedRegionId && (
              <p className="text-sm text-gray-400 m-0">
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
                className={`border border-gray-200 rounded-lg mb-3 bg-white transition-all duration-200 hover:border-gray-400 hover:shadow-sm ${
                  issue.resolved ? 'opacity-70 bg-gray-50' : ''
                }`}
              >
                <div
                  className="p-3 px-4 cursor-pointer flex justify-between items-start gap-3 md:flex-row md:items-start flex-col items-stretch"
                  onClick={() => handleToggleExpanded(issue.id)}
                >
                  <div className="flex-1 flex items-start gap-2">
                    <span
                      className="inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase text-white flex-shrink-0"
                      style={{ backgroundColor: typeInfo.color }}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="text-sm text-gray-800">{issue.text}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 md:flex-row md:gap-2 flex-col gap-1">
                    <span>by {issue.owner}</span>
                    <span>{formatDate(issue.createdAt)}</span>
                    <span
                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      ▼
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 pt-0">
                    <div className="flex gap-2 mb-4 md:flex-row flex-col">
                      {canEdit && (
                        <button
                          onClick={() => handleToggleResolved(issue)}
                          className={`py-1.5 px-3 border-none rounded text-sm cursor-pointer transition-colors duration-200 ${
                            issue.resolved
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {issue.resolved ? 'Reopen' : 'Resolve'}
                        </button>
                      )}

                      {canModify && (
                        <button
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="py-1.5 px-3 bg-red-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {issue.comments.length > 0 && (
                      <div className="mb-4">
                        <h4 className="m-0 mb-3 text-sm font-semibold text-gray-700">Comments ({issue.comments.length})</h4>
                        <div className="space-y-3">
                          {issue.comments
                            .sort(
                              (a, b) =>
                                new Date(b.createdAt).getTime() -
                                new Date(a.createdAt).getTime()
                            )
                            .map((comment) => (
                              <div key={comment.id} className="border border-gray-200 rounded p-3 bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-sm text-gray-800">
                                    {comment.author}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(comment.createdAt)}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700 leading-relaxed">
                                  {comment.text}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {canEdit && (
                      <div className="mt-4">
                        <textarea
                          value={commentTexts[issue.id] || ''}
                          onChange={(e) =>
                            setCommentTexts((prev) => ({
                              ...prev,
                              [issue.id]: e.target.value,
                            }))
                          }
                          placeholder="Add a comment..."
                          className="w-full py-2 px-3 border border-gray-300 rounded text-sm text-gray-700 resize-y min-h-[50px] font-inherit mb-2"
                          rows={2}
                        />
                        <button
                          onClick={() => handleAddComment(issue.id)}
                          disabled={!commentTexts[issue.id]?.trim()}
                          className="py-1.5 px-3 bg-blue-600 text-white border-none rounded text-sm cursor-pointer transition-colors duration-200 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
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
