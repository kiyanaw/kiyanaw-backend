import { useState, useEffect } from 'react';
import { Check, Trash2, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

interface Issue {
  id: string;
  text: string;
  type: 'needs-help' | 'indexing' | 'new-word';
  owner: string; // UUID for permission checking
  ownerFriendly: string; // Friendly name for display
  regionId?: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}



interface IssuesPanelProps {
  selectedRegionId?: string;
  issues: Issue[];
  canEdit: boolean;
  onCreateIssue: (
    issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt' | 'commentCount' | 'ownerFriendly'>
  ) => void;
  onUpdateIssue: (issueId: string, updates: Partial<Issue>) => void;
  onDeleteIssue: (issueId: string) => void;
}

const issueTypes = [
  { value: 'needs-help', label: 'Needs Help', color: '#dc3545' },
  { value: 'indexing', label: 'Indexing', color: '#ffc107' },
  { value: 'new-word', label: 'New Word', color: '#17a2b8' },
] as const;

export const IssuesPanel = ({
  selectedRegionId,
  issues,
  canEdit,
  onCreateIssue,
  onUpdateIssue,
  onDeleteIssue,
}: IssuesPanelProps) => {
  const user = useAuthStore((state) => state.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newIssueText, setNewIssueText] = useState('');
  const [newIssueType, setNewIssueType] = useState<Issue['type']>('new-word');

  const [showResolved, setShowResolved] = useState(false);
  const [expandedTypeIssueId, setExpandedTypeIssueId] = useState<string | null>(null);

  // Close expanded type selector on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedTypeIssueId(null);
      }
    };

    if (expandedTypeIssueId) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [expandedTypeIssueId]);

  // Filter and sort issues - open issues first, then resolved issues at bottom
  const filteredIssues = issues
    .filter((issue) => {
      const matchesResolvedFilter = showResolved || !issue.resolved;
      const matchesRegion = !selectedRegionId || issue.regionId === selectedRegionId;
      return matchesResolvedFilter && matchesRegion;
    })
    .sort((a, b) => {
      // First sort by resolved status (open issues first)
      if (a.resolved !== b.resolved) {
        return a.resolved ? 1 : -1;
      }
      // Then sort by creation date (newest first within each group)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Count resolved issues for the toggle
  const resolvedCount = issues.filter(issue => 
    issue.resolved && (!selectedRegionId || issue.regionId === selectedRegionId)
  ).length;

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
    setNewIssueType('new-word');
    setShowCreateForm(false);
  };

  const handleToggleResolved = (issue: Issue) => {
    onUpdateIssue(issue.id, {
      resolved: !issue.resolved,
    });
  };

  const handleTypeChange = (issueId: string, newType: Issue['type']) => {
    // Find the current issue to check if type is actually changing
    const currentIssue = issues.find(issue => issue.id === issueId);
    
    // Only save if the type is actually different
    if (currentIssue && currentIssue.type !== newType) {
      onUpdateIssue(issueId, {
        type: newType,
      });
    }
    
    setExpandedTypeIssueId(null); // Always collapse after selection
  };

  const handleTypeClick = (issueId: string) => {
    if (expandedTypeIssueId === issueId) {
      setExpandedTypeIssueId(null); // Collapse if already expanded
    } else {
      setExpandedTypeIssueId(issueId); // Expand this issue's type selector
    }
  };

  const handleDeleteIssue = (issueId: string) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      onDeleteIssue(issueId);
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

  const getIssueTypeInfo = (type: Issue['type']) => {
    return issueTypes.find((t) => t.value === type) || issueTypes[0];
  };

  return (
    <>
      <style>{`
        @keyframes slideInFade {
          from {
            opacity: 0;
            transform: translateX(10px) scale(0.8);
          }
          to {
            opacity: 0.6;
            transform: translateX(0px) scale(1);
          }
        }
      `}</style>
      <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="m-0 text-lg font-semibold text-gray-800">Issues</h3>
        {canEdit && (
          <button
            className="py-2 px-4 bg-blue-600 text-white border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-blue-700"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            + New Issue
          </button>
        )}
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
            const commentCount = issue.commentCount || 0;
            // Based on auth rules: issue owners can delete, anyone with transcription edit access can resolve/update
            const isIssueOwner = user?.userId === issue.owner;
            const canDelete = canEdit && isIssueOwner; // Only issue owners can delete
            const canResolve = canEdit; // Anyone with transcription edit access can resolve/update
            


            return (
              <div
                key={issue.id}
                className={`border border-gray-200 rounded-lg mb-3 bg-white transition-all duration-200 hover:border-gray-400 hover:shadow-sm ${
                  issue.resolved ? 'opacity-70 bg-gray-50' : ''
                }`}
              >
                <div className="p-3 flex items-center gap-3">
                  {/* Type badges - only show for unresolved issues */}
                  {!issue.resolved && (
                    <>
                      {canEdit ? (
                        <div className="flex items-center">
                          {/* Current pill - always visible in normal position */}
                          <span
                            onClick={() => handleTypeClick(issue.id)}
                            className={`inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase text-white cursor-pointer hover:opacity-90 transition-all duration-300 ease-out ${
                              expandedTypeIssueId === issue.id ? 'ring-2 ring-white ring-offset-2' : ''
                            }`}
                            style={{ backgroundColor: typeInfo.color }}
                            title="Click to change issue type"
                          >
                            {typeInfo.label}
                          </span>
                          
                          {/* Expanding container for other pills */}
                          <div 
                            className="overflow-hidden transition-all duration-300 ease-out"
                            style={{
                              width: expandedTypeIssueId === issue.id ? 'auto' : '0px',
                              marginLeft: expandedTypeIssueId === issue.id ? '4px' : '0px'
                            }}
                          >
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              {issueTypes
                                .filter(type => type.value !== issue.type)
                                .map((type) => (
                                  <span
                                    key={type.value}
                                    onClick={() => handleTypeChange(issue.id, type.value as Issue['type'])}
                                    className="inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase text-white cursor-pointer opacity-60 hover:opacity-80 transition-all duration-300 ease-out"
                                    style={{ backgroundColor: type.color }}
                                    title={type.label}
                                  >
                                    {type.label}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Static badge for unresolved issues when user can't edit
                        <span
                          className="inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase text-white flex-shrink-0"
                          style={{ backgroundColor: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </span>
                      )}
                    </>
                  )}

                  {/* Resolved badge - only badge shown for resolved issues */}
                  {issue.resolved && (
                    <span className="inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase bg-green-600 text-white flex-shrink-0">
                      RESOLVED
                    </span>
                  )}

                  {/* Issue text with comment icon - takes up remaining space */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className={`text-sm ${issue.resolved ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {issue.text}
                    </span>
                    {commentCount > 0 && (
                      <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-500">
                        <MessageSquare className="w-3 h-3" />
                        <span>{commentCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Right side: metadata and actions */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                    <span>by {user?.userId === issue.owner ? 'me' : issue.ownerFriendly}</span>
                    <span>{formatDate(issue.createdAt)}</span>

                    {/* Action icons */}
                    {canResolve && (
                      <button
                        onClick={() => handleToggleResolved(issue)}
                        className={`ml-2 p-1.5 rounded-md border transition-all duration-200 ${
                          issue.resolved 
                            ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 hover:border-green-400' 
                            : 'bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-700'
                        }`}
                        title={issue.resolved ? 'Click to reopen issue' : 'Click to resolve issue'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteIssue(issue.id)}
                        className="ml-1 p-1.5 rounded-md border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-all duration-200"
                        title="Delete issue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Toggle link for resolved issues */}
        {resolvedCount > 0 && (
          <div className="text-center py-2">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="text-gray-500 hover:text-gray-700 cursor-pointer bg-none border-none transition-colors duration-200"
              style={{ fontSize: '11px' }}
            >
              {showResolved ? 'Hide resolved issues' : `Show resolved issues (${resolvedCount})`}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
};
