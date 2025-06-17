import { RegionEditor } from '../regions/RegionEditor';

interface StationaryInspectorProps {
  transcription: any;
  regions: any[];
  selectedRegion: any | null;
  canEdit: boolean;
  isTranscriptionAuthor?: boolean;
  user?: any;
  onTranscriptionUpdate: (updates: any) => void;
  onRegionUpdate: (regionId: string, updates: any) => void;
  onRegionPlay?: (start: number, end: number) => void;
  onRegionToggleNote?: (regionId: string) => void;
  onRegionCreateIssue?: (regionId: string, selectedText?: string, index?: number) => void;
  onRegionDelete?: (regionId: string) => void;
  onShowCreateIssueForm?: () => void;
  onIssueCreate: (issue: any) => void;
  onIssueUpdate: (issueId: string, updates: any) => void;
  onIssueDelete: (issueId: string) => void;
  onIssueAddComment: (issueId: string, comment: any) => void;
}

export const StationaryInspector = ({
  transcription,
  regions,
  selectedRegion,
  canEdit,
  isTranscriptionAuthor,
  user,
  onTranscriptionUpdate,
  onRegionUpdate,
  onRegionPlay,
  onRegionToggleNote,
  onRegionCreateIssue,
  onRegionDelete,
  onShowCreateIssueForm,
  onIssueCreate,
  onIssueUpdate,
  onIssueDelete,
  onIssueAddComment,
}: StationaryInspectorProps) => {
  // Render RegionEditor directly without tabs
  return (
    <div className="h-full flex flex-col bg-white border border-gray-300 rounded-lg overflow-hidden">
      {selectedRegion ? (
        <RegionEditor
          region={selectedRegion}
          canEdit={canEdit}
          isTranscriptionAuthor={isTranscriptionAuthor}
          transcription={transcription}
          user={user}
          onUpdate={onRegionUpdate}
          onPlay={onRegionPlay}
          onToggleNote={onRegionToggleNote}
          onCreateIssue={onRegionCreateIssue}
          onDeleteRegion={onRegionDelete}
          onShowCreateIssueForm={onShowCreateIssueForm}
        />
      ) : (
        <div className="h-full flex items-center justify-center py-10 px-5">
          <div className="text-center text-gray-600">
            <h3 className="m-0 mb-2 text-lg font-medium text-gray-400">No Region Selected</h3>
            <p className="m-0 text-sm leading-relaxed text-gray-300">Select a region from the list to edit its content.</p>
          </div>
        </div>
      )}
    </div>
  );
};
