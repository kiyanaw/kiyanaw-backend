import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

interface DatabaseTermsDialogProps {
  onAccept: () => void;
}

export const DatabaseTermsDialog = ({ onAccept }: DatabaseTermsDialogProps) => {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate('/transcribe-list');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Language Database Terms of Use
            </h2>
            <p className="text-sm text-gray-700 mb-4">
              This is community-generated data for language learning purposes only. By using the language database I agree:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 mb-4">
              <li>I will not scrape this data,</li>
              <li>I will not use any of this data for training AI or LLMs,</li>
              <li>I will request permission from the author of any transcription before using any of this data for any purpose other than learning my Indigenous language</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Agree
          </button>
        </div>
      </div>
    </div>
  );
};

