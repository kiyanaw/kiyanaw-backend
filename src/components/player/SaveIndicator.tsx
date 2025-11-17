import { CircleCheckBig, Loader2, AlertCircle, Clock } from 'lucide-react';

interface SaveIndicatorProps {
  status: 'saved' | 'saving' | 'pending' | 'error';
}

export const SaveIndicator = ({ status }: SaveIndicatorProps) => {
  if (status === 'saved') {
    return (
      <div 
        className="flex items-center justify-center w-4 h-4"
        title="All changes saved"
      >
        <CircleCheckBig size={14} className="text-green-500" />
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div 
        className="flex items-center justify-center w-4 h-4"
        title="Changes pending save..."
      >
        <Clock size={14} className="text-yellow-500" />
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div 
        className="flex items-center justify-center w-4 h-4"
        title="Saving changes..."
      >
        <Loader2 size={14} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div 
        className="flex items-center justify-center w-4 h-4 bg-red-500 rounded-full"
        title="Error saving changes"
      >
        <AlertCircle size={10} className="text-white" />
      </div>
    );
  }

  return null;
};
