import React, { useState } from 'react';
import type { ConflictData, ConflictResolutionResult } from '../../services/conflictResolutionService';
import { DiffHighlight } from './DiffHighlight';

interface ConflictResolutionDialogProps {
  conflict: ConflictData;
  onResolve: (result: ConflictResolutionResult) => void;
  onCancel: () => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  conflict,
  onResolve,
  onCancel
}) => {
  const [selectedAction, setSelectedAction] = useState<'accept_remote' | 'keep_local' | null>(null);

  const handleResolve = () => {
    if (!selectedAction) return;
    onResolve({ action: selectedAction });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  // Extract username from email (remove @domain.com part)
  const getDisplayName = (userLastUpdated?: string): string => {
    if (!userLastUpdated) return 'another user';
    const atIndex = userLastUpdated.indexOf('@');
    return atIndex > 0 ? userLastUpdated.substring(0, atIndex) : userLastUpdated;
  };

  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Conflict Detected
          </h2>
          <p className="text-gray-600">
            Someone else has modified this {conflict.field === 'regionText' ? 'text' : 'translation'} while you were editing. 
            Please choose how to resolve this conflict.
          </p>
        </div>

        {/* Content Comparison */}
        <div className="flex-1 flex overflow-hidden">
          {/* Remote Version (Left) */}
          <div className="flex-1 border-r border-gray-200 flex flex-col">
            <div className="p-4 bg-blue-50 border-b border-gray-200">
              <h3 className="font-medium text-blue-900">Their Changes</h3>
              <p className="text-sm text-blue-700">
                Version {conflict.remoteVersion} • Last updated by {getDisplayName(conflict.remoteUserLastUpdated)}
              </p>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div className="bg-gray-50 p-3 rounded border min-h-[200px]">
                {conflict.remoteValue ? (
                  <DiffHighlight
                    oldText={conflict.localValue || ''}
                    newText={conflict.remoteValue || ''}
                    variant="show-remote-only"
                    className="text-sm"
                  />
                ) : (
                  <span className="text-gray-400 italic">{'<empty>'}</span>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(conflict.remoteValue)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                📋 Copy their text
              </button>
            </div>
          </div>



          {/* Local Version (Right) */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-green-50 border-b border-gray-200">
              <h3 className="font-medium text-green-900">Your Changes</h3>
              <p className="text-sm text-green-700">
                Version {conflict.localVersion} • Your unsaved changes
              </p>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div className="bg-gray-50 p-3 rounded border min-h-[200px]">
                {conflict.localValue ? (
                  <DiffHighlight
                    oldText={conflict.localValue || ''}
                    newText={conflict.remoteValue || ''}
                    variant="show-local-only"
                    className="text-sm"
                  />
                ) : (
                  <span className="text-gray-400 italic">{'<empty>'}</span>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(conflict.localValue)}
                className="mt-2 text-sm text-green-600 hover:text-green-800"
              >
                📋 Copy your text
              </button>
            </div>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-3">Choose how to resolve:</h4>
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="radio"
                  name="resolution"
                  value="accept_remote"
                  checked={selectedAction === 'accept_remote'}
                  onChange={(e) => setSelectedAction(e.target.value as 'accept_remote')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">Accept their changes</div>
                  <div className="text-sm text-gray-600">
                    Discard your changes and use the version they saved
                  </div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  type="radio"
                  name="resolution"
                  value="keep_local"
                  checked={selectedAction === 'keep_local'}
                  onChange={(e) => setSelectedAction(e.target.value as 'keep_local')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">Keep your changes</div>
                  <div className="text-sm text-gray-600">
                    Overwrite their changes with your version (use with caution)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!selectedAction}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resolve Conflict
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 