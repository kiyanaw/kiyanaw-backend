import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { CreateTranscriptionUseCase } from '../../use-cases/create-transcription';
import { services } from '../../services';
import type { UploadProgress } from '../../services/uploadService';

export const UploadForm = () => {
  const [title, setTitle] = useState('');
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const disableUpload = !inputFile || !title.trim();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setInputFile(file);
  };

  const handleProgressUpdate = (progress: UploadProgress) => {
    setProgress(progress.percentage);
  };

  const uploadFile = async () => {
    if (!inputFile || !title.trim() || !user) return;

    try {
      setLoading(true);
      setProgress(0);

      const useCase = new CreateTranscriptionUseCase({
        title,
        file: inputFile,
        username: user.username,
        userId: user.userId,
        services,
        onProgress: handleProgressUpdate,
      });

      const result = await useCase.execute();

      console.log('Transcription created:', result.transcription);
      navigate(`/transcribe-edit/${result.transcriptionId}`);
    } catch (error) {
      console.error('Error creating transcription:', error);
      // TODO: Show error message to user
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 md:my-8 my-4 p-8 md:p-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="m-0 mb-8 text-gray-800 text-2xl md:text-2xl text-xl font-semibold">Upload Media</h2>

      <div className="space-y-6">
        <div className="mb-6">
          <label htmlFor="title" className="block mb-2 text-gray-700 font-medium">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter transcription title"
            className="w-full px-3 py-3 border-2 border-gray-200 rounded focus:outline-none focus:border-ki-blue transition-colors"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="file" className="block mb-2 text-gray-700 font-medium">
            Select an MP3 or MP4 file:
          </label>
          <input
            id="file"
            ref={fileInputRef}
            type="file"
            accept=".mp3,.mp4"
            onChange={handleFileChange}
            className="w-full px-3 py-3 border-2 border-dashed border-gray-200 rounded bg-gray-50 cursor-pointer transition-all hover:border-ki-blue hover:bg-blue-50"
          />
          {inputFile && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              Selected: {inputFile.name} (
              {(inputFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-4">
          <button
            onClick={uploadFile}
            disabled={disableUpload || loading}
            className={`px-8 py-3 rounded font-medium transition-colors md:w-auto w-full ${
              disableUpload || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-ki-blue text-white hover:bg-blue-700 cursor-pointer'
            }`}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>

          {loading && (
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-ki-blue transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 font-medium min-w-10">
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
