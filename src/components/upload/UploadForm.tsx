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
import './UploadForm.css';

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
    <div className="upload-container">
      <h2>Upload Media</h2>

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter transcription title"
          className="title-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="file">Select an MP3 or MP4 file:</label>
        <input
          id="file"
          ref={fileInputRef}
          type="file"
          accept=".mp3,.mp4"
          onChange={handleFileChange}
          className="file-input"
        />
        {inputFile && (
          <div className="file-info">
            Selected: {inputFile.name} (
            {(inputFile.size / 1024 / 1024).toFixed(2)} MB)
          </div>
        )}
      </div>

      <div className="upload-section">
        <button
          onClick={uploadFile}
          disabled={disableUpload || loading}
          className={`upload-btn ${disableUpload || loading ? 'disabled' : ''}`}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>

        {loading && (
          <div className="progress-section">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
