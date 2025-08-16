import { useState, useEffect, useCallback } from 'react';
import { FileText, Users, Settings, Mail, Send, UserPlus, Trash2, Save, RotateCcw, Loader2, AlertTriangle, Download } from 'lucide-react';
import { useCreateInvite } from '../../hooks/useCreateInvite';
import { useRevokeInvite } from '../../hooks/useRevokeInvite';
import { useDeleteTranscription } from '../../hooks/useDeleteTranscription';
import * as inviteService from '../../services/inviteService';
import { generateSignedUrl } from '../../services/transcriptionService';
import type { InviteModel, TranscriptionModel } from '../../services/adt';

interface TranscriptionSettingsPageProps {
  transcription: TranscriptionModel;
  regionCount: number;
  onSave: (updates: { title?: string; comments?: string; isPrivate?: boolean; publicIssues?: boolean; lang?: string }) => void;
  onBack: () => void;
  onDelete?: () => void;
  isOwner: boolean;
}

export const TranscriptionSettingsPage = ({
  transcription,
  regionCount,
  onSave,
  onBack,
  onDelete,
  isOwner,
}: TranscriptionSettingsPageProps) => {
  // Extract values from transcription object
  const initialTitle = transcription.title;
  const initialComments = transcription.comments;
  const author = transcription.authorFriendly || 'Unknown';
  const dateLastUpdated = transcription.dateLastUpdated || '0';
  const transcriptionId = transcription.id;
  const initialIsPrivate = transcription.isPrivate;
  const initialPublicIssues = transcription.publicIssues;
  const initialLang = transcription.lang;
  const [title, setTitle] = useState(initialTitle);
  const [comments, setComments] = useState(initialComments || '');
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate ?? true);
  const [publicIssues, setPublicIssues] = useState(initialPublicIssues ?? false);
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
  
  // Delete transcription state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Hooks
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const deleteTranscription = useDeleteTranscription({
    onSuccess: () => {
      console.log('Transcription deleted successfully');
      onDelete?.();
    },
    onError: (error) => {
      setDeleteError(error.message);
      setIsDeleting(false);
    }
  });

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
    const updates: { title?: string; comments?: string; isPrivate?: boolean; publicIssues?: boolean; lang?: string } = {};
    
    if (title !== initialTitle) {
      updates.title = title;
    }
    
    if (comments !== initialComments) {
      updates.comments = comments;
    }

    if (isPrivate !== (initialIsPrivate ?? true)) {
      updates.isPrivate = isPrivate;
    }

    if (publicIssues !== (initialPublicIssues ?? false)) {
      updates.publicIssues = publicIssues;
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
    setIsPrivate(initialIsPrivate ?? true);
    setPublicIssues(initialPublicIssues ?? false);
    setLang(initialLang || '');
    onBack();
  };

  const hasChanges = title !== initialTitle || comments !== (initialComments || '') || isPrivate !== (initialIsPrivate ?? true) || publicIssues !== (initialPublicIssues ?? false) || lang !== (initialLang || '');

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

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
    setDeleteError(null);
    setDeleteConfirmText('');
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete forever') {
      setDeleteError('Please type "delete forever" to confirm');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteTranscription({ transcriptionId });
      // Success handling is done in the hook's onSuccess callback
    } catch (error) {
      // Error handling is done in the hook's onError callback
      console.error('Delete failed:', error);
    }
  };

  const handleDownload = async () => {
    if (!transcription.source) return;

    setIsDownloading(true);
    try {
      // Generate a fresh signed URL
      const signedUrl = await generateSignedUrl(transcription.source);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = transcription.getSourceFilename();
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      // Could add error state/toast here if needed
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-[72px] bottom-0 flex flex-col bg-gray-50">
      {/* Page Header (sticky within page container) */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm" style={{ height: '65px' }}>
        <div className="max-w-7xl mx-auto px-3 md:px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <Settings className="text-gray-600 flex-shrink-0" size={20} />
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">Transcription Settings</h1>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <span className="hidden md:inline">Cancel</span>
                <span className="md:hidden">✕</span>
              </button>
              {hasChanges && (
                <button
                  onClick={() => {
                        setTitle(initialTitle);
    setComments(initialComments || '');
    setIsPrivate(initialIsPrivate ?? true);
    setPublicIssues(initialPublicIssues ?? false);
    setLang(initialLang || '');
                  }}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges || !isOwner}
                className="inline-flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={16} />
                <span className="hidden md:inline">Save Changes</span>
                <span className="md:hidden">Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-7xl mx-auto px-3 md:px-4 lg:px-8 py-4 md:py-6 pb-16">
        {/* Content Area */}
        <div className="space-y-6 md:space-y-8">
          {/* Settings Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-2 md:gap-3 pb-2 md:pb-3 border-b border-gray-200">
                <FileText className="text-blue-600" size={18} />
                <h2 className="text-base md:text-lg font-semibold text-gray-900">General</h2>
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
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label htmlFor="isPublic" className="block text-md font-medium text-gray-700">
                            Is Discoverable?
                          </label>
                          <p className="text-xs text-gray-500 mt-1 mr-1">
                            Analyzed text will be discoverable by authenticated users within the Language Database (coming soon...)
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!isPrivate}
                          onClick={() => {
                            const newIsPrivate = !isPrivate;
                            setIsPrivate(newIsPrivate);
                            
                            // If toggles are "in sync", toggle publicIssues with isPrivate
                            const isDiscoverable = !isPrivate;
                            const areInSync = isDiscoverable === publicIssues;
                            if (areInSync) {
                              setPublicIssues(!newIsPrivate);
                            }
                          }}
                          disabled={!isOwner}
                          className={`
                            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                            ${!isPrivate ? 'bg-blue-600' : 'bg-gray-200'}
                          `}
                        >
                          <span
                            aria-hidden="true"
                            className={`
                              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                              ${!isPrivate ? 'translate-x-5' : 'translate-x-0'}
                            `}
                          />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label htmlFor="publicIssues" className="block text-md font-medium text-gray-700">
                            Publish Issues?
                          </label>
                          <p className="text-xs text-gray-500 mt-1 mr-1">
                            Issues created on this transcription will be visible to authenticated users in the Issue Browser (coming soon...)
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={publicIssues}
                          onClick={() => setPublicIssues(!publicIssues)}
                          disabled={!isOwner}
                          className={`
                            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                            ${publicIssues ? 'bg-blue-600' : 'bg-gray-200'}
                          `}
                        >
                          <span
                            aria-hidden="true"
                            className={`
                              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                              ${publicIssues ? 'translate-x-5' : 'translate-x-0'}
                            `}
                          />
                        </button>
                      </div>
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
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-2 md:gap-3 pb-2 md:pb-3 border-b border-gray-200">
                <FileText className="text-green-600" size={18} />
                <h2 className="text-base md:text-lg font-semibold text-gray-900">Information</h2>
              </div>

              <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Total Issues</label>
                    <p className="text-base text-gray-900 mt-1">{transcription.data.issueCount ?? Number(transcription.data.issues) ?? 0}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Source File</label>
                    {transcription.source ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base text-gray-900 break-all flex-1">{transcription.getSourceFilename()}</span>
                        <button
                          onClick={handleDownload}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Download original file"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download size={12} />
                              Download
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="text-base text-gray-900 mt-1 break-all">Unknown</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sharing & Collaboration Section - Full Width (Owners Only) */}
          {isOwner && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-2 md:gap-3 pb-2 md:pb-3 border-b border-gray-200">
                <Users className="text-purple-600" size={18} />
                <h2 className="text-base md:text-lg font-semibold text-gray-900">Sharing & Collaboration</h2>
              </div>

              {/* Send New Invite */}
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <UserPlus className="text-blue-600" size={18} />
                  <h3 className="text-sm font-semibold text-blue-900">Send Invitation</h3>
                </div>
                
                <div className="space-y-3 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
                  <div>
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
                <div className="p-4 mb-8 border-b border-gray-200">
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

          {/* Danger Zone Section - Full Width (Owners Only) */}
          {isOwner && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-2 md:gap-3 pb-2 md:pb-3 border-b border-red-200">
                <AlertTriangle className="text-red-600" size={18} />
                <h2 className="text-base md:text-lg font-semibold text-red-900">Danger Zone</h2>
              </div>

              <div className="bg-red-50 p-4 md:p-6 rounded-lg border border-red-200">
                <div className="space-y-4 md:space-y-0 md:flex md:items-start md:justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-900 mb-2">Delete Transcription</h3>
                    <p className="text-sm text-red-700 mb-4">
                      Permanently delete this transcription and all associated data including regions, issues, comments, and invitations. 
                      This action cannot be undone.
                    </p>
                    <ul className="text-xs text-red-600 space-y-1 mb-4">
                      <li>• All regions and their text will be deleted</li>
                      <li>• All issues and comments will be deleted</li>
                      <li>• All pending invitations will be revoked</li>
                      <li>• The audio file and analysis data will be removed</li>
                    </ul>
                  </div>
                  <button
                    onClick={handleDeleteClick}
                    className="w-full md:w-auto md:ml-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete Transcription
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-800/60 backdrop-saturate-0 transition-opacity" onClick={handleDeleteCancel}></div>
            
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
                      This action will permanently delete <strong>"{title}"</strong> and all associated data. 
                      This cannot be undone.
                    </p>
                    
                    <div className="mb-4">
                      <label htmlFor="deleteConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                        Type <strong>"delete forever"</strong> to confirm:
                      </label>
                      <input
                        id="deleteConfirm"
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="delete forever"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        disabled={isDeleting}
                      />
                    </div>

                    {deleteError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        {deleteError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting || deleteConfirmText.toLowerCase() !== 'delete forever'}
                  className="inline-flex w-full justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};