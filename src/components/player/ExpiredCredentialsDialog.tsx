import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getSignedUrlExpirationTime } from '../../services/transcriptionService';

interface ExpiredCredentialsDialogProps {
  isOpen: boolean;
  isRefreshing?: boolean;
  isSaving?: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

export const ExpiredCredentialsDialog = ({ isOpen, isRefreshing = false, isSaving = false, onRefresh, onClose }: ExpiredCredentialsDialogProps) => {
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updateMinutes = () => {
      const expirationTime = getSignedUrlExpirationTime();
      if (!expirationTime) {
        setMinutesRemaining(null);
        return;
      }
      const now = Date.now();
      const timeRemaining = expirationTime - now;
      const minutes = Math.floor(timeRemaining / (1000 * 60));
      setMinutesRemaining(minutes >= 0 ? minutes : 0);
    };

    updateMinutes();
    const interval = setInterval(updateMinutes, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isExpired = minutesRemaining !== null && minutesRemaining <= 0;
  const isSoon = minutesRemaining !== null && minutesRemaining > 0 && minutesRemaining <= 5;
  const title = isExpired 
    ? 'Media Access Expired' 
    : isSoon 
      ? 'Media Access Expiring Soon'
      : 'Media Access Expiry';
  const message = isExpired 
    ? 'Media access credentials have expired. Refresh now to continue.'
    : isSoon
      ? `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} until media access credentials expire. Refresh now.`
      : `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} until media access credentials expire.`;

  const handleBackdropClick = () => {
    // Only allow closing via backdrop if not expired and not in a loading state
    if (!isExpired && !isRefreshing && !isSaving) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className={isExpired ? 'text-orange-600' : 'text-blue-600'} size={24} />
          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
        </div>
        
        <p className="text-gray-700 mb-3">
          {message}
        </p>
        
        <p className="text-sm text-gray-600 mb-6">
          Temporary credentials are used to access your media files stored within the platform. Once credentials expire, click Refresh to obtain fresh credentials.
        </p>
        
        <div className="flex gap-3">
          {!isExpired && (
            <button
              onClick={onClose}
              disabled={isRefreshing || isSaving}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing || isSaving}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
};

