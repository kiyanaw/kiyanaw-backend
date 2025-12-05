import React from 'react';

interface ExpiredUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const ExpiredUrlDialog: React.FC<ExpiredUrlDialogProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Media Access Expired
          </h2>
          
          <p className="text-gray-600 mb-6">
            The pre-signed URL for this media file has expired. Please refresh the page to continue transcribing.
          </p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onRefresh}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

