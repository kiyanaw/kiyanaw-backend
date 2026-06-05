import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Download, LogOut, HelpCircle, BookOpen, Database } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTranscriptionsStore } from '../../stores/useTranscriptionsStore';
import { useInviteStore } from '../../stores/useInviteStore';
import { useLoadMyInvites } from '../../hooks/useLoadMyInvites';
import { GuardedLink } from './GuardedLink';
import { signOut } from 'aws-amplify/auth';
import { clearTranscriptionCache } from '../../services/transcriptionService';
import { canPromptInstall, promptInstall, shouldShowInstall, isIosDevice } from '../../services/pwaInstallService';

export const AppLayout = () => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const signedIn = useAuthStore((state) => state.signedIn);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { pendingCount, loadMyInvites } = useLoadMyInvites();

  // Load invites for navigation badge when user becomes available
  useEffect(() => {
    if (user?.username) {
      loadMyInvites(user.username);
    }
  }, [user?.username, loadMyInvites]);

  const handleSignOut = async () => {
    try {
      await clearTranscriptionCache();
      useTranscriptionsStore.getState().reset();
      useInviteStore.getState().reset();
      await signOut();
      setProfileDropdownOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close profile dropdown when clicking outside (mobile menu handles its own backdrop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [profileDropdownOpen]);

  // Get user initials for the profile bubble
  const getUserInitials = (username: string) => {
    if (username.includes('@')) {
      // If it's an email, use the first two characters before @
      return username.substring(0, 2).toUpperCase();
    }
    // Otherwise, use first two characters
    return username.substring(0, 2).toUpperCase();
  };



  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[1000] flex items-center p-4 bg-ki-blue text-white shadow-md">
        <div className="flex-1 flex items-center gap-6">
          <img 
            src="/logo.png" 
            alt="kiyânaw Transcribe" 
            className="w-[40px] h-[40px] rounded-[3px] border border-white"
          />
          <nav className="hidden md:flex items-center gap-6 ml-5">
            <GuardedLink
              to="/transcribe-list"
              className="text-white hover:text-white/80 transition-colors duration-200 text-base font-medium"
            >
              Transcriptions
            </GuardedLink>
            <GuardedLink
              to="/invitations"
              className="text-white hover:text-white/80 transition-colors duration-200 text-base font-medium relative flex items-center"
            >
              Invitations
              {pendingCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </GuardedLink>
            <GuardedLink
              to="/database"
              className="text-white hover:text-white/80 transition-colors duration-200 text-base font-medium"
            >
              Database
            </GuardedLink>
            <a
              href="https://docs.kiyanaw.net/"
              target="_blank"
              rel="noreferrer"
              className="text-white hover:text-white/80 transition-colors duration-200 text-base font-medium"
            >
              Documentation
            </a>
          </nav>
        </div>

        {/* Centered brand text on mobile */}
        <div className="absolute inset-0 flex items-center justify-center md:hidden pointer-events-none">
          <span className="text-white font-semibold text-lg">kiyânaw</span>
        </div>

        <div className="flex items-center gap-4">
          {signedIn ? (
            <>
              {/* Mobile Hamburger Menu */}
              <div className="md:hidden">
                <button
                  onClick={toggleMobileMenu}
                  className="w-10 h-10 rounded flex items-center justify-center text-white transition-colors duration-200 focus:outline-none hover:text-white/90"
                  aria-label="Menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Desktop Profile Menu */}
              <div className="hidden md:block relative" ref={profileDropdownRef}>
                <button
                  onClick={toggleProfileDropdown}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full flex items-center justify-center text-white font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="Profile menu"
                >
                  {user?.username ? getUserInitials(user.username) : 'U'}
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[1001]">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm text-gray-500">Signed in as</div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user?.username}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Build: {import.meta.env.MODE === 'production' ? __BUILD_HASH__ : 'dev'}
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <GuardedLink
                        to="/support"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4" />
                        Support
                      </GuardedLink>
                      {shouldShowInstall() && (
                        <button
                          onClick={async () => {
                            setProfileDropdownOpen(false);
                            if (isIosDevice() || !canPromptInstall()) {
                              alert('To install: open the browser menu and choose "Add to Home screen". On iOS: Share → Add to Home Screen.');
                              return;
                            }
                            await promptInstall();
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Install App
                        </button>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="text-sm">Please sign in</span>
          )}
        </div>
      </header>

      

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-0 bg-gray-50 mt-[72px]">
        <Outlet />
      </main>

      {/* Mobile Side Drawer */}
      <>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-black/50 z-[1000] md:hidden transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        
        {/* Drawer */}
        <div 
          ref={mobileMenuRef}
          className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-[1001] md:hidden transform transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
            {/* User Info Header */}
            <div className="p-6 border-b border-gray-100 bg-white relative">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Signed in as</div>
              <div className="text-lg font-semibold text-gray-900 truncate mt-1 pr-10">
                {user?.username}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Build: {import.meta.env.MODE === 'production' ? __BUILD_HASH__ : 'dev'}
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 py-4">
              <GuardedLink
                to="/transcribe-list"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-6 py-3 text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
              >
                <svg className="w-5 h-5 text-gray-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">Transcriptions</span>
              </GuardedLink>
              <GuardedLink
                to="/invitations"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-6 py-3 text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 relative"
              >
                <svg className="w-5 h-5 text-gray-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Invitations</span>
                {pendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </GuardedLink>
              <GuardedLink
                to="/database"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-6 py-3 text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
              >
                <Database className="w-5 h-5 text-gray-600 mr-4" />
                <span className="font-medium">Database</span>
              </GuardedLink>

              <GuardedLink
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-6 py-3 text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
              >
                <HelpCircle className="w-5 h-5 text-gray-600 mr-4" />
                <span className="font-medium">Support</span>
              </GuardedLink>
              <a
                href="https://docs.kiyanaw.net/"
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-6 py-3 text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
              >
                <BookOpen className="w-5 h-5 text-gray-600 mr-4" />
                <span className="font-medium">Documentation</span>
              </a>

              {shouldShowInstall() && (
                <button
                  onClick={async () => {
                    if (isIosDevice() || !canPromptInstall()) {
                      alert('To install: open the browser menu and choose "Add to Home screen". On iOS: Share → Add to Home Screen.');
                      return;
                    }
                    await promptInstall();
                  }}
                  className="mx-6 mt-2 px-4 py-2 bg-ki-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Install App
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors duration-150"
              >
                <svg className="w-5 h-5 text-gray-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Sign out</span>
              </button>
            </div>
          </div>
      </>
    </div>
  );
};
