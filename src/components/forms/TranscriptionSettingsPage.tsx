import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Users, Settings, Mail, Send, UserPlus, Trash2 } from 'lucide-react';
import { useCreateInvite } from '../../hooks/useCreateInvite';
import { useRevokeInvite } from '../../hooks/useRevokeInvite';
import * as inviteService from '../../services/inviteService';
import type { InviteModel } from '../../services/adt';

interface TranscriptionSettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  comments?: string;
  author: string;
  dateLastUpdated: string;
  regionCount: number;
  transcriptionId: string;
  onSave: (updates: { title?: string; comments?: string }) => void;
  isOwner: boolean;
}

export const TranscriptionSettingsPage = ({
  isOpen,
  onClose,
  title: initialTitle,
  comments: initialComments,
  author,
  dateLastUpdated,
  regionCount,
  transcriptionId,
  onSave,
  isOwner,
}: TranscriptionSettingsPageProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [comments, setComments] = useState(initialComments || '');
  
  // Invite management state
  const [invites, setInvites] = useState<InviteModel[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInvitePermission, setNewInvitePermission] = useState<'viewer' | 'editor'>('viewer');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  
  // Hooks
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    
    try {
      if (!transcriptionId?.trim()) {
        throw new Error('Transcription ID is required');
      }
      console.log('Loading invites for transcription:', transcriptionId);
      const loadedInvites = await inviteService.loadInvitesForTranscription(transcriptionId);
      setInvites(loadedInvites);
    } catch (error) {
      console.error('Failed to load invites:', error);
    } finally {
      setInvitesLoading(false);
    }
  }, [transcriptionId]);

  // Load invites when component opens - moved before early return
  useEffect(() => {
    if (isOpen && transcriptionId) {
      loadInvites();
    }
  }, [isOpen, transcriptionId, loadInvites]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updates: { title?: string; comments?: string } = {};
    
    if (title !== initialTitle) {
      updates.title = title;
    }
    
    if (comments !== initialComments) {
      updates.comments = comments;
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    }
    
    onClose();
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    setComments(initialComments || '');
    onClose();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const hasChanges = title !== initialTitle || comments !== (initialComments || '');

  const handleSendInvite = async () => {
    if (!newInviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }

    setSendingInvite(true);
    setInviteError(null);
    setInviteSuccess(null); // Clear previous success message
    
    try {
      await createInvite({
        email: newInviteEmail.trim(),
        permissionLevel: newInvitePermission,
        transcriptionId,
      });
      
      // Clear form and show success immediately
      const sentEmail = newInviteEmail.trim();
      setNewInviteEmail('');
      setNewInvitePermission('viewer');
      setInviteSuccess(`Invite sent successfully to ${sentEmail}!`);
      
      // Refresh the invite list
      await loadInvites();
      
    } catch (error) {
      console.error('Failed to send invite:', error);
      setInviteError(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (invite: InviteModel) => {
    const isAccepted = invite.statusDisplay === 'Accepted';
    const confirmText = isAccepted 
      ? `Revoke access for ${invite.email}? This will remove them from the transcription and delete their invitation.`
      : `Delete invitation for ${invite.email}?`;
    
    if (!confirm(confirmText)) {
      return;
    }

    setDeletingInviteId(invite.id);
    setInviteError(null);
    
    try {
      const result = await revokeInvite(invite.id);
      
      const successMessage = result.wasAccepted 
        ? `Access revoked for ${invite.email}. They have been removed from the transcription.`
        : `Invitation for ${invite.email} deleted successfully`;
      
      setInviteSuccess(successMessage);
      
      // Refresh the invite list
      await loadInvites();
    } catch (error) {
      console.error('Failed to revoke invite:', error);
      setInviteError(error instanceof Error ? error.message : 'Failed to revoke invite');
    } finally {
      setDeletingInviteId(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-red-200 text-red-900';
      case 'declined':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Settings className="text-gray-600" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">Transcription Settings</h1>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            title="Close settings"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            
            {/* General Settings Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <FileText className="text-blue-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={!isOwner}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed text-base"
                    />
                  </div>

                  <div>
                    <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                      Comments
                    </label>
                    <textarea
                      id="comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      disabled={!isOwner}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed resize-vertical text-base"
                      placeholder="Add any comments about this transcription..."
                    />
                  </div>
                </div>

                {!isOwner && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Only the transcription owner can edit these settings.
                    </p>
                  </div>
                )}
              </div>

              {/* Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <FileText className="text-green-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Information</h2>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Author</label>
                      <p className="text-base text-gray-900 mt-1">{author}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Last Updated</label>
                      <p className="text-base text-gray-900 mt-1">{formatDate(dateLastUpdated)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Total Regions</label>
                      <p className="text-base text-gray-900 mt-1">{regionCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sharing & Collaboration Section - Full Width (Owners Only) */}
            {isOwner && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <Users className="text-purple-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Sharing & Collaboration</h2>
                </div>

              {/* Send New Invite */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <UserPlus className="text-blue-600" size={20} />
                  <h3 className="text-sm font-semibold text-blue-900">Send Invitation</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <input
                      type="email"
                      value={newInviteEmail}
                      onChange={(e) => setNewInviteEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <select
                      value={newInvitePermission}
                      onChange={(e) => setNewInvitePermission(e.target.value as 'viewer' | 'editor')}
                      className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={handleSendInvite}
                      disabled={sendingInvite || !newInviteEmail.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sendingInvite ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Send Invite
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {inviteError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {inviteError}
                  </div>
                )}
                {inviteSuccess && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    {inviteSuccess}
                  </div>
                )}
              </div>

              {/* Current Invites */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Current Invitations</h3>
                </div>
                
                <div className="p-4">
                  {invitesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-gray-600">
                        {invites.length > 0 ? 'Refreshing invitations...' : 'Loading invitations...'}
                      </span>
                    </div>
                  ) : invites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="mx-auto mb-2 text-gray-400" size={24} />
                      <p className="text-sm">No invitations sent yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invites.map((invite) => (
                        <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-sm">{invite.email}</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(invite.statusDisplay)}`}>
                                {invite.statusDisplay}
                              </span>
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {invite.permissionLevel}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              Sent {invite.createdAtFormatted} • Expires {invite.expiresAtFormatted}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(invite.statusDisplay === 'Pending' || invite.statusDisplay === 'Accepted') && (
                              <button 
                                onClick={() => handleRevokeInvite(invite)}
                                disabled={deletingInviteId === invite.id}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                title={invite.statusDisplay === 'Accepted' ? 'Revoke access' : 'Delete invite'}
                              >
                                {deletingInviteId === invite.id ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {hasChanges && "You have unsaved changes"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isOwner || !hasChanges}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 