import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './RegionEditor.css';

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
    <div className="region-editor">
      <div className="region-header">
        <div className="region-info">
          <h3>Region #{region.displayIndex}</h3>
          <span className="region-timing">
            {formatTime(region.start)} - {formatTime(region.end)}
          </span>
          {region.isNote && <span className="note-badge">Note</span>}
        </div>

        <div className="region-tools">
          <button
            className={`tool-button play-button ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlay}
            disabled={!onPlay}
            title="Play region"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          {canEdit && (
            <>
              <button
                className="tool-button note-button"
                onClick={handleToggleNote}
                title={
                  region.isNote ? 'Convert to transcription' : 'Convert to note'
                }
              >
                📝
              </button>

              <button
                className="tool-button issue-button"
                onClick={handleCreateIssue}
                title="Create issue"
              >
                ⚠️
              </button>

              <button
                className="tool-button delete-button"
                onClick={handleDeleteRegion}
                title="Delete region"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      <div className="editor-section">
        <div className="editor-group">
          <div className="editor-header">
            <label>Original Text</label>
            {canEdit && (
              <button
                className="clear-format-button"
                onClick={() => handleClearFormat('text')}
                title="Clear formatting"
              >
                Clear Format
              </button>
            )}
          </div>
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

        <div className="editor-group">
          <div className="editor-header">
            <label>Translation</label>
            {canEdit && (
              <button
                className="clear-format-button"
                onClick={() => handleClearFormat('translation')}
                title="Clear formatting"
              >
                Clear Format
              </button>
            )}
          </div>
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

      {region.issues && region.issues.length > 0 && (
        <div className="region-issues">
          <h4>Issues ({region.issues.length})</h4>
          <div className="issues-summary">
            {region.issues.map((issue, index) => (
              <span
                key={index}
                className={`issue-indicator ${issue.type || 'general'}`}
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
