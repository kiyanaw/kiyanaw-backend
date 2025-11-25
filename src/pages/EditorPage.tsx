import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';

import { useEditorStore } from '../stores/useEditorStore';
import { useLoadTranscription } from '../hooks/useLoadTranscription';
import { useWavesurferEvents } from '../hooks/useWavesurferEvents';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useUpdateTranscription } from '../hooks/useUpdateTranscription';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigationGuard } from '../hooks/useNavigationGuard';

import { useUpdateIssue } from '../hooks/useUpdateIssue';
import { useDeleteIssue } from '../hooks/useDeleteIssue';
import { canEdit, isAuthor } from '../lib/permissions';
import { TranscriptionModel, type IssueType } from '../services/adt';

import { browserService } from '../services/browserService';
import { wavesurferService } from '../services/wavesurferService';

import { WaveformPlayer } from '../components/player/WaveformPlayer';
import { RegionList } from '../components/regions/RegionList';
import { StationaryInspector } from '../components/inspector/StationaryInspector';
import { TranscriptionSettingsPage } from '../components/forms/TranscriptionSettingsPage';
import { IssuesPanel } from '../components/issues/IssuesPanel';

export const EditorPage = () => {
  const { id: transcriptionId } = useParams<{
    id: string;
  }>();
  
  const navigate = useNavigate();
  
  // Settings page state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'editor' | 'regions' | 'issues'>('regions');
  
  // Issue type filter state (all enabled by default)
  const [enabledIssueTypes, setEnabledIssueTypes] = useState<Set<IssueType>>(
    new Set(['needs-help', 'indexing', 'new-word'])
  );
  
  // Issue search state
  const [issueSearchText, setIssueSearchText] = useState('');
  
  // Mobile swipe handling
  const handleTouchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchMove = useRef<{ x: number; y: number } | null>(null);
  
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleTouchStart.current = { x: touch.clientX, y: touch.clientY };
    handleTouchMove.current = null;
  };
  
  const onTouchMove = (e: React.TouchEvent) => {
    if (!handleTouchStart.current) return;
    const touch = e.touches[0];
    handleTouchMove.current = { x: touch.clientX, y: touch.clientY };
  };
  
  const onTouchEnd = () => {
    if (!handleTouchStart.current || !handleTouchMove.current) {
      handleTouchStart.current = null;
      handleTouchMove.current = null;
      return;
    }
    
    const deltaX = handleTouchMove.current.x - handleTouchStart.current.x;
    const deltaY = handleTouchMove.current.y - handleTouchStart.current.y;
    
    // Only process horizontal swipes (ignore if more vertical than horizontal)
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      handleTouchStart.current = null;
      handleTouchMove.current = null;
      return;
    }
    
    // Require minimum swipe distance
    const minSwipeDistance = 50;
    if (Math.abs(deltaX) < minSwipeDistance) {
      handleTouchStart.current = null;
      handleTouchMove.current = null;
      return;
    }
    
    // Handle swipe based on current tab and direction
    if (deltaX > 0) {
      // Swipe right
      if (mobileTab === 'issues') {
        setMobileTab('regions');
      } else if (mobileTab === 'regions') {
        setMobileTab('editor');
      }
    } else {
      // Swipe left
      if (mobileTab === 'editor') {
        setMobileTab('regions');
      } else if (mobileTab === 'regions') {
        setMobileTab('issues');
      }
    }
    
    handleTouchStart.current = null;
    handleTouchMove.current = null;
  };
  
  useLoadTranscription(transcriptionId!);
  useSubscriptions(transcriptionId!);
  useNavigationGuard(); // Warns on browser close/refresh if pending saves
  
  // Editor store selectors
  const transcription = useEditorStore((state) => state.transcription);
  const accessDenied = useEditorStore((state) => state.accessDenied);
  const user = useAuthStore((state) => state.user);
  
  // Hooks for settings functionality
  const updateTranscription = useUpdateTranscription(transcriptionId!);
  
  // Issue management hooks
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();
  
  useWavesurferEvents(transcriptionId!, transcription?.source);
  const regions = useEditorStore((state) => state.regions);
  const selectedRegion = useEditorStore((state) => state.selectedRegion);
  const issues = useEditorStore((state) => state.issues);
  // Subscribe to the full maps (stable references); index by selectedRegionId below to avoid infinite loops
  const issueLinkStatusesByRegion = useEditorStore((state) => state.issueLinkStatusesByRegion);
  const issueSuggestionsByRegion = useEditorStore((state) => state.issueSuggestionsByRegion);

  // Settings handlers
  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);
  const handleSaveChanges = (updates: { title?: string; comments?: string; isPrivate?: boolean; publicIssues?: boolean; lang?: string }) => {
    updateTranscription(updates);
  };
  
  // Issue type filter handlers
  const toggleIssueType = (type: IssueType) => {
    setEnabledIssueTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Don't allow disabling all types
        if (next.size > 1) {
          next.delete(type);
        }
      } else {
        next.add(type);
      }
      return next;
    });
  };
  
  const resetFilters = () => {
    setEnabledIssueTypes(new Set(['needs-help', 'indexing', 'new-word']));
    setIssueSearchText('');
  };

  const handleDeleteTranscription = () => {
    // Add a 4 second pause before navigating
    setTimeout(() => {
      // Navigate back to the transcription list after deletion
      navigate('/transcribe-list/');
    }, 4000);
  };
  
  // Determine user permissions for this transcription
  const userCanEdit = canEdit(transcription, user);
  const isOwner = isAuthor(transcription, user);
  
  // Filter issues by enabled types and search text (only when no region selected)
  const getFilteredIssues = () => {
    if (!issues) return [];
    
    return issues
      .filter(issue => {
        // Filter by type
        if (!enabledIssueTypes.has(issue.type as IssueType)) {
          return false;
        }
        
        // Filter by search text
        if (issueSearchText.trim()) {
          const searchLower = issueSearchText.toLowerCase();
          return issue.text.toLowerCase().includes(searchLower);
        }
        
        return true;
      })
      .map(issue => {
        const linkStatus = selectedRegion?.id
          ? issueLinkStatusesByRegion[selectedRegion.id]?.[issue.id]
          : undefined;
        const suggestions = selectedRegion?.id
          ? issueSuggestionsByRegion[selectedRegion.id]?.[issue.id]
          : undefined;

        return {
          id: issue.id,
          text: issue.text,
          type: issue.type as IssueType,
          owner: issue.owner,
          ownerFriendly: issue.ownerFriendly,
          regionId: issue.regionId,
          resolved: issue.resolved || false,
          createdAt: issue.createdAt || new Date().toISOString(),
          updatedAt: issue.updatedAt || new Date().toISOString(),
          commentCount: issue.commentCount || 0,
          linkStatus,
          suggestions,
        };
      });
  };
  
  // Issue management handlers
  const handleUpdateIssue = async (issueId: string, updates: { resolved?: boolean; text?: string; type?: IssueType }) => {
    try {
      await updateIssue({
        issueId,
        updates,
      });
    } catch (error) {
      console.error('Failed to update issue:', error);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    try {
      await deleteIssue({ issueId });
    } catch (error) {
      console.error('Failed to delete issue:', error);
    }
  };

  // Redirect to 404 if access is denied
  useEffect(() => {
    if (accessDenied) {
      navigate('/404', { replace: true });
    }
  }, [accessDenied, navigate]);

  // THE ONLY TIME USEEFFECT IS ALLOWED, TO RETURN A CLEAN UP FUNCTION
  useEffect(() => {
    return () => {
      // Clear editor store state
      const store = useEditorStore.getState();
      store.cleanup();
      // Clear any remaining region highlighting styles
      browserService.clearAllCustomStyles();
      // Destroy the wavesurfer instance and reset the service state
      wavesurferService.destroy();
    };
  }, []);

  const isVideo = transcription?.isVideo ?? false

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Access denied handled */}

      {/* Loading Overlay */}
      {(!transcription && !accessDenied) && (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-ki-blue rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading transcription...</p>
          </div>
        </div>
      )}

      {(transcription) && (
        <>
        {/* Waveform/Video Player Section */}
        <div className="flex-shrink-0 bg-gray-100 border-b border-gray-300">
          <div className="h-[223px] flex items-center justify-center">
            <WaveformPlayer
              source={transcription.source || ''}
              inboundRegion={''}
              regions={regions}
              isVideo={isVideo}
              title={transcription.title || ''}
              transcriptionId={transcriptionId!}
              onOpenSettings={handleOpenSettings}
            />
          </div>
        </div>
        </>
      )}

      {/* Desktop Layout - Hidden on Mobile */}
      <div className="hidden lg:flex flex-1 overflow-hidden min-h-0">
        {/* Left Side Container */}
        <div className="flex-1 bg-white border-r border-gray-300 flex flex-col">
          {/* Stationary Inspector - 50% height */}
          <div className="h-1/2 overflow-hidden flex flex-col border-b border-gray-300">
            <StationaryInspector
              selectedRegion={selectedRegion}
            />
          </div>
          
          {/* Issues Panel Area - 50% height */}
          <div className="h-1/2 overflow-hidden flex flex-col">
            {transcription && (
              <>
                <IssuesPanel
                  selectedRegionId={selectedRegion?.id}
                  issues={getFilteredIssues()}
                  canEdit={userCanEdit}
                  onUpdateIssue={handleUpdateIssue}
                  onDeleteIssue={handleDeleteIssue}
                  enabledIssueTypes={enabledIssueTypes}
                  onToggleIssueType={toggleIssueType}
                  searchText={issueSearchText}
                  onSearchChange={setIssueSearchText}
                  onResetFilters={resetFilters}
                />
              </>
            )}
          </div>
        </div>

        {/* Region List */}
        <div className="w-[500px] flex-shrink-0 bg-gray-50 border-l border-gray-300 flex flex-col min-h-0" id="desktop-regions-container">
          <RegionList
            regions={regions}
            disableAnalyzer={transcription?.disableAnalyzer}
          />
        </div>
      </div>

      {/* Mobile Layout - Visible on Mobile Only */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        {/* Mobile Tab Content */}
        <div 
          className="flex-1 min-h-0 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {mobileTab === 'editor' && (
            <div className="h-full overflow-hidden">
              <StationaryInspector
                selectedRegion={selectedRegion}
              />
            </div>
          )}
          
          {mobileTab === 'regions' && (
            <div className="h-full min-h-0" id="mobile-regions-container">
              <RegionList
                regions={regions}
                disableAnalyzer={transcription?.disableAnalyzer}
              />
            </div>
          )}
          
          {mobileTab === 'issues' && transcription && (
            <div className="h-full overflow-hidden flex flex-col">
              <IssuesPanel
                selectedRegionId={selectedRegion?.id}
                issues={getFilteredIssues()}
                canEdit={userCanEdit}
                onUpdateIssue={handleUpdateIssue}
                onDeleteIssue={handleDeleteIssue}
                variant="bottom-sheet"
                onJumpToRegion={() => setMobileTab('regions')}
                enabledIssueTypes={enabledIssueTypes}
                onToggleIssueType={toggleIssueType}
                searchText={issueSearchText}
                onSearchChange={setIssueSearchText}
                onResetFilters={resetFilters}
              />
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-2">
          <div className="flex justify-center gap-1">
            <button
              onClick={() => setMobileTab('editor')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
                mobileTab === 'editor'
                  ? 'bg-ki-blue text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setMobileTab('regions')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
                mobileTab === 'regions'
                  ? 'bg-ki-blue text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Regions
            </button>
            <button
              onClick={() => setMobileTab('issues')}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
                mobileTab === 'issues'
                  ? 'bg-ki-blue text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Issues
            </button>
          </div>
        </div>
      </div>

      {/* Settings Page Overlay */}
      {isSettingsOpen && transcription && (
        <div className="absolute inset-0 z-50">
          <TranscriptionSettingsPage
            transcription={new TranscriptionModel(transcription)}
            regionCount={regions.length}
            issueCount={issues.length}
            regions={regions}
            onSave={handleSaveChanges}
            onBack={handleCloseSettings}
            onDelete={handleDeleteTranscription}
            isOwner={isOwner}
          />
        </div>
      )}

    </div>
  );
};
