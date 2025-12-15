import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getSignedUrlExpirationTime } from '../../services/transcriptionService';

interface CredentialTimerProps {
  onOpenDialog: () => void;
}

export const CredentialTimer = ({ onOpenDialog }: CredentialTimerProps) => {
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const expirationTime = getSignedUrlExpirationTime();
      
      if (!expirationTime) {
        setMinutesRemaining(null);
        return;
      }

      const now = Date.now();
      const timeRemaining = expirationTime - now;
      const minutes = Math.floor(timeRemaining / (1000 * 60));
      
      setMinutesRemaining(minutes >= 0 ? minutes : 0);

      // Automatically open dialog when credentials expire (0 or negative minutes)
      if (minutes <= 0) {
        onOpenDialog();
      }
    };

    // Update immediately
    updateTimer();

    // Update every second to catch expiration immediately
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [onOpenDialog]);

  // Don't render if no expiration time or already expired
  if (minutesRemaining === null || minutesRemaining < 0) {
    return null;
  }

  const isWarning = minutesRemaining <= 5;
  const displayText = `${minutesRemaining}m`;

  return (
    <button
      onClick={onOpenDialog}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
        isWarning
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={`Credentials expire in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}. Click to view details.`}
    >
      <ShieldCheck size={12} />
      <span>{displayText}</span>
    </button>
  );
};

