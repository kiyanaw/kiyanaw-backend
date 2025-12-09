import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getSignedUrlExpirationTime } from '../../services/transcriptionService';

interface ExpiredCredentialsDialogProps {
  isOpen: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

export const ExpiredCredentialsDialog = ({ isOpen, onRefresh, onClose }: ExpiredCredentialsDialogProps) => {
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
  const title = isExpired ? 'Media Access Expired' : 'Media Access Expiring Soon';
  const message = isExpired 
    ? 'Media access credentials have expired. Refresh now to continue.'
    : `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''} until media access credentials expire. Refresh now.`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
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
        
        <p className="text-gray-700 mb-6">
          {message}
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onRefresh}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

