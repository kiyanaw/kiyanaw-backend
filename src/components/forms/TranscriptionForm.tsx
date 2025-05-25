import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './TranscriptionForm.css';

interface Transcription {
  id: string;
  title: string;
  comments?: string;
  author: string;
  dateLastUpdated: string;
  isPrivate: boolean;
  disableAnalyzer: boolean;
  editors?: string[];
}

interface TranscriptionFormProps {
  transcription: Transcription;
  regions: any[];
  canEdit: boolean;
  onUpdate: (updates: Partial<Transcription>) => void;
}

export const TranscriptionForm = ({
  transcription,
  regions,
  canEdit,
  onUpdate,
}: TranscriptionFormProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(transcription.title || '');
  const [comments, setComments] = useState(transcription.comments || '');
  const [isPrivate, setIsPrivate] = useState(transcription.isPrivate || false);
  const [disableAnalyzer, setDisableAnalyzer] = useState(
    transcription.disableAnalyzer || false
  );
  const [editors, setEditors] = useState<string[]>(transcription.editors || []);

  // Update local state when transcription changes
  useEffect(() => {
    setTitle(transcription.title || '');
    setComments(transcription.comments || '');
    setIsPrivate(transcription.isPrivate || false);
    setDisableAnalyzer(transcription.disableAnalyzer || false);
    setEditors(transcription.editors || []);
  }, [transcription]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    onUpdate({ title: value });
  };

  const handleCommentsChange = (value: string) => {
    setComments(value);
    onUpdate({ comments: value });
  };

  const handleAccessLevelChange = (value: string) => {
    const isPrivateValue = value === 'Disable';
    setIsPrivate(isPrivateValue);
    onUpdate({ isPrivate: isPrivateValue });
  };

  const handleAnalyzerChange = (value: string) => {
    const disableValue = value === 'Disable';
    setDisableAnalyzer(disableValue);
    onUpdate({ disableAnalyzer: disableValue });
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(Number(timestamp));
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const isAuthor = user?.username === transcription.author;
  const disableInputs = !canEdit || !isAuthor;

  return (
    <div className="transcription-form">
      <h3>Transcription Metadata</h3>

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={disableInputs}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="comments">Comments</label>
        <textarea
          id="comments"
          value={comments}
          onChange={(e) => handleCommentsChange(e.target.value)}
          disabled={disableInputs}
          className="form-textarea"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="lastUpdated">Last Updated</label>
        <input
          id="lastUpdated"
          type="text"
          value={formatDate(transcription.dateLastUpdated)}
          disabled
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="regionCount">Total Regions</label>
        <input
          id="regionCount"
          type="text"
          value={regions.length.toString()}
          disabled
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="author">Author</label>
        <input
          id="author"
          type="text"
          value={transcription.author}
          disabled
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="accessLevel">Public Read Access</label>
        <select
          id="accessLevel"
          value={isPrivate ? 'Disable' : 'Enable'}
          onChange={(e) => handleAccessLevelChange(e.target.value)}
          disabled={disableInputs}
          className="form-select"
        >
          <option value="Enable">Enable</option>
          <option value="Disable">Disable</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="analyzer">Analyzer</label>
        <select
          id="analyzer"
          value={disableAnalyzer ? 'Disable' : 'Enable'}
          onChange={(e) => handleAnalyzerChange(e.target.value)}
          disabled={disableInputs}
          className="form-select"
        >
          <option value="Enable">Enable</option>
          <option value="Disable">Disable</option>
        </select>
      </div>

      {editors.length > 0 && (
        <div className="form-group">
          <label>Editors</label>
          <div className="editors-list">
            {editors.map((editor, index) => (
              <span key={index} className="editor-chip">
                {editor}
              </span>
            ))}
          </div>
        </div>
      )}

      {disableInputs && (
        <div className="form-notice">
          <p>Only the author can edit transcription metadata.</p>
        </div>
      )}
    </div>
  );
};
