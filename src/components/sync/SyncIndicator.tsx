import { CircleCheckBig, Loader2 } from 'lucide-react';

interface SyncIndicatorProps {
  status: 'synced' | 'syncing' | null;
}

export const SyncIndicator = ({ status }: SyncIndicatorProps) => {
  if (status === 'synced') {
    return (
      <div 
        className="flex items-center justify-center w-3 h-3 ml-1"
        title="Data is up to date"
      >
        <CircleCheckBig size={12} className="text-green-500" />
      </div>
    );
  }

  if (status === 'syncing') {
    return (
      <div 
        className="flex items-center justify-center w-3 h-3 ml-1"
        title="Syncing latest changes..."
      >
        <Loader2 size={12} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  return null;
};
