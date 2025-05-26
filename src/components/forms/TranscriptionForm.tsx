import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

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
    <div className="p-5 bg-white rounded-lg border border-gray-300 md:p-5 p-4">
      <h3 className="m-0 mb-5 text-lg font-semibold text-gray-800 border-b-2 border-gray-100 pb-2.5 md:text-lg md:mb-5 text-base mb-4">Transcription Metadata</h3>

      <div className="mb-4 md:mb-4 mb-3.5">
        <label htmlFor="title" className="block mb-1.5 font-medium text-gray-600 text-sm">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={disableInputs}
          className="w-full py-2 px-3 border border-gray-300 rounded text-sm font-inherit transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,150,243,0.1)] disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed md:text-sm text-base"
        />
      </div>

      <div className="mb-4 md:mb-4 mb-3.5">
        <label htmlFor="comments" className="block mb-1.5 font-medium text-gray-600 text-sm">Comments</label>
        <textarea
          id="comments"
          value={comments}
          onChange={(e) => handleCommentsChange(e.target.value)}
          disabled={disableInputs}
          className="w-full py-2 px-3 border border-gray-300 rounded text-sm font-inherit transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,150,243,0.1)] disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed resize-y min-h-[60px] md:text-sm text-base"
          rows={3}
        />
      </div>

      <div className="mb-4 md:mb-4 mb-3.5">
        <label htmlFor="lastUpdated" className="block mb-1.5 font-medium text-gray-600 text-sm">Last Updated</label>
        <input
          id="lastUpdated"
          type="text"
          value={formatDate(transcription.dateLastUpdated)}
          disabled
          className="w-full py-2 px-3 border border-gray-300 rounded text-sm font-inherit transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,150,243,0.1)] disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed md:text-sm text-base"
        />
      </div>

      <div className="mb-4 md:mb-4 mb-3.5">
        <label htmlFor="regionCount" className="block mb-1.5 font-medium text-gray-600 text-sm">Total Regions</label>
        <input
          id="regionCount"
          type="text"
          value={regions.length.toString()}
          disabled
          className="w-full py-2 px-3 border border-gray-300 rounded text-sm font-inherit transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,150,243,0.1)] disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed md:text-sm text-base"
        />
      </div>

      <div className="mb-4 md:mb-4 mb-3.5">
        <label htmlFor="author" className="block mb-1.5 font-medium text-gray-600 text-sm">Author</label>
        <input
          id="author"
          type="text"
          value={transcription.author}
          disabled
          className="w-full py-2 px-3 border border-gray-300 rounded text-sm font-inherit transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,150,243,0.1)] disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed md:text-sm text-base"
        />
      </div>

      <div className="mb-4 md:mb-4 mb-3.5">
        <label htmlFor="accessLevel" className="block mb-1.5 font-medium text-gray-600 text-sm">Public Read Access</label>
        <select
          id="accessLevel"
          value={isPrivate ? 'Disable' : 'Enable'}
          onChange={(e) => handleAccessLevelChange(e.target.value)}
          disabled={disableInputs}
          className="w-full py-2 px-3 border border-gray-300 rounded text-sm font-inherit transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,150,243,0.1)] disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed cursor-pointer disabled:cursor-not-allowed md:text-sm text-base"
        >
          <option value="Enable">Enable</option>
          <option value="Disable">Disable</option>
        </select>
      </div>

      <div className="mb-4 md:mb-4 mb-3.5">
        <label htmlFor="analyzer" className="block mb-1.5 font-medium text-gray-600 text-sm">Analyzer</label>
        <select
          id="analyzer"
          value={disableAnalyzer ? 'Disable' : 'Enable'}
          onChange={(e) => handleAnalyzerChange(e.target.value)}
          disabled={disableInputs}
          className="w-full py-2 px-3 border border-gray-300 rounded text-sm font-inherit transition-all duration-200 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(33,150,243,0.1)] disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed cursor-pointer disabled:cursor-not-allowed md:text-sm text-base"
        >
          <option value="Enable">Enable</option>
          <option value="Disable">Disable</option>
        </select>
      </div>

      {editors.length > 0 && (
        <div className="mb-4 md:mb-4 mb-3.5">
          <label className="block mb-1.5 font-medium text-gray-600 text-sm">Editors</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {editors.map((editor, index) => (
              <span key={index} className="inline-block py-1 px-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium">
                {editor}
              </span>
            ))}
          </div>
        </div>
      )}

      {disableInputs && (
        <div className="mt-5 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          <p className="m-0 text-sm">Only the author can edit transcription metadata.</p>
        </div>
      )}
    </div>
  );
};
