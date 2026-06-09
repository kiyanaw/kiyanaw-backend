import { Loader2 } from 'lucide-react';
import { MEDIA_STATUS } from '../../services/mediaService';

interface MediaStatusIndicatorProps {
  status: string | undefined;
}

export const MediaStatusIndicator = ({ status }: MediaStatusIndicatorProps) => {
  if (status === MEDIA_STATUS.PENDING || status === MEDIA_STATUS.PROCESSING) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex-shrink-0"
        title="Processing media…"
        data-testid="media-status-indicator"
      >
        <Loader2 size={10} className="animate-spin" />
        Processing
      </span>
    );
  }

  if (status === MEDIA_STATUS.ERROR) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex-shrink-0"
        title="Media processing failed"
        data-testid="media-status-indicator"
      >
        Failed
      </span>
    );
  }

  return null;
};
