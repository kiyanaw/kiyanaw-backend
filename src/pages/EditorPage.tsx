import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranscriptions } from '../hooks/useTranscriptions';
import { useRegions } from '../hooks/useRegions';
import { useAuth } from '../hooks/useAuth';
import { eventBus } from '../lib/eventBus';
import { WaveformPlayer } from '../components/player/WaveformPlayer';
import { RegionList } from '../components/regions/RegionList';
import './EditorPage.css';

export const EditorPage = () => {
  const { id: transcriptionId, regionId } = useParams<{
    id: string;
    regionId?: string;
  }>();
  const navigate = useNavigate();
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
    loading: regionsLoading,
  } = useRegions(transcriptionId);


  const [error, setError] = useState<string | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [inboundRegion, setInboundRegion] = useState<string | null>(null);



  const loading = transcriptionLoading || regionsLoading;

  useEffect(() => {
    if (!transcriptionId) return;

    // Load transcription and regions
    const loadData = async () => {
      try {
        const cleanup = await loadTranscription(transcriptionId);
        await loadRegions(transcriptionId);

        // Set inbound region from URL
        if (regionId) {
          setInboundRegion(regionId);
        }

        return cleanup;
      } catch (error) {
        console.error('Error loading transcription:', error);
        setError('Failed to load transcription');
      }
    };

    loadData();
  }, [transcriptionId, regionId, loadTranscription, loadRegions]);

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

    eventBus.on('on-load-peaks-error', handlePeaksError);
    eventBus.on('transcription-ready', handleTranscriptionReady);
    eventBus.on('waveform-ready', handleWaveformReady);

    return () => {
      eventBus.off('on-load-peaks-error', handlePeaksError);
      eventBus.off('transcription-ready', handleTranscriptionReady);
      eventBus.off('waveform-ready', handleWaveformReady);
    };
  }, [inboundRegion, setSelectedRegion]);

  const handleRegionClick = (regionId: string) => {
    // Clear inbound region to fix play button
    setInboundRegion(null);

    setSelectedRegion(regionId);

    const region = regions.find((r) => r.id === regionId);
    if (region && !region.isNote) {
      // Trigger audio player to play this region
      eventBus.emit('region-in', regionId);
    }

    // Update URL
    const newPath = `/transcribe-edit/${transcriptionId}/${regionId}`;
    navigate(newPath, { replace: true });
  };

  const handleRegionUpdate = (regionUpdate: any) => {
    // Handle region updates from the waveform player
    const existingRegion = regions.find((r) => r.id === regionUpdate.id);

    if (!existingRegion) {
      // Create new region
      const regionData = {
        start: regionUpdate.start,
        end: regionUpdate.end,
        id: regionUpdate.id,
        text: '[]', // Empty Quill delta
        issues: '[]',
        isNote: false,
      };
      console.log('Creating new region:', regionData);
      // TODO: Implement region creation
    } else {
      // Update existing region
      console.log('Updating region:', regionUpdate);
      // TODO: Implement region update
    }
  };

  const handlePlayRegion = (regionId: string) => {
    // Trigger audio player to play specific region
    eventBus.emit('region-in', regionId);
  };

  if (loading && !error) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner"></div>
        <p>Loading transcription...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="editor-error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="editor-error">
        <h2>Not Found</h2>
        <p>Transcription not found.</p>
      </div>
    );
  }

  const isVideo = transcription.type?.startsWith('video/');
  const canEdit = user !== null;

  console.log('📄 EditorPage rendering WaveformPlayer with:', {
    transcription: transcription,
    hasPeaks: !!transcription.peaks,
    peaksType: typeof transcription.peaks,
    peaksKeys: transcription.peaks ? Object.keys(transcription.peaks) : null,
    source: transcription.source
  });

  return (
    <div className="editor-container">
      {/* Waveform/Video Player Section */}
      <div className="audio-container">
        <div className="audio-player">
          <WaveformPlayer
            source={transcription.source}
            peaks={transcription.peaks}
            canEdit={canEdit}
            inboundRegion={inboundRegion}
            regions={regions}
            isVideo={isVideo}
            title={transcription.title}
            onRegionUpdate={handleRegionUpdate}
            onLookup={() => setShowLookup(true)}
          />
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="editor-layout">
        {/* Stationary Inspector */}
        <div className="stationary-editor">
          {/* TODO: Implement StationaryInspector component */}
          <div className="inspector-placeholder">
            <h4>Stationary Inspector</h4>
            <p>Inspector tabs will be implemented in Phase 10</p>
            <p>Selected Region: {selectedRegionId || 'None'}</p>
            <button onClick={() => setShowLookup(!showLookup)}>
              Toggle Lookup
            </button>
          </div>
        </div>

        {/* Region List */}
        <div className="region-list-container">
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
        <div className="lookup-modal">
          <div className="lookup-content">
            <h3>Dictionary Lookup</h3>
            <p>Lookup modal will be implemented in Phase 13</p>
            <button onClick={() => setShowLookup(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
