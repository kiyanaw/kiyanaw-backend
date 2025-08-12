import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { useEditorStore } from '../stores/useEditorStore';
import { useLoadTranscription } from '../hooks/useLoadTranscription';
import { useWavesurferEvents } from '../hooks/useWavesurferEvents';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useUpdateTranscription } from '../hooks/useUpdateTranscription';
import { useAuthStore } from '../stores/useAuthStore';
import { useCreateIssue } from '../hooks/useCreateIssue';
import { useUpdateIssue } from '../hooks/useUpdateIssue';
import { useDeleteIssue } from '../hooks/useDeleteIssue';

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
  
  useLoadTranscription(transcriptionId!);
  useSubscriptions(transcriptionId!);
  
  // Editor store selectors
  const transcription = useEditorStore((state) => state.transcription);
  const accessDenied = useEditorStore((state) => state.accessDenied);
  const user = useAuthStore((state) => state.user);
  
  // Hooks for settings functionality
  const updateTranscription = useUpdateTranscription(transcriptionId!);
  
  // Issue management hooks
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();
  
  useWavesurferEvents(transcriptionId!, transcription?.source);
  const regions = useEditorStore((state) => state.regions);
  const selectedRegion = useEditorStore((state) => state.selectedRegion);
  const issues = useEditorStore((state) => state.issues);

  // Settings handlers
  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);
  const handleSaveChanges = (updates: { title?: string; comments?: string; isPrivate?: boolean; lang?: string }) => {
    updateTranscription(updates);
  };
  
  // Determine user permissions for this transcription
  const isOwner = transcription?.author === user?.userId;
  const isEditor = transcription?.editors?.includes(user?.userId || '') || false;
  const canEdit = isOwner || isEditor;
  
  // Issue management handlers
  const handleCreateIssue = async (issue: {
    text: string;
    type: 'needs-help' | 'indexing' | 'new-word' | 'general';
    owner: string;
    regionId?: string;
    resolved: boolean;
  }) => {
    if (!transcriptionId || !user?.userId) return;
    
    try {
      await createIssue({
        text: issue.text,
        type: issue.type,
        owner: user.userId,
        regionId: issue.regionId,
        transcriptionId: transcriptionId,
      });
    } catch (error) {
      console.error('Failed to create issue:', error);
    }
  };

  const handleUpdateIssue = async (issueId: string, updates: { resolved?: boolean; text?: string; type?: string }) => {
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

  const handleAddComment = async (issueId: string, comment: { text: string; author: string }) => {
    // For now, we'll add comments as issue updates
    // In the future, this could be expanded to use a proper comment system
    console.log('Add comment functionality not yet implemented:', { issueId, comment });
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
              onOpenSettings={handleOpenSettings}
            />
          </div>
        </div>
        </>
      )}

      {/* Main Editor Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Side Container */}
        <div className="flex-1 bg-white border-r border-gray-300 flex flex-col">
          {/* Stationary Inspector - Fixed Height */}
          <div className="h-[500px] overflow-hidden flex flex-col border-b border-gray-300">
            <StationaryInspector
              selectedRegion={selectedRegion}
            />
          </div>
          
          {/* Issues Panel Area - Takes remaining space */}
          <div className="flex-1 overflow-auto">
            {transcription && (
              <>
                <IssuesPanel
                  selectedRegionId={selectedRegion?.id}
                  issues={issues.map(issue => ({
                    id: issue.id,
                    text: issue.text,
                    type: issue.type as 'needs-help' | 'indexing' | 'new-word',
                    owner: issue.owner, // Use actual owner UUID for permission checking
                    ownerFriendly: issue.ownerFriendly,
                    regionId: issue.regionId,
                    resolved: issue.resolved || false,
                    createdAt: issue.createdAt || new Date().toISOString(),
                    updatedAt: issue.updatedAt || new Date().toISOString(),
                    commentCount: issue.commentCount || 0,
                  }))}
                  canEdit={canEdit}
                  onCreateIssue={handleCreateIssue}
                  onUpdateIssue={handleUpdateIssue}
                  onDeleteIssue={handleDeleteIssue}
                />
              </>
            )}
          </div>
        </div>

        {/* Region List */}
        <div className="w-96 flex-shrink-0 bg-gray-50 border-l border-gray-300 flex flex-col min-h-0">
          <RegionList
            regions={regions}
            disableAnalyzer={transcription?.disableAnalyzer}
          />
        </div>
      </div>

      {/* Settings Page Overlay */}
      {isSettingsOpen && transcription && (
        <div className="absolute inset-0 z-50">
          <TranscriptionSettingsPage
            title={transcription.title || ''}
            comments={transcription.comments}
            author={transcription.authorFriendly || 'Unknown'}
            dateLastUpdated={transcription.dateLastUpdated || '0'}
            regionCount={regions.length}
            transcriptionId={transcription.id || ''}
            isPrivate={transcription.isPrivate}
                            lang={transcription.lang}
            onSave={handleSaveChanges}
            onBack={handleCloseSettings}
            isOwner={isOwner}
          />
        </div>
      )}

    </div>
  );
};
