import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranscriptions } from '../hooks/useTranscriptions';
import { useRegions } from '../hooks/useRegions';
import { useAuth } from '../hooks/useAuth';
import { eventBus } from '../lib/eventBus';
import { WaveformPlayer } from '../components/player/WaveformPlayer';
import { RegionList } from '../components/regions/RegionList';

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
    createRegion,
    updateRegion,
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
      createRegion(regionData);
    } else {
      // Update existing region - but only if it's a proper DataStore model
      console.log('📝 Updating existing region:', regionUpdate);
      console.log('📝 Existing region type:', typeof existingRegion, existingRegion.constructor?.name);
      
      // Only update if the region has proper DataStore model properties
      if (existingRegion && typeof existingRegion === 'object' && existingRegion.id) {
        updateRegion(existingRegion.id, {
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
        createRegion(regionData);
      }
    }
  };

  const handlePlayRegion = (regionId: string) => {
    // Trigger audio player to play specific region
    eventBus.emit('region-in', regionId);
  };

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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Waveform/Video Player Section */}
      <div className="flex-shrink-0 bg-gray-100 border-b border-gray-300">
        <div className="h-[223px] flex items-center justify-center">
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
      <div className="flex flex-1 overflow-hidden">
        {/* Stationary Inspector */}
        <div className="flex-1 bg-white border-r border-gray-300 overflow-hidden flex flex-col">
          {/* TODO: Implement StationaryInspector component */}
          <div className="p-8 text-center">
            <h4 className="text-gray-800 text-lg font-semibold mb-4">Stationary Inspector</h4>
            <p className="text-gray-600 mb-2">Inspector tabs will be implemented in Phase 10</p>
            <p className="text-gray-600 mb-4">Selected Region: {selectedRegionId || 'None'}</p>
            <button 
              onClick={() => setShowLookup(!showLookup)}
              className="mt-4 px-4 py-2 bg-ki-blue text-white border-none rounded hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Toggle Lookup
            </button>
          </div>
        </div>

        {/* Region List */}
        <div className="w-96 flex-shrink-0 bg-gray-50 border-l border-gray-300 flex flex-col">
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
