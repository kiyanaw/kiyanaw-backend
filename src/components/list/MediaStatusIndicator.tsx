import { Loader2, TriangleAlert } from 'lucide-react';
import { MEDIA_STATUS } from '../../services/mediaService';

interface MediaStatusIndicatorProps {
  status: string | undefined;
}

export const MediaStatusIndicator = ({ status }: MediaStatusIndicatorProps) => {
  if (status === MEDIA_STATUS.PENDING || status === MEDIA_STATUS.PROCESSING) {
    return (
      <div
        className="flex items-center justify-center w-4 h-4 flex-shrink-0"
        title="Processing media…"
        data-testid="media-status-indicator"
      >
        <Loader2 size={14} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (status === MEDIA_STATUS.ERROR) {
    return (
      <div
        className="flex items-center justify-center w-4 h-4 flex-shrink-0"
        title="Media processing failed"
        data-testid="media-status-indicator"
      >
        <TriangleAlert size={14} className="text-red-500" />
      </div>
    );
  }

  return null;
};
