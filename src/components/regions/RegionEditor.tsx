import { useState, useEffect, useRef, useMemo, memo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import debounce from 'lodash.debounce';

// Import quill-cursors for collaborative editing
import QuillCursors from 'quill-cursors';
Quill.register('modules/cursors', QuillCursors);

// Simple approach: Register custom formats as CSS classes only for now
// This avoids the complex Quill format registration TypeScript issues
const customFormats = [
  'known-word',
  'ignore-word', 
  'issue-needs-help',
  'issue-indexing',
  'issue-new-word',
  'suggestion',
  'suggestion-known'
];

// Add CSS for custom formats
const customFormatStyles = `
  .known-word { color: #3b82f6; }
  .ignore-word { color: #777; }
  .issue-needs-help { background-color: #ffe6e6; }
  .issue-indexing { background-color: #fff9e6; }
  .issue-new-word { background-color: #e6f3ff; }
  .suggestion { text-decoration: underline; text-decoration-color: #f97316; }
  .suggestion-known { text-decoration: underline; text-decoration-color: #3b82f6; }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('quill-custom-formats')) {
  const style = document.createElement('style');
  style.id = 'quill-custom-formats';
  style.textContent = customFormatStyles;
  document.head.appendChild(style);
}

interface Region {
  id: string;
  start: number;
  end: number;
  regionText?: string; // Plain text content
  translation?: string;
  isNote?: boolean;
  issues?: any[];
}

interface RegionEditorProps {
  region: Region;
  canEdit: boolean;
  isTranscriptionAuthor?: boolean;
  transcription?: any;
  user?: any;
  onUpdate: (regionId: string, updates: Partial<Region>) => void;
  onPlay?: (start: number, end: number) => void;
  onToggleNote?: (regionId: string) => void;
  onCreateIssue?: (regionId: string, selectedText?: string, index?: number) => void;
  onDeleteRegion?: (regionId: string) => void;
  onShowCreateIssueForm?: () => void;
}

// Save state management
interface SaveState {
  DS_OUTBOX_BUSY: boolean;
  REGION_INTERMEDIARY: { id: string | null };
  SAVE_RETRY: number;
}

const saveState: SaveState = {
  DS_OUTBOX_BUSY: false,
  REGION_INTERMEDIARY: { id: null },
  SAVE_RETRY: 25
};

export const RegionEditor = memo(({
  region,
  canEdit,
  isTranscriptionAuthor = false,
  transcription,
  user,
  onUpdate,
  onPlay,
  onToggleNote,
  onCreateIssue,
  onDeleteRegion,
  onShowCreateIssueForm,
}: RegionEditorProps) => {
  const [activeTab, setActiveTab] = useState<'main' | 'translation'>('main');
  const [selectedRange, setSelectedRange] = useState<{ index: number; length: number; text: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mainEditorRef = useRef<ReactQuill>(null);
  const translationEditorRef = useRef<ReactQuill>(null);

  // Permissions
  const disableInputs = !transcription?.editors?.includes(user?.name);
  const canDelete = isTranscriptionAuthor && canEdit;

  // Configure Quill modules
  const mainEditorModules = useMemo(() => ({
    toolbar: false, // Custom toolbar
    cursors: {
      hideDelayMs: 5000,
      transformOnTextChange: true
    },
    clipboard: {
      matchVisual: false,
    },
  }), []);

  const translationEditorModules = useMemo(() => ({
    toolbar: false, // Custom toolbar
    clipboard: {
      matchVisual: false,
    },
  }), []);

  const mainEditorFormats = [
    'bold', 'italic', 'underline', 'color', 'background'
  ];

  const translationEditorFormats: string[] = []; // Plain text only



  // Handle main editor content changes
  const handleMainEditorChange = () => {
  };

  // Handle translation editor content changes  
  const handleTranslationChange = () => {};

  // Handle selection changes for toolbar state
  const handleSelectionChange = () => {};

  // Toolbar actions
  const handlePlay = () => {};

  const handleToggleNote = () => {};

  const handleCreateIssue = () => {};

  const handleIgnoreWord = () => {

  };

  const handleClearFormat = () => {

  };

  const handleDeleteRegion = () => {

  };


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  if (!region) {
    return (
      <div className="h-full flex items-center justify-center py-10 px-5">
        <div className="text-center text-gray-600">
          <h2 className="m-0 mb-2 text-lg font-medium text-gray-400">Please select a region</h2>
          <p className="m-0 text-sm leading-relaxed text-gray-300">Choose a region from the list to edit its content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* Header with region info and toolbar */}
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
        <div>
          <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">Region #{region.displayIndex}</h3>
          <span className="text-sm text-gray-500 font-mono">
            {formatTime(region.start)} - {formatTime(region.end)}
          </span>
          {region.isNote && <span className="inline-block ml-2 py-0.5 px-2 bg-yellow-400 text-gray-800 rounded-xl text-xs font-medium">Note</span>}
        </div>

        {/* Custom Toolbar */}
        <div className="flex gap-2">
          <button
            className={`flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${
              isPlaying ? 'bg-green-600 text-white border-green-600' : ''
            }`}
            onClick={handlePlay}
            disabled={!onPlay}
            title="Play region"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          {canEdit && (
            <>
              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-cyan-600 hover:text-white hover:border-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleToggleNote}
                disabled={disableInputs}
                title={region.isNote ? 'Convert to transcription' : 'Convert to note'}
              >
                📝
              </button>

              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-yellow-400 hover:text-gray-800 hover:border-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCreateIssue}
                disabled={disableInputs}
                title="Create issue"
              >
                ⚠️
              </button>

              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-purple-600 hover:text-white hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleIgnoreWord}
                disabled={disableInputs || !selectedRange || activeTab !== 'main'}
                title="Ignore word"
              >
                👁️‍🗨️
              </button>

              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-orange-500 hover:text-white hover:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleClearFormat}
                disabled={disableInputs || !selectedRange}
                title="Clear format"
              >
                🚫
              </button>

              {canDelete && (
                <button
                  className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDeleteRegion}
                  title="Delete region"
                >
                  🗑️
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 border-b border-gray-300">
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'main'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('main')}
        >
          Original Text
        </button>
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
            activeTab === 'translation'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('translation')}
        >
          Translation
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'main' && !region.isNote && (
          <div className="h-full">
            <ReactQuill
              ref={mainEditorRef}
              theme="snow"
              modules={mainEditorModules}
              formats={mainEditorFormats}
              onChange={handleMainEditorChange}
              onChangeSelection={handleSelectionChange}
              readOnly={disableInputs}
              placeholder="Enter original text..."
              style={{ height: '100%', backgroundColor: 'white' }}
            />
          </div>
        )}

        {activeTab === 'translation' && (
          <div className="h-full" style={{ backgroundColor: '#f5f5f5' }}>
            <ReactQuill
              ref={translationEditorRef}
              theme="snow"
              modules={translationEditorModules}
              formats={translationEditorFormats}
              onChange={handleTranslationChange}
              readOnly={disableInputs}
              placeholder="Enter translation..."
              style={{ height: '100%', backgroundColor: '#f5f5f5' }}
            />
          </div>
        )}

        {region.isNote && (
          <div className="h-full flex items-center justify-center p-4" style={{ backgroundColor: '#fcfaf0' }}>
            <div className="text-center text-gray-600">
              <h4 className="m-0 mb-2 text-md font-medium">Note Region</h4>
              <p className="m-0 text-sm">Notes only show translation content.</p>
            </div>
          </div>
        )}
      </div>

      {/* Issues Footer */}
      {region.issues && region.issues.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="m-0 mb-2 text-sm font-semibold text-gray-700">Issues ({region.issues.length})</h4>
          <div className="flex flex-wrap gap-1.5">
            {region.issues.map((issue: any, index: number) => (
              <span
                key={index}
                className={`inline-block py-0.5 px-2 rounded-xl text-xs font-medium uppercase ${
                  issue.type === 'needs-help' ? 'bg-red-600 text-white' :
                  issue.type === 'indexing' ? 'bg-yellow-400 text-gray-800' :
                  issue.type === 'new-word' ? 'bg-cyan-600 text-white' :
                  'bg-gray-500 text-white'
                }`}
              >
                {issue.type || 'issue'}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
});
