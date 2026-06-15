import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteTranscriptionModalProps {
  isOpen: boolean;
  transcriptionTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
  error?: string | null;
}

export const DeleteTranscriptionModal = ({
  isOpen,
  transcriptionTitle,
  onConfirm,
  onCancel,
  isDeleting,
  error,
}: DeleteTranscriptionModalProps) => {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (isOpen) setConfirmText('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-800/60 backdrop-saturate-0 transition-opacity" onClick={onCancel}></div>

        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Delete Transcription
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-4">
                  This action will permanently delete <strong>"{transcriptionTitle}"</strong> and all associated data.
                  This cannot be undone.
                </p>

                <div className="mb-4">
                  <label htmlFor="deleteConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                    Type <strong>"delete forever"</strong> to confirm:
                  </label>
                  <input
                    id="deleteConfirm"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="delete forever"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    disabled={isDeleting}
                    data-testid="delete-confirm-input"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting || confirmText.toLowerCase() !== 'delete forever'}
              className="inline-flex w-full justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="delete-forever-button"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Forever'
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
