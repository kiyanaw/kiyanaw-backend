import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Region {
  id: string;
  start: number;
  end: number;
  displayIndex: number;
  text?: string;
  translation?: string;
  isNote?: boolean;
  issues?: any[];
}

interface RegionEditorProps {
  region: Region;
  canEdit: boolean;
  onUpdate: (regionId: string, updates: Partial<Region>) => void;
  onPlay?: (start: number, end: number) => void;
  onToggleNote?: (regionId: string) => void;
  onCreateIssue?: (regionId: string) => void;
  onDeleteRegion?: (regionId: string) => void;
}

// Custom Quill formats for linguistic annotation
const customFormats = [
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'script',
  'font',
  'size',
  'header',
  'blockquote',
  'code-block',
  'list',
  'bullet',
  'indent',
  'direction',
  'align',
  'link',
  'image',
  'video',
  'clean',
];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['link', 'clean'],
  ],
  clipboard: {
    matchVisual: false,
  },
};

export const RegionEditor = ({
  region,
  canEdit,
  onUpdate,
  onPlay,
  onToggleNote,
  onCreateIssue,
  onDeleteRegion,
}: RegionEditorProps) => {
  const [text, setText] = useState(region.text || '');
  const [translation, setTranslation] = useState(region.translation || '');
  const [isPlaying, setIsPlaying] = useState(false);

  const textEditorRef = useRef<ReactQuill>(null);
  const translationEditorRef = useRef<ReactQuill>(null);

  // Update local state when region changes
  useEffect(() => {
    setText(region.text || '');
    setTranslation(region.translation || '');
  }, [region.id, region.text, region.translation]);

  const handleTextChange = (value: string) => {
    setText(value);
    onUpdate(region.id, { text: value });
  };

  const handleTranslationChange = (value: string) => {
    setTranslation(value);
    onUpdate(region.id, { translation: value });
  };

  const handlePlay = async () => {
    if (onPlay) {
      setIsPlaying(true);
      onPlay(region.start, region.end);
      // Reset playing state after estimated duration
      setTimeout(
        () => setIsPlaying(false),
        (region.end - region.start) * 1000 + 500
      );
    }
  };

  const handleToggleNote = () => {
    if (onToggleNote) {
      onToggleNote(region.id);
    }
  };

  const handleCreateIssue = () => {
    if (onCreateIssue) {
      onCreateIssue(region.id);
    }
  };

  const handleClearFormat = (editor: 'text' | 'translation') => {
    const editorRef = editor === 'text' ? textEditorRef : translationEditorRef;
    if (editorRef.current) {
      const quill = editorRef.current.getEditor();
      const selection = quill.getSelection();
      if (selection) {
        quill.removeFormat(selection.index, selection.length);
      }
    }
  };

  const handleDeleteRegion = () => {
    if (
      onDeleteRegion &&
      window.confirm('Are you sure you want to delete this region?')
    ) {
      onDeleteRegion(region.id);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 md:flex-row md:items-center md:gap-0 flex-col items-start gap-3">
        <div>
          <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">Region #{region.displayIndex}</h3>
          <span className="text-sm text-gray-500 font-mono">
            {formatTime(region.start)} - {formatTime(region.end)}
          </span>
          {region.isNote && <span className="inline-block ml-2 py-0.5 px-2 bg-yellow-400 text-gray-800 rounded-xl text-xs font-medium">Note</span>}
        </div>

        <div className="flex gap-2 md:gap-2 md:self-auto self-stretch justify-around">
          <button
            className={`flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed md:flex-none flex-1 max-w-[60px] ${
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
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-cyan-600 hover:text-white hover:border-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed md:flex-none flex-1 max-w-[60px]"
                onClick={handleToggleNote}
                title={
                  region.isNote ? 'Convert to transcription' : 'Convert to note'
                }
              >
                📝
              </button>

              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-yellow-400 hover:text-gray-800 hover:border-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed md:flex-none flex-1 max-w-[60px]"
                onClick={handleCreateIssue}
                title="Create issue"
              >
                ⚠️
              </button>

              <button
                className="flex items-center justify-center w-9 h-9 border border-gray-300 rounded-md bg-white cursor-pointer transition-all duration-200 text-base hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed md:flex-none flex-1 max-w-[60px]"
                onClick={handleDeleteRegion}
                title="Delete region"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto md:p-4 p-3">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-semibold text-gray-700 text-sm">Original Text</label>
            {canEdit && (
              <button
                className="py-1 px-2 border border-gray-300 rounded bg-white text-gray-500 text-xs cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                onClick={() => handleClearFormat('text')}
                title="Clear formatting"
              >
                Clear Format
              </button>
            )}
          </div>
          <div className="[&_.ql-container]:rounded-b-md [&_.ql-container]:min-h-[120px] [&_.ql-toolbar]:rounded-t-md [&_.ql-toolbar]:border-gray-300 [&_.ql-container_.ql-editor]:min-h-[100px] [&_.ql-container_.ql-editor]:text-sm [&_.ql-container_.ql-editor]:leading-relaxed [&_.ql-container_.ql-editor.ql-blank::before]:text-gray-400 [&_.ql-container_.ql-editor.ql-blank::before]:not-italic [&_.ql-snow_.ql-tooltip]:z-[1000]">
            <ReactQuill
              ref={textEditorRef}
              theme="snow"
              value={text}
              onChange={handleTextChange}
              modules={quillModules}
              formats={customFormats}
              readOnly={!canEdit}
              placeholder="Enter original text..."
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-semibold text-gray-700 text-sm">Translation</label>
            {canEdit && (
              <button
                className="py-1 px-2 border border-gray-300 rounded bg-white text-gray-500 text-xs cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                onClick={() => handleClearFormat('translation')}
                title="Clear formatting"
              >
                Clear Format
              </button>
            )}
          </div>
          <div className="[&_.ql-container]:rounded-b-md [&_.ql-container]:min-h-[120px] [&_.ql-toolbar]:rounded-t-md [&_.ql-toolbar]:border-gray-300 [&_.ql-container_.ql-editor]:min-h-[100px] [&_.ql-container_.ql-editor]:text-sm [&_.ql-container_.ql-editor]:leading-relaxed [&_.ql-container_.ql-editor.ql-blank::before]:text-gray-400 [&_.ql-container_.ql-editor.ql-blank::before]:not-italic [&_.ql-snow_.ql-tooltip]:z-[1000]">
            <ReactQuill
              ref={translationEditorRef}
              theme="snow"
              value={translation}
              onChange={handleTranslationChange}
              modules={quillModules}
              formats={customFormats}
              readOnly={!canEdit}
              placeholder="Enter translation..."
            />
          </div>
        </div>
      </div>

      {region.issues && region.issues.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="m-0 mb-2 text-sm font-semibold text-gray-700">Issues ({region.issues.length})</h4>
          <div className="flex flex-wrap gap-1.5">
            {region.issues.map((issue, index) => (
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
};
