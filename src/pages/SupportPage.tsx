import { useState } from 'react';
import { Copy, Check, MessageCircle, Users } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

export const SupportPage = () => {
  const [emailCopied, setEmailCopied] = useState(false);
  const signedIn = useAuthStore((state) => state.signedIn);
  const supportEmail = 'support@kiyanaw.net';
  const facebookMessengerUrl = 'https://m.me/115148727058478';
  const discordInviteUrl = 'https://discord.gg/ucekEKjvWz';

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = supportEmail;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const handleFacebookClick = () => {
    window.open(facebookMessengerUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDiscordClick = () => {
    window.open(discordInviteUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-full bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
          <p className="text-gray-600 mb-8">
            Need help? We're here to assist you.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          {/* Email Support */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-3">Email Support</h2>
            <p className="text-sm text-gray-600 mb-3">
              Send us an email and we'll get back to you as soon as possible.
            </p>
            <button
              onClick={handleCopyEmail}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ki-blue focus:border-transparent"
            >
              <span className="text-ki-blue font-medium">{supportEmail}</span>
              <div className="flex items-center">
                {emailCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-500">Click to copy</span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Facebook Messenger */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-3">Facebook Messenger</h2>
            <p className="text-sm text-gray-600 mb-3">
              Chat with us directly on Facebook Messenger for quick assistance.
            </p>
            <button
              onClick={handleFacebookClick}
              className="w-full flex items-center justify-center p-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:ring-opacity-50"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Contact us on Messenger</span>
            </button>
          </div>

          {/* Discord — only visible to signed-in users */}
          {signedIn && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-3">Discord Community</h2>
              <p className="text-sm text-gray-600 mb-3">
                Join our Discord server to connect with the community and get support from other users.
              </p>
              <button
                onClick={handleDiscordClick}
                className="w-full flex items-center justify-center p-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-opacity-50"
              >
                <Users className="w-5 h-5 mr-2" />
                <span className="font-medium">Join our Discord</span>
              </button>
            </div>
          )}

          {/* Additional Info */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              We typically respond to emails and messages within 24 hours during business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
