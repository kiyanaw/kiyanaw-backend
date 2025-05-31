import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranscriptions } from '../hooks/useTranscriptions';
import { useRegions } from '../hooks/useRegions';
import { useAuth } from '../hooks/useAuth';
import { eventBus } from '../lib/eventBus';
import { WaveformPlayer } from '../components/player/WaveformPlayer';
import { RegionList } from '../components/regions/RegionList';
import { StationaryInspector } from '../components/inspector/StationaryInspector';

export const EditorPage = () => {
  const { id: transcriptionId, regionId } = useParams<{
    id: string;
    regionId?: string;
  }>();
  const { user } = useAuth();
  const {
    transcription,
    loadTranscription,
    loading: transcriptionLoading,
  } = useTranscriptions();
  const {
    regions,
    selectedRegionId,
    setSelectedRegion,
    loadRegions,
    createRegion,
    updateRegion,
    loading: regionsLoading,
  } = useRegions(transcriptionId);


  const [error, setError] = useState<string | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [inboundRegion, setInboundRegion] = useState<string | null>(null);
  const [issues, setIssues] = useState<any[]>([]);

  // Memoize computed values to prevent unnecessary re-renders
  const isVideo = useMemo(() => transcription?.type?.startsWith('video/'), [transcription?.type]);
  const canEdit = useMemo(() => user !== null, [user]);
  const isTranscriptionAuthor = useMemo(() => transcription?.author === user?.username, [transcription?.author, user?.username]);
  const loading = useMemo(() => transcriptionLoading || regionsLoading, [transcriptionLoading, regionsLoading]);
  const selectedRegion = useMemo(() => 
    regions.find(r => r.id === selectedRegionId) || null, 
    [regions, selectedRegionId]
  );

  // Memoize transcription props to prevent WaveformPlayer re-renders
  const transcriptionSource = useMemo(() => transcription?.source, [transcription?.source]);
  const transcriptionPeaks = useMemo(() => transcription?.peaks, [transcription?.peaks]);
  const transcriptionTitle = useMemo(() => transcription?.title, [transcription?.title]);

  // Load transcription and regions once per transcriptionId
  useEffect(() => {
    if (!transcriptionId) return;

    const loadData = async () => {
      try {
        const cleanup = await loadTranscription(transcriptionId);
        await loadRegions(transcriptionId);
        return cleanup;
      } catch (error) {
        console.error('Error loading transcription:', error);
        setError('Failed to load transcription');
      }
    };

    loadData();
  }, [transcriptionId, loadTranscription, loadRegions]);

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
      setError(
        'Processing waveform data, wait a minute then try refreshing the page...'
      );
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
          text: '', // Simple empty string for now
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
            text: '',
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
      // TODO: Implement transcription update logic when DataStore integration is ready
    } catch (error) {
      console.error('❌ Error updating transcription:', error);
    }
  }, []);

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
  const handleIssueCreate = useCallback((issue: any) => {
    setIssues(prev => [...prev, { ...issue, id: Date.now().toString() }]);
  }, []);

  const handleIssueUpdate = useCallback((issueId: string, updates: any) => {
    setIssues(prev => prev.map(issue => 
      issue.id === issueId ? { ...issue, ...updates } : issue
    ));
  }, []);

  const handleIssueDelete = useCallback((issueId: string) => {
    setIssues(prev => prev.filter(issue => issue.id !== issueId));
  }, []);

  const handleIssueAddComment = useCallback((issueId: string, comment: any) => {
    setIssues(prev => prev.map(issue => 
      issue.id === issueId 
        ? { ...issue, comments: [...(issue.comments || []), comment] }
        : issue
    ));
  }, []);

  if (loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-ki-blue rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Loading transcription...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <h2 className="text-red-600 text-2xl font-semibold mb-4">Error</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <h2 className="text-red-600 text-2xl font-semibold mb-4">Not Found</h2>
        <p className="text-gray-600">Transcription not found.</p>
      </div>
    );
  }

  console.log('📄 EditorPage rendering WaveformPlayer with:', {
    transcription: transcription,
    hasPeaks: !!transcription.peaks,
    peaksType: typeof transcription.peaks,
    peaksKeys: transcription.peaks ? Object.keys(transcription.peaks) : null,
    source: transcription.source
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Waveform/Video Player Section */}
      <div className="flex-shrink-0 bg-gray-100 border-b border-gray-300">
        <div className="h-[223px] flex items-center justify-center">
          <WaveformPlayer
            source={transcriptionSource}
            peaks={transcriptionPeaks}
            canEdit={canEdit}
            inboundRegion={inboundRegion}
            regions={regions}
            isVideo={isVideo}
            title={transcriptionTitle}
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
