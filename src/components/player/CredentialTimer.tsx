import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getSignedUrlExpirationTime } from '../../services/transcriptionService';

interface CredentialTimerProps {
  onOpenDialog: () => void;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  totalMinutes: number;
}

export const CredentialTimer = ({ onOpenDialog }: CredentialTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const expirationTime = getSignedUrlExpirationTime();

      if (!expirationTime) {
        setTimeRemaining(null);
        return;
      }

      const now = Date.now();
      const remaining = expirationTime - now;

      if (remaining <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, totalMinutes: 0 });
        onOpenDialog();
        return;
      }

      const totalMinutes = Math.floor(remaining / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setTimeRemaining({ hours, minutes, totalMinutes });
    };

    // Update immediately
    updateTimer();

    // Update every 60 seconds for 24-hour timer (less CPU than every second)
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [onOpenDialog]);

  // Don't render if no expiration time
  if (timeRemaining === null) {
    return null;
  }

  const { hours, minutes, totalMinutes } = timeRemaining;

  // Show warning when less than 30 minutes remaining
  const isWarning = totalMinutes <= 30;

  // Format display: "23h 45m" or "45m" if less than an hour
  const displayText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Format title text
  const titleText =
    hours > 0
      ? `Media access expires in ${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}.`
      : `Media access expires in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;

  return (
    <button
      onClick={onOpenDialog}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
        isWarning
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={`${titleText} Click to refresh.`}
    >
      <ShieldCheck size={12} />
      <span>{displayText}</span>
    </button>
  );
};
