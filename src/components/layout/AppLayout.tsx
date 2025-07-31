import { useState, useRef, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLoadMyInvites } from '../../hooks/useLoadMyInvites';
import { signOut } from 'aws-amplify/auth';

export const AppLayout = () => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const signedIn = useAuthStore((state) => state.signedIn);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const { pendingCount } = useLoadMyInvites();

  const handleSignOut = async () => {
    try {
      await signOut();
      setProfileDropdownOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  // Close profile dropdown when clicking outside
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
            <Link
              to="/transcribe-list"
              className="text-white hover:text-white/80 transition-colors duration-200 text-base font-medium"
            >
              My transcriptions
            </Link>
            <Link
              to="/invitations"
              className="text-white hover:text-white/80 transition-colors duration-200 text-base font-medium relative flex items-center"
            >
              Invitations
              {pendingCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {signedIn ? (
            <div className="relative" ref={profileDropdownRef}>
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
                  </div>
                  
                  <div className="py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
                    >
                      <span>🚪</span>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm">Please sign in</span>
          )}
        </div>
      </header>

      

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-0 bg-gray-50 mt-[72px]">
        <Outlet />
      </main>
    </div>
  );
};
