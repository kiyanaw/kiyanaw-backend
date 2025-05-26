import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadData } from 'aws-amplify/storage';
import { DataStore } from '@aws-amplify/datastore';
import {
  Transcription,
  TranscriptionContributor,
  Contributor,
} from '../../models';
import { useAuth } from '../../hooks/useAuth';

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

  const uploadFile = async () => {
    if (!inputFile || !title.trim() || !user) return;

    try {
      setLoading(true);
      setProgress(0);

      // Upload file to S3 using Amplify v6 Storage API
      const timestamp = Date.now();
      const key = `${timestamp}-${inputFile.name}`;

      await uploadData({
        key,
        data: inputFile,
        options: {
          accessLevel: 'guest', // equivalent to 'public' in v5
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              const percentage = (transferredBytes / totalBytes) * 100;
              setProgress(percentage);
            }
          },
        },
      }).result;

      // Construct the source URL
      // Note: In production, you might want to get this from environment variables
      const source = `https://s3.amazonaws.com/public/${key}`;

      // Create the transcription record (DataStore will auto-generate ID)
      const transcription = await DataStore.save(
        new Transcription({
          title: title.trim(),
          source,
          type: inputFile.type,
          dateLastUpdated: `${Date.now()}`,
          author: user.username,
          userLastUpdated: user.username,
          issues: '',
          length: 0,
          coverage: 0,
          disableAnalyzer: false,
          isPrivate: false,
        })
      );

      console.log('Transcription uploaded:', transcription);

      // Find or create contributor record
      let contributor = await DataStore.query(Contributor, user.username);
      if (!contributor) {
        contributor = await DataStore.save(
          new Contributor({
            email: user.userId, // Using userId as email placeholder
            username: user.username,
          })
        );
      }

      // Create the transcription-contributor link
      const link = await DataStore.save(
        new TranscriptionContributor({
          transcription,
          contributor,
        })
      );

      console.log('Owner added to transcription:', link);

      // Navigate to the editor
      if (link) {
        navigate(`/transcribe-edit/${transcription.id}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
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
