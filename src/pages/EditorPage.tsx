import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useEditorStore } from '../stores/useEditorStore';
import { useTranscription } from '../hooks/useTranscription';
import { useWavesurferEvents } from '../hooks/useWavesurferEvents';
import { useAuthStore } from '../stores/useAuthStore';
import { eventBus } from '../lib/eventBus';
import { WaveformPlayer } from '../components/player/WaveformPlayer';
import { RegionList } from '../components/regions/RegionList';
import { StationaryInspector } from '../components/inspector/StationaryInspector';

export const EditorPage = () => {
  const { id: transcriptionId, regionId } = useParams<{
    id: string;
    regionId?: string;
  }>();
  
  console.log('editor')
  useTranscription(transcriptionId!);
  useWavesurferEvents(transcriptionId!);

  
  // const regions = []
  const selectedRegion = {}
  
  // Editor store selectors
  // const user = useAuthStore((state) => state.user);
  const transcription = useEditorStore((state) => state.transcription);
  const peaks = useEditorStore((state) => state.peaks);
  const regions = useEditorStore((state) => state.regions);
  

  const isVideo = transcription?.type?.startsWith('video/') ?? false
  // const selectedRegionId = useEditorStore((state) => state.selectedRegionId);
  // const issues = useEditorStore((state) => state.issues);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Loading/Error/Not Found Overlay */}
      {/* {(isLoading || queryError || (!isLoading && !transcription)) && ( */}
      {(!transcription) && (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-ki-blue rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading transcription...</p>
          </div>
        </div>
      )}

      {(transcription) && (
        <>
        {/* <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
          Got Transcription!
        </div> */}
        
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
          {/* <StationaryInspector
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
          /> */}
        </div>

        {/* Region List */}
        {/* <div className="w-96 flex-shrink-0 bg-gray-50 border-l border-gray-300 flex flex-col min-h-0">
          <RegionList
            regions={regions}
            selectedRegionId={selectedRegionId}
            disableAnalyzer={transcription?.disableAnalyzer}
            // onRegionClick={handleRegionClick}
            onPlayRegion={handlePlayRegion}
          />
        </div> */}
      </div>

    </div>
  );
};
