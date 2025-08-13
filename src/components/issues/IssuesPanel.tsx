import { useState, useEffect, useRef } from 'react';
import { Check, Trash2, MessageSquare, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { browserService } from '../../services/browserService';
import { UpdateIssueTextUseCase } from '../../use-cases/update-issue-text';
import { IssueDetailsDialog } from './IssueDetailsDialog';
import { useNavigateIssueRegions } from '../../hooks/useNavigateIssueRegions';
import { useCreateIssueFromSelection } from '../../hooks/useCreateIssueFromSelection';
import { useIssueFlashIndicator } from '../../hooks/useIssueFlashIndicator';
import { FLASH_CONFIG } from '../../services/flashIndicatorService';

// Suggestion Popover Component
interface SuggestionPopoverProps {
  issueId: string;
  suggestions: Array<{ token: string; start: number; end: number; score: number }>;
  onSelectSuggestion: (issueId: string, newText: string) => void;
  onClose: () => void;
}

const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({ 
  issueId, 
  suggestions, 
  onSelectSuggestion, 
  onClose 
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
      ref={popoverRef}
      className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg"
    >
      <div className="p-3">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Suggested matches:
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSuggestion(issueId, suggestion.token);
              }}
              className="w-full text-left px-3 py-2 text-sm rounded border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <div className="font-medium text-gray-800">{suggestion.token}</div>
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

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
  linkStatus?: 'matched' | 'unmatched';
  suggestions?: Array<{ token: string; start: number; end: number; score: number }>;
}



interface IssueListItemProps {
  issue: Issue;
  canEdit: boolean;
  currentUserId?: string | null;
  expandedTypeIssueId: string | null;
  setExpandedTypeIssueId: (id: string | null) => void;
  suggestionPopoverIssueId: string | null;
  setSuggestionPopoverIssueId: (id: string | null) => void;
  onUpdateIssue: (issueId: string, updates: Partial<Issue>) => void;
  onDeleteIssue: (issueId: string) => void;
  onOpenDialog: (issueId: string) => void;
  onSelectSuggestion: (issueId: string, newText: string) => Promise<void> | void;
  getIssueTypeInfo: (type: Issue['type']) => { value: string; label: string; color: string; bgColor: string };
  formatDate: (dateString: string) => string;
}

const IssueListItem: React.FC<IssueListItemProps> = ({
  issue,
  canEdit,
  currentUserId,
  expandedTypeIssueId,
  setExpandedTypeIssueId,
  suggestionPopoverIssueId,
  setSuggestionPopoverIssueId,
  onUpdateIssue,
  onDeleteIssue,
  onOpenDialog,
  onSelectSuggestion,
  getIssueTypeInfo,
  formatDate,
}) => {
  const typeInfo = getIssueTypeInfo(issue.type);
  const commentCount = issue.commentCount || 0;
  const isIssueOwner = currentUserId ? currentUserId === issue.owner : false;
  const canDelete = canEdit && isIssueOwner;
  const canResolve = canEdit;

  const handleTypeClick = (issueId: string) => {
    if (expandedTypeIssueId === issueId) {
      setExpandedTypeIssueId(null);
    } else {
      setExpandedTypeIssueId(issueId);
    }
  };

  const handleTypeChange = (issueId: string, newType: Issue['type']) => {
    if (issue.type !== newType) {
      onUpdateIssue(issueId, { type: newType });
    }
    setExpandedTypeIssueId(null);
  };

  const handleToggleResolved = () => {
    onUpdateIssue(issue.id, { resolved: !issue.resolved });
  };

  const issueFlash = useIssueFlashIndicator(issue.id);

  return (
    <div
      key={issue.id}
      id={`issueitem-${issue.id}`}
      className={`border border-gray-200 rounded-lg mb-3 bg-white transition-all duration-200 hover:border-gray-400 hover:shadow-sm relative ${
        issue.resolved ? 'opacity-70 bg-gray-50' : ''
      }`}
    >
      <div className="p-3 flex items-center gap-3">
        {!issue.resolved && (
          <>
            {canEdit ? (
              <div className="relative flex-shrink-0">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeClick(issue.id);
                  }}
                  className={`inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase cursor-pointer transition-all duration-300 ease-out whitespace-nowrap ${
                    expandedTypeIssueId === issue.id ? 'ring-2 ring-gray-400 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: typeInfo.bgColor, color: typeInfo.color, border: `1px solid ${typeInfo.color}` }}
                  title="Click to change issue type"
                >
                  {typeInfo.label}
                </span>

                <div 
                  className="absolute top-0 left-full ml-1 z-50 overflow-hidden transition-all duration-300 ease-out flex items-center"
                  style={{
                    width: expandedTypeIssueId === issue.id ? '240px' : '0px',
                    opacity: expandedTypeIssueId === issue.id ? 1 : 0,
                    height: '100%'
                  }}
                >
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    {issueTypes
                      .filter(type => type.value !== issue.type)
                      .map((type) => (
                        <span
                          key={type.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTypeChange(issue.id, type.value as Issue['type']);
                          }}
                          className="inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase cursor-pointer hover:opacity-90 transition-all duration-300 ease-out whitespace-nowrap shadow-lg"
                          style={{ 
                            backgroundColor: type.bgColor, 
                            color: type.color, 
                            border: `1px solid ${type.color}`,
                            opacity: 1
                          }}
                          title={type.label}
                        >
                          {type.label}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <span
                className="inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase flex-shrink-0 whitespace-nowrap"
                style={{ backgroundColor: typeInfo.bgColor, color: typeInfo.color, border: `1px solid ${typeInfo.color}` }}
              >
                {typeInfo.label}
              </span>
            )}
          </>
        )}

        {issue.resolved && (
          <span className="inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase bg-green-600 text-white flex-shrink-0 whitespace-nowrap">
            RESOLVED
          </span>
        )}

        <div 
          className="flex-1 flex items-center gap-2 relative cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
          onClick={() => onOpenDialog(issue.id)}
          title="Click to view issue details and comments"
        >
          <span className={`text-sm ${issue.resolved ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
            {issue.text}
          </span>

          {!issue.resolved && issue.linkStatus === 'unmatched' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSuggestionPopoverIssueId(
                  suggestionPopoverIssueId === issue.id ? null : issue.id
                );
              }}
              className="p-1 rounded hover:bg-yellow-100 transition-colors"
              title="This issue text doesn't match any text in the editor. Click for suggestions."
            >
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </button>
          )}

          {commentCount > 0 && (
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-500">
              <MessageSquare className="w-3 h-3" />
              <span>{commentCount}</span>
            </div>
          )}

          {suggestionPopoverIssueId === issue.id && issue.suggestions && issue.suggestions.length > 0 && (
            <SuggestionPopover
              issueId={issue.id}
              suggestions={issue.suggestions}
              onSelectSuggestion={onSelectSuggestion}
              onClose={() => setSuggestionPopoverIssueId(null)}
            />
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
          <span>by {currentUserId && currentUserId === issue.owner ? 'me' : issue.ownerFriendly}</span>
          <span>{formatDate(issue.createdAt)}</span>

          {canResolve && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleResolved();
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                // Confirm before deleting
                const confirmed = window.confirm('Are you sure you want to delete this issue? This action cannot be undone.');
                if (confirmed) {
                  onDeleteIssue(issue.id);
                }
              }}
              className="ml-1 p-1.5 rounded-md border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 hover:text-red-700 transition-all duration-200"
              title="Delete issue"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {issueFlash && (
        <div
          className="absolute bottom-1 right-2 text-xs font-medium text-green-700 pointer-events-none z-20 bg-white bg-opacity-90 rounded px-1 py-0.5"
          style={{
            opacity: issueFlash.opacity,
            textShadow: issueFlash.isFlashing ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none',
            transition: `opacity ${FLASH_CONFIG.textFadeDuration}ms ${FLASH_CONFIG.textEasing}`
          }}
        >
          {issueFlash.username}
        </div>
      )}
    </div>
  );
};

interface IssuesPanelProps {
  selectedRegionId?: string;
  issues: Issue[];
  canEdit: boolean;
  onUpdateIssue: (issueId: string, updates: Partial<Issue>) => void;
  onDeleteIssue: (issueId: string) => void;
}

const issueTypes = [
  { value: 'needs-help', label: 'Needs Help', color: '#dc2626', bgColor: '#ffe6e6' },
  { value: 'indexing', label: 'Indexing', color: '#d97706', bgColor: '#fff9e6' },
  { value: 'new-word', label: 'New Word', color: '#166534', bgColor: '#f0fdf4' },
] as const;

export const IssuesPanel = ({
  selectedRegionId,
  issues,
  canEdit,
  onUpdateIssue,
  onDeleteIssue,
}: IssuesPanelProps) => {
  const user = useAuthStore((state) => state.user);
  const [showResolved, setShowResolved] = useState(false);
  const [expandedTypeIssueId, setExpandedTypeIssueId] = useState<string | null>(null);
  const [suggestionPopoverIssueId, setSuggestionPopoverIssueId] = useState<string | null>(null);
  const selectedIssueId = useEditorStore((s) => s.selectedIssueId ?? null);
  const setSelectedIssueId = useEditorStore((s) => s.setSelectedIssueId ?? (() => {}));
  const [dialogIssueId, setDialogIssueId] = useState<string | null>(selectedIssueId);
  const [isDialogOpen, setIsDialogOpen] = useState(!!selectedIssueId);

  // Sync store selectedIssueId with local dialog state
  useEffect(() => {
    if (selectedIssueId) {
      setDialogIssueId(selectedIssueId);
      setIsDialogOpen(true);
    } else {
      setIsDialogOpen(false);
      setDialogIssueId(null);
    }
  }, [selectedIssueId]);

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

  // Navigate to prev/next region that has unresolved issues
  const navigateIssueRegions = useNavigateIssueRegions();
  const handleNavigateIssues = (direction: 'prev' | 'next') => () => {
    navigateIssueRegions(direction);
  };

  // Create issue from current text selection
  const createIssueFromSelection = useCreateIssueFromSelection();
  const handleCreateFromSelection = async () => {
    try {
      await createIssueFromSelection();
    } catch (error) {
      console.error('Failed to create issue from selection:', error);
      // Could show a toast notification here in the future
    }
  };

  // Check if there's a text selection in the current region
  const regionSelection = useEditorStore(state => 
    selectedRegionId ? state.regionSelections[selectedRegionId] : null
  );
  const hasSelection = regionSelection && regionSelection.length > 0 && regionSelection.text.trim().length > 0;

  // handlers moved into IssueListItem to avoid dynamic hook ordering in the parent

  const handleSelectSuggestion = async (issueId: string, newText: string) => {
    try {
      await new UpdateIssueTextUseCase().execute({ issueId, newText });
      setSuggestionPopoverIssueId(null); // Close popover after successful update
    } catch (error) {
      console.error('Failed to update issue text:', error);
    }
  };

  const handleOpenDialog = (issueId: string) => {
    setDialogIssueId(issueId);
    setIsDialogOpen(true);
    setSelectedIssueId(issueId);
    browserService.setSelectedIssue(issueId);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setDialogIssueId(null);
    setSelectedIssueId(null);
    browserService.clearSelectedIssue();
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
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-lg font-semibold text-gray-800">Issues</h3>
          {(() => {
            // Count unmatched issues
            const unmatchedCount = filteredIssues.filter(issue => 
              !issue.resolved && issue.linkStatus === 'unmatched'
            ).length;
            
            if (unmatchedCount > 0) {
              return (
                <div title={`${unmatchedCount} issue${unmatchedCount > 1 ? 's' : ''} not matching editor text`}>
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                </div>
              );
            }
            return null;
          })()}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" title="Navigate regions with unresolved issues">
            <button
              onClick={handleNavigateIssues('prev')}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={handleNavigateIssues('next')}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </div>
          {canEdit && (
            <button
              disabled={!hasSelection}
              className={`py-1.5 px-3 border-none rounded text-sm font-medium transition-colors duration-200 ${
                hasSelection 
                  ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={hasSelection ? handleCreateFromSelection : undefined}
            >
              Create +
            </button>
          )}
        </div>
      </div>

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
          filteredIssues.map((issue) => (
            <IssueListItem
              key={issue.id}
              issue={issue}
              canEdit={canEdit}
              currentUserId={user?.userId ?? null}
              expandedTypeIssueId={expandedTypeIssueId}
              setExpandedTypeIssueId={setExpandedTypeIssueId}
              suggestionPopoverIssueId={suggestionPopoverIssueId}
              setSuggestionPopoverIssueId={setSuggestionPopoverIssueId}
              onUpdateIssue={onUpdateIssue}
              onDeleteIssue={onDeleteIssue}
              onOpenDialog={handleOpenDialog}
              onSelectSuggestion={handleSelectSuggestion}
              getIssueTypeInfo={getIssueTypeInfo}
              formatDate={formatDate}
            />
          ))
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

      {/* Issue Details Dialog */}
      {isDialogOpen && dialogIssueId && (
        <IssueDetailsDialog
          issueId={dialogIssueId}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onUpdateIssue={onUpdateIssue}
          onDeleteIssue={onDeleteIssue}
        />
      )}
    </div>
    </>
  );
};
