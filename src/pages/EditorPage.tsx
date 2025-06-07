import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEditorStore } from '../stores/useEditorStore';
import { useAuth } from '../hooks/useAuth';
import { eventBus } from '../lib/eventBus';
import { WaveformPlayer } from '../components/player/WaveformPlayer';
import { RegionList } from '../components/regions/RegionList';
import { StationaryInspector } from '../components/inspector/StationaryInspector';
import { getEditorData } from '../services/transcriptionService';

export const EditorPage = () => {
  const { id: transcriptionId, regionId } = useParams<{
    id: string;
    regionId?: string;
  }>();
  const { user } = useAuth();
  
  // Editor store selectors
  const transcription = useEditorStore((state) => state.transcription);
  const regions = useEditorStore((state) => state.regions);
  const selectedRegionId = useEditorStore((state) => state.selectedRegionId);
  const issues = useEditorStore((state) => state.issues);
  
  // Editor store actions
  const setData = useEditorStore((state) => state.setData);
  const cleanup = useEditorStore((state) => state.cleanup);
  const setSelectedRegion = useEditorStore((state) => state.setSelectedRegion);
  const createRegion = useEditorStore((state) => state.createRegion);
  const updateRegion = useEditorStore((state) => state.updateRegion);
  const updateTranscription = useEditorStore((state) => state.updateTranscription);
  const createIssue = useEditorStore((state) => state.createIssue);
  const updateIssue = useEditorStore((state) => state.updateIssue);
  const deleteIssue = useEditorStore((state) => state.deleteIssue);
  const addComment = useEditorStore((state) => state.addComment);

  // TanStack Query for data fetching
  const { 
    isLoading, 
    error: queryError, 
    data,
  } = useQuery({
    queryKey: ['editorData', transcriptionId],
    queryFn: () => getEditorData(transcriptionId!),
    enabled: !!transcriptionId, // Only run query if transcriptionId exists
    staleTime: Infinity, // Data is managed by DataStore subscriptions, so it's always fresh
    refetchOnWindowFocus: false,
  });

  // Effect to load data from query into the store
  useEffect(() => {
    if (data) {
      setData({
        transcription: data.transcription,
        regions: data.regions,
        issues: data.issues,
        source: data.source ?? undefined,
        peaks: data.peaks,
        isVideo: data.isVideo,
      });
    }
  }, [data, setData]);

  const [showLookup, setShowLookup] = useState(false);
  const [inboundRegion, setInboundRegion] = useState<string | null>(null);

  // Derived state from the store
  const isVideo = useEditorStore((state) => state.isVideo);
  const canEdit = useMemo(() => user !== null, [user]);
  const isTranscriptionAuthor = useEditorStore((state) => state.isTranscriptionAuthor(user));
  const selectedRegion = useEditorStore((state) => state.selectedRegion);
  const transcriptionSource = useEditorStore((state) => state.transcriptionSource);
  const transcriptionPeaks = useEditorStore((state) => state.transcriptionPeaks);
  const transcriptionTitle = useEditorStore((state) => state.transcriptionTitle);

  // Load transcription and regions once per transcriptionId
  useEffect(() => {
    if (!transcriptionId) return;

    // Cleanup on unmount or transcriptionId change
    return () => {
      cleanup();
    };
  }, [transcriptionId, cleanup]);

  // Handle inbound region from URL separately to avoid re-loading data
  useEffect(() => {
    if (regionId) {
      setInboundRegion(regionId);
    } else {
      setInboundRegion(null);
    }
  }, [regionId]);

  useEffect(() => {
    // Listen for events
    const handlePeaksError = () => {
      console.warn('Processing waveform data, wait a minute then try refreshing the page...');
    };

    const handleTranscriptionReady = () => {
      if (inboundRegion) {
        setSelectedRegion(inboundRegion);
      }
    };

    const handleWaveformReady = () => {
      // Waveform is ready
    };

    const handleRegionPlayRange = (data: unknown) => {
      const regionData = data as { start: number; end: number };
      console.log('🎵 Playing region range from editor:', regionData);
      // Forward to WaveformPlayer
      eventBus.emit('region-play-range-request', regionData);
    };

    eventBus.on('on-load-peaks-error', handlePeaksError);
    eventBus.on('transcription-ready', handleTranscriptionReady);
    eventBus.on('waveform-ready', handleWaveformReady);
    eventBus.on('region-play-range', handleRegionPlayRange);

    return () => {
      eventBus.off('on-load-peaks-error', handlePeaksError);
      eventBus.off('transcription-ready', handleTranscriptionReady);
      eventBus.off('waveform-ready', handleWaveformReady);
      eventBus.off('region-play-range', handleRegionPlayRange);
    };
  }, [inboundRegion, setSelectedRegion]);

  const handleRegionClick = useCallback(async (regionId: string) => {
    try {
      console.log('🎯 Region clicked:', regionId);
      
      // Clear inbound region to fix play button
      setInboundRegion(null);

      // Set selected region (this will trigger scroll in RegionList)
      setSelectedRegion(regionId);

      const region = regions.find((r) => r.id === regionId);
      if (region && !region.isNote) {
        console.log('🎵 Triggering audio playback for region:', regionId);
        // Trigger audio player to play this region (user-initiated)
        eventBus.emit('region-play', regionId);
      }

      // URL update is now handled in a separate useEffect
    } catch (error) {
      console.error('❌ Error handling region click:', error);
      // Don't let the error propagate and cause page reload
    }
  }, [regions, setSelectedRegion]);

  // Handle URL updates separately to avoid triggering re-renders during click handling
  useEffect(() => {
    if (selectedRegionId && transcriptionId) {
      const newPath = `/transcribe-edit/${transcriptionId}/${selectedRegionId}`;
      const currentPath = window.location.pathname;
      if (currentPath !== newPath) {
        // Use window.history.replaceState to avoid React Router re-renders
        window.history.replaceState({}, '', newPath);
      }
    }
  }, [selectedRegionId, transcriptionId]);

  const handleRegionUpdate = useCallback(async (regionUpdate: any) => {
    try {
      console.log('🎯 handleRegionUpdate called with:', regionUpdate);
      // Removed excessive logging to prevent render loops
      
      // Handle region updates from the waveform player
      const existingRegion = regions.find((r) => r.id === regionUpdate.id);

      if (!existingRegion) {
        // Create new region with minimal required fields
        const regionData = {
          start: regionUpdate.start,
          end: regionUpdate.end,
          id: regionUpdate.id,
          regionText: '', // Simple empty string for now
          isNote: false,
          userLastUpdated: user?.username || 'unknown',
        };
        console.log('🆕 Creating new region:', regionData);
        await createRegion(regionData);
      } else {
        // Update existing region - but only if it's a proper DataStore model
        console.log('📝 Updating existing region:', regionUpdate);
        console.log('📝 Existing region type:', typeof existingRegion, existingRegion.constructor?.name);
        
        // Only update if the region has proper DataStore model properties
        if (existingRegion && typeof existingRegion === 'object' && existingRegion.id) {
          await updateRegion(existingRegion.id, {
            start: regionUpdate.start,
            end: regionUpdate.end,
          });
        } else {
          console.warn('⚠️ Existing region is not a proper DataStore model, treating as new');
          const regionData = {
            start: regionUpdate.start,
            end: regionUpdate.end,
            id: regionUpdate.id,
            regionText: '',
            isNote: false,
            userLastUpdated: user?.username || 'unknown',
          };
          await createRegion(regionData);
        }
      }
    } catch (error) {
      console.error('❌ Error handling region update:', error);
      // Don't let the error propagate and cause issues
    }
  }, [regions, user, createRegion, updateRegion]);

  const handlePlayRegion = useCallback((regionId: string) => {
    // Trigger audio player to play specific region (user-initiated)
    eventBus.emit('region-play', regionId);
  }, []);

  const handleLookup = useCallback(() => {
    setShowLookup(true);
  }, []);

  // Handler for transcription metadata updates
  const handleTranscriptionUpdate = useCallback(async (updates: any) => {
    try {
      console.log('📝 Updating transcription:', updates);
      await updateTranscription(updates);
    } catch (error) {
      console.error('❌ Error updating transcription:', error);
    }
  }, [updateTranscription]);

  // Handler for region updates from the editor
  const handleRegionEditorUpdate = useCallback(async (regionId: string, updates: any) => {
    try {
      console.log('📝 Updating region from editor:', regionId, updates);
      await updateRegion(regionId, updates);
    } catch (error) {
      console.error('❌ Error updating region from editor:', error);
    }
  }, [updateRegion]);

  // Handler for region play from editor
  const handleRegionPlay = useCallback((start: number, end: number) => {
    console.log('🎵 Playing region from editor:', start, end);
    eventBus.emit('region-play-range', { start, end });
  }, []);

  // Handler for toggling region note status
  const handleRegionToggleNote = useCallback(async (regionId: string) => {
    try {
      const region = regions.find(r => r.id === regionId);
      if (region) {
        await updateRegion(regionId, { isNote: !region.isNote });
      }
    } catch (error) {
      console.error('❌ Error toggling region note:', error);
    }
  }, [regions, updateRegion]);

  // Handler for creating issues
  const handleRegionCreateIssue = useCallback((regionId: string, selectedText?: string, index?: number) => {
    console.log('🚨 Creating issue for region:', regionId, selectedText, index);
    // TODO: Implement issue creation when issues system is ready
  }, []);

  // Handler for deleting regions
  const handleRegionDelete = useCallback(async (regionId: string) => {
    try {
      // TODO: Implement region deletion when DataStore integration is ready
      console.log('🗑️ Deleting region:', regionId);
    } catch (error) {
      console.error('❌ Error deleting region:', error);
    }
  }, []);

  // Handler for showing create issue form
  const handleShowCreateIssueForm = useCallback(() => {
    console.log('📝 Showing create issue form');
    // TODO: Implement issue form display
  }, []);

  // Issue management handlers
  const handleIssueCreate = useCallback(async (issueData: any) => {
    await createIssue(issueData);
  }, [createIssue]);

  const handleIssueUpdate = useCallback(async (issueId: string, updates: any) => {
    await updateIssue(issueId, updates);
  }, [updateIssue]);

  const handleIssueDelete = useCallback(async (issueId: string) => {
    await deleteIssue(issueId);
  }, [deleteIssue]);

  const handleIssueAddComment = useCallback(async (issueId: string, comment: any) => {
    await addComment(issueId, comment);
  }, [addComment]);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Loading/Error/Not Found Overlay */}
      {(isLoading || queryError || (!isLoading && !data)) && (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-10 h-10 border-4 border-gray-300 border-t-ki-blue rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading transcription...</p>
            </div>
          )}
          {queryError && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <h2 className="text-red-600 text-2xl font-semibold mb-4">Error</h2>
              <p className="text-gray-600">{(queryError as Error).message}</p>
            </div>
          )}
          {!isLoading && !queryError && !data && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <h2 className="text-red-600 text-2xl font-semibold mb-4">Not Found</h2>
              <p className="text-gray-600">Transcription not found.</p>
            </div>
          )}
        </div>
      )}

      {/* Main Content (always rendered) */}
      
      {/* Waveform/Video Player Section */}
      <div className="flex-shrink-0 bg-gray-100 border-b border-gray-300">
        <div className="h-[223px] flex items-center justify-center">
          <WaveformPlayer
            source={transcriptionSource || ''}
            peaks={transcriptionPeaks}
            canEdit={canEdit}
            inboundRegion={inboundRegion}
            regions={regions}
            isVideo={isVideo}
            title={transcriptionTitle || ''}
            onRegionUpdate={handleRegionUpdate}
            onLookup={handleLookup}
          />
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Stationary Inspector */}
        <div className="flex-1 bg-white border-r border-gray-300 overflow-hidden flex flex-col">
          <StationaryInspector
            transcription={transcription}
            regions={regions}
            selectedRegion={selectedRegion}
            canEdit={canEdit}
            isTranscriptionAuthor={isTranscriptionAuthor}
            user={user}
            issues={issues}
            onTranscriptionUpdate={handleTranscriptionUpdate}
            onRegionUpdate={handleRegionEditorUpdate}
            onRegionPlay={handleRegionPlay}
            onRegionToggleNote={handleRegionToggleNote}
            onRegionCreateIssue={handleRegionCreateIssue}
            onRegionDelete={handleRegionDelete}
            onShowCreateIssueForm={handleShowCreateIssueForm}
            onIssueCreate={handleIssueCreate}
            onIssueUpdate={handleIssueUpdate}
            onIssueDelete={handleIssueDelete}
            onIssueAddComment={handleIssueAddComment}
          />
        </div>

        {/* Region List */}
        <div className="w-96 flex-shrink-0 bg-gray-50 border-l border-gray-300 flex flex-col min-h-0">
          <RegionList
            regions={regions}
            selectedRegionId={selectedRegionId}
            disableAnalyzer={transcription?.disableAnalyzer}
            onRegionClick={handleRegionClick}
            onPlayRegion={handlePlayRegion}
          />
        </div>
      </div>

      {/* Lookup Modal */}
      {showLookup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-[90%] text-center">
            <h3 className="text-gray-800 text-xl font-semibold mb-4">Dictionary Lookup</h3>
            <p className="text-gray-600 mb-6">Lookup modal will be implemented in Phase 13</p>
            <button
              onClick={() => setShowLookup(false)}
              className="mt-4 px-4 py-2 bg-ki-blue text-white border-none rounded hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
