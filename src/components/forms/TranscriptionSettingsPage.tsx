import { useState } from 'react';
import { X, FileText, Users, Settings, Mail, Send } from 'lucide-react';
import { post } from 'aws-amplify/api';

interface TranscriptionSettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  comments?: string;
  author: string;
  dateLastUpdated: string;
  regionCount: number;
  onSave: (updates: { title?: string; comments?: string }) => void;
  canEdit: boolean;
}

export const TranscriptionSettingsPage = ({
  isOpen,
  onClose,
  title: initialTitle,
  comments: initialComments,
  author,
  dateLastUpdated,
  regionCount,
  onSave,
  canEdit,
}: TranscriptionSettingsPageProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [comments, setComments] = useState(initialComments || '');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(Number(timestamp));
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const hasChanges = title !== initialTitle || comments !== (initialComments || '');

  const handleTestEmail = async () => {
    setTestEmailSending(true);
    setTestEmailResult(null);
    
    try {
      // Test data for the API Gateway endpoint
      const testData = {
        email: 'aaron.j.fay@gmail.com',
        transcriptionId: 'test-trans-123',
        transcriptionTitle: title || 'Test Transcription',
        permissionLevel: 'editor',
        invitedBy: author,
        invitedByFriendly: author, // Using author as friendly name for now
      };

      console.log('Calling invite API with data:', testData);
      
      // Call the API Gateway endpoint
      const response = await post({
        apiName: 'invite',
        path: '/invite',
        options: {
          body: testData
        }
      }).response;
      
      const result = await response.body.json() as { 
        success: boolean; 
        messageId?: string; 
        error?: string; 
        email?: string; 
        inviteId?: string; 
      };
      
      if (result && result.success) {
        setTestEmailResult({
          success: true,
          message: `Email sent successfully! MessageId: ${result.messageId}`,
        });
      } else {
        throw new Error(result?.error || 'API returned error');
      }
      
    } catch (error) {
      console.error('Failed to send test email:', error);
      setTestEmailResult({
        success: false,
        message: `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setTestEmailSending(false);
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* General Settings Section */}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed resize-vertical text-base"
                    placeholder="Add any comments about this transcription..."
                  />
                </div>
              </div>

              {!canEdit && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    You don't have permission to edit this transcription.
                  </p>
                </div>
              )}
            </div>

            {/* Information & Sharing Section */}
            <div className="space-y-6">
              {/* Information */}
              <div>
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <FileText className="text-green-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Information</h2>
                </div>

                <div className="mt-4 space-y-4">
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

              {/* Sharing & Testing */}
              <div>
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <Users className="text-purple-600" size={20} />
                  <h2 className="text-lg font-semibold text-gray-900">Sharing & Collaboration</h2>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Test Email Section */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <Mail className="text-blue-600" size={20} />
                      <h3 className="text-sm font-semibold text-blue-900">Test Invitation Email</h3>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      Test the invitation email functionality with sample data.
                    </p>
                    
                    <button
                      onClick={handleTestEmail}
                      disabled={testEmailSending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {testEmailSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Send Test Email
                        </>
                      )}
                    </button>

                    {/* Test Result */}
                    {testEmailResult && (
                      <div className={`mt-3 p-3 rounded-lg text-sm ${
                        testEmailResult.success 
                          ? 'bg-green-50 border border-green-200 text-green-800'
                          : 'bg-red-50 border border-red-200 text-red-800'
                      }`}>
                        <div className="flex items-start gap-2">
                          {testEmailResult.success ? (
                            <Mail className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                          ) : (
                            <X className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                          )}
                          <p>{testEmailResult.message}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Future Collaboration Features */}
                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="text-gray-400" size={20} />
                      <h3 className="text-sm font-semibold text-gray-600">Future Features</h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Real invitation system, user management, and collaboration features coming soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
              disabled={!canEdit || !hasChanges}
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