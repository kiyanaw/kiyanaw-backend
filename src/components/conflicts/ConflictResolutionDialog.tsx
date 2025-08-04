import React, { useState } from 'react';
import type { ConflictData, ConflictResolutionResult } from '../../services/conflictResolutionService';
import { DiffHighlight } from './DiffHighlight';

interface ConflictResolutionDialogProps {
  conflict: ConflictData;
  onResolve: (result: ConflictResolutionResult) => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  conflict,
  onResolve
}) => {
  const [selectedAction, setSelectedAction] = useState<'accept_remote' | 'keep_local'>('accept_remote');

  const handleResolve = () => {
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

  // Get the conflicting fields - either from new multi-field structure or legacy single field
  const conflictingFields = conflict.conflictingFields || (conflict.field ? [{
    field: conflict.field,
    localValue: conflict.localValue,
    remoteValue: conflict.remoteValue,
    fieldType: (conflict.field === 'start' || conflict.field === 'end') ? 'number' as const : 'text' as const
  }] : []);

  // Helper to get friendly field names
  const getFieldDisplayName = (field: string): string => {
    switch (field) {
      case 'regionText': return 'Text';
      case 'translation': return 'Translation';
      case 'start': return 'Start Time';
      case 'end': return 'End Time';
      default: return field;
    }
  };

  // Helper to format field values for display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatFieldValue = (value: any, fieldType: string): string => {
    if (value === null || value === undefined) return '';
    if (fieldType === 'number') {
      return typeof value === 'number' ? value.toFixed(2) + 's' : String(value);
    }
    return String(value);
  };

  // Generate description based on conflict types
  const getConflictDescription = (): string => {
    if (conflictingFields.length === 1) {
      const field = conflictingFields[0].field;
      return `Someone else has modified the ${getFieldDisplayName(field).toLowerCase()} while you were editing.`;
    }
    
    const hasText = conflictingFields.some(f => f.field === 'regionText' || f.field === 'translation');
    const hasTiming = conflictingFields.some(f => f.field === 'start' || f.field === 'end');
    
    const parts = [];
    if (hasText) parts.push('text content');
    if (hasTiming) parts.push('timing');
    
    return `Someone else has modified the ${parts.join(' and ')} of this region while you were editing.`;
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
            {getConflictDescription()} Please choose how to resolve {conflictingFields.length > 1 ? 'these conflicts' : 'this conflict'}.
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
              {conflictingFields.map(({ field, localValue, remoteValue, fieldType }) => (
                <div key={field} className="mb-4 last:mb-0">
                  {conflictingFields.length > 1 && (
                    <h4 className="font-medium text-gray-900 mb-2">{getFieldDisplayName(field)}</h4>
                  )}
                  <div className="bg-gray-50 p-3 rounded border min-h-[100px]">
                    {fieldType === 'text' ? (
                      remoteValue ? (
                        <DiffHighlight
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          oldText={(localValue as any) || ''}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          newText={(remoteValue as any) || ''}
                          variant="show-remote-only"
                          className="text-sm"
                        />
                      ) : (
                        <span className="text-gray-400 italic">{'<empty>'}</span>
                      )
                    ) : (
                      <span className="font-mono text-sm">
                        {formatFieldValue(remoteValue, fieldType)}
                      </span>
                    )}
                  </div>
                  {fieldType === 'text' && (
                    <button
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={() => copyToClipboard((remoteValue as any) || '')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      📋 Copy their {getFieldDisplayName(field).toLowerCase()}
                    </button>
                  )}
                </div>
              ))}
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
              {conflictingFields.map(({ field, localValue, remoteValue, fieldType }) => (
                <div key={field} className="mb-4 last:mb-0">
                  {conflictingFields.length > 1 && (
                    <h4 className="font-medium text-gray-900 mb-2">{getFieldDisplayName(field)}</h4>
                  )}
                  <div className="bg-gray-50 p-3 rounded border min-h-[100px]">
                    {fieldType === 'text' ? (
                      localValue ? (
                        <DiffHighlight
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          oldText={(localValue as any) || ''}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          newText={(remoteValue as any) || ''}
                          variant="show-local-only"
                          className="text-sm"
                        />
                      ) : (
                        <span className="text-gray-400 italic">{'<empty>'}</span>
                      )
                    ) : (
                      <span className="font-mono text-sm">
                        {formatFieldValue(localValue, fieldType)}
                      </span>
                    )}
                  </div>
                  {fieldType === 'text' && (
                    <button
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={() => copyToClipboard((localValue as any) || '')}
                      className="mt-2 text-sm text-green-600 hover:text-green-800"
                    >
                      📋 Copy your {getFieldDisplayName(field).toLowerCase()}
                    </button>
                  )}
                </div>
              ))}
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
                onClick={handleResolve}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Resolve Conflict{conflictingFields.length > 1 ? 's' : ''}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 