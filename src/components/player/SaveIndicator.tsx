import { Check, Loader2, AlertCircle } from 'lucide-react';

interface SaveIndicatorProps {
  status: 'saved' | 'saving' | 'error';
}

export const SaveIndicator = ({ status }: SaveIndicatorProps) => {
  if (status === 'saved') {
    return (
      <div 
        className="flex items-center justify-center w-4 h-4 bg-green-500 rounded-full"
        title="All changes saved"
      >
        <Check size={10} className="text-white" />
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div 
        className="flex items-center justify-center w-4 h-4"
        title="Saving changes..."
      >
        <Loader2 size={12} className="text-blue-500 animate-spin" />
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
