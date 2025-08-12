import { useState, useEffect, useCallback } from 'react';
import { FileText, Users, Settings, Mail, Send, UserPlus, Trash2, Save, RotateCcw, Loader2 } from 'lucide-react';
import { useCreateInvite } from '../../hooks/useCreateInvite';
import { useRevokeInvite } from '../../hooks/useRevokeInvite';
import * as inviteService from '../../services/inviteService';
import type { InviteModel } from '../../services/adt';

interface TranscriptionSettingsPageProps {
  title: string;
  comments?: string;
  author: string;
  dateLastUpdated: string;
  regionCount: number;
  transcriptionId: string;
  isPrivate?: boolean;
  lang?: string;
  onSave: (updates: { title?: string; comments?: string; isPrivate?: boolean; lang?: string }) => void;
  onBack: () => void;
  isOwner: boolean;
}

export const TranscriptionSettingsPage = ({
  title: initialTitle,
  comments: initialComments,
  author,
  dateLastUpdated,
  regionCount,
  transcriptionId,
  isPrivate: initialIsPrivate,
  lang: initialLang,
  onSave,
  onBack,
  isOwner,
}: TranscriptionSettingsPageProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [comments, setComments] = useState(initialComments || '');
  const [isPublic, setIsPublic] = useState(!(initialIsPrivate ?? true));
  const [lang, setLang] = useState(initialLang || '');
  
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
      if (!transcriptionId) {
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

  // Load invites when component mounts
  useEffect(() => {
    if (transcriptionId) {
      loadInvites();
    }
  }, [transcriptionId, loadInvites]);

  const handleSave = () => {
    const updates: { title?: string; comments?: string; isPrivate?: boolean; lang?: string } = {};
    
    if (title !== initialTitle) {
      updates.title = title;
    }
    
    if (comments !== initialComments) {
      updates.comments = comments;
    }

    if (isPublic !== (!(initialIsPrivate ?? true))) {
      updates.isPrivate = !isPublic;
    }

    if (lang !== (initialLang || '')) {
      updates.lang = lang;
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    }
    
    onBack();
  };

  const handleCancel = () => {
    setTitle(initialTitle);
    setComments(initialComments || '');
    setIsPublic(!(initialIsPrivate ?? true));
    setLang(initialLang || '');
    onBack();
  };

  const hasChanges = title !== initialTitle || comments !== (initialComments || '') || isPublic !== (!(initialIsPrivate ?? true)) || lang !== (initialLang || '');

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const handleSendInvite = async () => {
    const cleanEmail = newInviteEmail.trim();
    
    if (!cleanEmail) {
      setInviteError('Email address is required');
      return;
    }

    setSendingInvite(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await createInvite({
        transcriptionId,
        email: cleanEmail,
        permissionLevel: newInvitePermission,
      });
      
      setInviteSuccess(`Invitation sent to ${cleanEmail}`);
      setNewInviteEmail('');
      
      // Reload invites to show the new one
      await loadInvites();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (invite: InviteModel) => {
    setDeletingInviteId(invite.id);
    
    try {
      await revokeInvite(invite.id);
      
      // Reload invites to reflect the change
      await loadInvites();
    } catch (error) {
      console.error('Failed to revoke invite:', error);
    } finally {
      setDeletingInviteId(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Accepted':
        return 'bg-green-100 text-green-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      case 'Revoked':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Settings className="text-gray-600" size={24} />
              <h1 className="text-xl font-semibold text-gray-900">Transcription Settings</h1>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              {hasChanges && (
                <button
                  onClick={() => {
                        setTitle(initialTitle);
    setComments(initialComments || '');
    setIsPublic(!(initialIsPrivate ?? true));
    setLang(initialLang || '');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges || !isOwner}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Content Area */}
        <div className="space-y-8">
          {/* Settings Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                <FileText className="text-blue-600" size={20} />
                <h2 className="text-lg font-semibold text-gray-900">General</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-md font-medium text-gray-700 mb-2">
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
                  <label htmlFor="comments" className="block text-md font-medium text-gray-700 mb-2">
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

                <div>
                  <label htmlFor="lang" className="block text-md font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    id="lang"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed text-base"
                  >
                    <option value="">None</option>
                    <option value="crk">Plains Cree Y-dialect</option>
                    <option value="crgn">Northern Michif</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the spell checker to use for this transctiption. If "Is Discoverable?" is enabled, will determine the index of the Language Database used.
                  </p>
                </div>

                {lang && (
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="isPublic" className="block text-md font-medium text-gray-700">
                          Is Discoverable?
                        </label>
                        <p className="text-xs text-gray-500 mt-1 mr-1">
                          Analyzed text and issues will be discoverable by authenticated users within the Language Database (coming soon...)
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isPublic}
                        onClick={() => setIsPublic(!isPublic)}
                        disabled={!isOwner}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                          ${isPublic ? 'bg-blue-600' : 'bg-gray-200'}
                        `}
                      >
                        <span
                          aria-hidden="true"
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                            ${isPublic ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    </div>
                  </div>
                )}

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
                      placeholder="Email address"
                      value={newInviteEmail}
                      onChange={(e) => setNewInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <select
                      value={newInvitePermission}
                      onChange={(e) => setNewInvitePermission(e.target.value as 'viewer' | 'editor')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={handleSendInvite}
                      disabled={sendingInvite || !newInviteEmail.trim()}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sendingInvite ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
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

                {/* Error/Success Messages */}
                {inviteError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{inviteError}</div>
                )}
                {inviteSuccess && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{inviteSuccess}</div>
                )}
              </div>

              {/* Current Invitations */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Current Invitations</h3>
                </div>
                
                <div className="p-4">
                  {invitesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-600">Loading invitations...</span>
                    </div>
                  ) : invites.length === 0 ? (
                    <div className="text-center py-8">
                      <Mail className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by sending an invitation above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invites.map((invite) => (
                        <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                                <p className="text-xs text-gray-600">
                                  Sent {new Date(invite.createdAt).toLocaleDateString()} • 
                                  Expires {new Date(invite.expiresAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(invite.statusDisplay)}`}>
                                  {invite.statusDisplay}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  invite.permissionLevel === 'editor' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {invite.permissionLevel}
                                </span>
                              </div>
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
                                  <Loader2 size={16} className="animate-spin" />
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
    </div>
  );
};