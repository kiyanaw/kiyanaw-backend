import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Mail, User, Calendar, FileText, X } from 'lucide-react';

import { useLoadMyInvites } from '../hooks/useLoadMyInvites';
import { useLoadInvite } from '../hooks/useLoadInvite';
import { useAcceptInvite } from '../hooks/useAcceptInvite';
import { useAuthStore } from '../stores/useAuthStore';
import type { InviteWithValidation } from '../services/inviteService';

/**
 * Invitations Page
 * 
 * Shows a table of all user invitations with their status
 * Can open individual invites in a dialog via URL parameter
 */
export const InvitationsPage = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const userEmail = useAuthStore((state) => state.user?.username);
  const { invites, loading, error, loadMyInvites } = useLoadMyInvites();

  // Load invites when user becomes available
  useEffect(() => {
    if (userEmail) {
      loadMyInvites(userEmail);
    }
  }, [userEmail, loadMyInvites]); // Load when user changes

  const closeDialog = () => {
    navigate('/invitations');
  };

  const openInvite = (id: string) => {
    navigate(`/invitations/${id}`);
  };

  const getStatusBadge = (invite: InviteWithValidation) => {
    if (invite.validation.isAccepted) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Accepted
        </span>
      );
    }
    
    if (invite.validation.isExpired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expired
        </span>
      );
    }
    
    if (invite.validation.isPending) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <AlertCircle className="w-3 h-3 mr-1" />
        {invite.invite.status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-gray-600">Loading invitations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Failed to Load Invitations</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => userEmail && loadMyInvites(userEmail)}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-[72px] bottom-0 flex flex-col bg-gray-50">
      {/* Page Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Invitations</h1>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="container mx-auto px-4 py-8">

      {invites.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Invitations</h3>
          <p className="text-gray-600">
            You don't have any collaboration invitations yet.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Layout */}
          <div className="md:hidden space-y-3">
            {invites.map((inviteWithValidation) => {
              const { invite } = inviteWithValidation;
              return (
                <div
                  key={invite.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openInvite(invite.id)}
                >
                  {/* Top Row: Status + Transcription Title */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center mb-1">
                        <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {invite.transcriptionTitle}
                        </h3>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                        <span>by {invite.invitedByFriendly}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(inviteWithValidation)}
                    </div>
                  </div>

                  {/* Mobile Meta Info - Stacked */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Permission</span>
                      <span className="text-gray-700 capitalize font-medium">{invite.permissionLevel}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Invited</span>
                      <span className="text-gray-700">{formatDate(invite.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Expires</span>
                      <span className="text-gray-700">{formatDate(invite.expiresAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transcription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invited By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invited
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invites.map((inviteWithValidation) => {
                    const { invite } = inviteWithValidation;
                    return (
                      <tr
                        key={invite.id}
                        data-testid="invite-row"
                        data-transcription-title={invite.transcriptionTitle}
className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openInvite(invite.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(inviteWithValidation)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900 font-medium">{invite.transcriptionTitle}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{invite.invitedByFriendly}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 capitalize">{invite.permissionLevel}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invite.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(invite.expiresAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            data-testid="view-details-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openInvite(invite.id);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

        </div>
      </div>

      {/* Invite Dialog */}
      {inviteId && (
        <InviteDialog 
          inviteId={inviteId} 
          onClose={closeDialog}
          onAccepted={() => userEmail && loadMyInvites(userEmail)}
        />
      )}
    </div>
  );
};

interface InviteDialogProps {
  inviteId: string;
  onClose: () => void;
  onAccepted: () => void;
}

const InviteDialog = ({ inviteId, onClose, onAccepted }: InviteDialogProps) => {
  const navigate = useNavigate();
  const userEmail = useAuthStore((state) => state.user?.username);
  const { invite, loading, error, validation, loadInviteById, clearCurrentInvite } = useLoadInvite();
  const acceptInvite = useAcceptInvite();

  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Load invite when dialog opens
  useEffect(() => {
    if (userEmail && inviteId) {
      loadInviteById(inviteId, userEmail);
    }
  }, [inviteId, userEmail, loadInviteById]);

  // Clear invite when dialog closes
  const handleClose = () => {
    clearCurrentInvite();
    onClose();
  };

  const handleAcceptInvite = async () => {
    if (!invite || !validation?.canAccept) {
      return;
    }

    setAccepting(true);
    setAcceptError(null);

    try {
      console.log('🔄 Accepting invite:', invite.id);
      
      const result = await acceptInvite(invite.id);
      
      console.log('✅ Invite accepted successfully:', result);
      setAcceptSuccess(true);
      
      // Refresh the invites list
      onAccepted();
      
      // Redirect to the transcription after a short delay
      setTimeout(() => {
        navigate(`/transcribe-edit/${invite.transcriptionId}`);
      }, 2000);
    } catch (error) {
      console.error('❌ Failed to accept invite:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept invitation';
      setAcceptError(errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  const getStatusIcon = () => {
    if (acceptSuccess) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
    
    if (!validation) return null;
    
    if (validation.isAccepted) {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    }
    
    if (validation.isExpired) {
      return <AlertCircle className="w-6 h-6 text-red-600" />;
    }
    
    if (validation.isPending) {
      return <Clock className="w-6 h-6 text-yellow-600" />;
    }
    
    return <AlertCircle className="w-6 h-6 text-gray-600" />;
  };

  const getStatusText = () => {
    if (acceptSuccess) {
      return 'Invitation Accepted!';
    }
    
    if (!validation) return 'Loading...';
    
    if (validation.isAccepted) {
      return 'Already Accepted';
    }
    
    if (validation.isExpired) {
      return 'Invitation Expired';
    }
    
    if (validation.isPending) {
      return 'Pending Invitation';
    }
    
    return 'Invalid Invitation';
  };

  const getStatusMessage = () => {
    if (acceptSuccess) {
      return 'You have successfully accepted this invitation! You will be redirected to the transcription shortly.';
    }
    
    if (!validation) return null;
    
    if (validation.isAccepted) {
      return 'This invitation has already been accepted. You can access the transcription using the button below.';
    }
    
    if (validation.isExpired) {
      return 'This invitation has expired and can no longer be accepted. Please contact the person who invited you for a new invitation.';
    }
    
    if (validation.isPending && validation.canAccept) {
      return `You have been invited to collaborate on "${invite?.transcriptionTitle}". Click the button below to accept the invitation.`;
    }
    
    return 'This invitation is not valid or you do not have permission to accept it.';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invitation Details</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
              <span className="text-gray-600">Loading invitation...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : invite ? (
            <>
              {/* Status Header */}
              <div className="flex items-center justify-center mb-6">
                {getStatusIcon()}
                <h3 className="text-xl font-semibold text-gray-900 ml-3">
                  {getStatusText()}
                </h3>
              </div>

              {/* Status Message */}
              <p className="text-gray-600 text-center mb-6">
                {getStatusMessage()}
              </p>

              {/* Invitation Details */}
              <div className="border rounded-lg p-4 mb-6 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Details</h4>
                
                                 <div className="space-y-3">
                   <div className="flex items-center">
                     <FileText className="w-4 h-4 text-gray-400 mr-3" />
                     <div>
                       <span className="text-sm text-gray-500">Transcription:</span>
                       <p className="text-gray-900 font-medium">{invite.transcriptionTitle}</p>
                     </div>
                   </div>

                   <div className="flex items-center">
                     <Mail className="w-4 h-4 text-gray-400 mr-3" />
                     <div>
                       <span className="text-sm text-gray-500">Invited to:</span>
                       <p className="text-gray-900">{invite.email}</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center">
                     <User className="w-4 h-4 text-gray-400 mr-3" />
                     <div>
                       <span className="text-sm text-gray-500">Invited by:</span>
                       <p className="text-gray-900">{invite.invitedByFriendly}</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center">
                     <FileText className="w-4 h-4 text-gray-400 mr-3" />
                     <div>
                       <span className="text-sm text-gray-500">Permission level:</span>
                       <p className="text-gray-900 capitalize">{invite.permissionLevel}</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center">
                     <Calendar className="w-4 h-4 text-gray-400 mr-3" />
                     <div>
                       <span className="text-sm text-gray-500">Expires:</span>
                       <p className="text-gray-900">{invite.expiresAtFormatted}</p>
                     </div>
                   </div>
                 </div>
              </div>

              {/* Error Message */}
              {acceptError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                    <p className="text-red-800 text-sm">{acceptError}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {acceptSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <p className="text-green-800 text-sm">
                      Invitation accepted successfully! Redirecting you to the transcription...
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Dialog Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          {validation?.canAccept && !acceptSuccess && (
            <button
              data-testid="accept-invitation-button"
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
            >
              {accepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </button>
          )}
          
          {(validation?.isAccepted || acceptSuccess) && invite && (
            <button
              onClick={() => navigate(`/transcribe-edit/${invite.transcriptionId}`)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Open Transcription
            </button>
          )}
          
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 