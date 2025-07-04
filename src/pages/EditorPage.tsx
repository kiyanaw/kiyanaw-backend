import { useParams } from 'react-router-dom';
import { useEffect } from 'react';

import { useEditorStore } from '../stores/useEditorStore';
import { useLoadTranscription } from '../hooks/useLoadTranscription';
import { useWavesurferEvents } from '../hooks/useWavesurferEvents';
import { browserService } from '../services/browserService';
import { wavesurferService } from '../services/wavesurferService';

import { WaveformPlayer } from '../components/player/WaveformPlayer';
import { RegionList } from '../components/regions/RegionList';
import { StationaryInspector } from '../components/inspector/StationaryInspector';

export const EditorPage = () => {
  const { id: transcriptionId } = useParams<{
    id: string;
  }>();
  
  useLoadTranscription(transcriptionId!);
  
  // Editor store selectors
  const transcription = useEditorStore((state) => state.transcription);
  const accessDenied = useEditorStore((state) => state.accessDenied);
  
  useWavesurferEvents(transcriptionId!, transcription?.source);
  const peaks = useEditorStore((state) => state.peaks);
  const regions = useEditorStore((state) => state.regions);
  const selectedRegion = useEditorStore((state) => state.selectedRegion);

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

  const isVideo = transcription?.isVideo

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Access Denied Overlay */}
      {accessDenied && (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
          <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to view this transcription. It may be private or you may not be listed as an editor or viewer.
            </p>
            <button 
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-ki-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

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
              peaks={peaks}
              canEdit={true}
              inboundRegion={''}
              regions={regions}
              isVideo={isVideo}
              title={transcription.title || ''}
              onRegionUpdate={() => {}}
              onLookup={() => {}}
              />
          </div>
        </div>
        </>
      )}

      {/* Main Editor Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Stationary Inspector */}
        <div className="flex-1 bg-white border-r border-gray-300 overflow-hidden flex flex-col">
          <StationaryInspector
            selectedRegion={selectedRegion}
          />
        </div>

        {/* Region List */}
        <div className="w-96 flex-shrink-0 bg-gray-50 border-l border-gray-300 flex flex-col min-h-0">
          <RegionList
            regions={regions}
            disableAnalyzer={transcription?.disableAnalyzer}
          />
        </div>
      </div>

    </div>
  );
};
