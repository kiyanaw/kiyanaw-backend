import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AppLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { signedIn, signOut, user } = useAuth();
  const location = useLocation();

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const navigationItems = [
    { path: '/transcribe-list', label: 'Transcriptions', icon: '📝' },
    { path: '/stats', label: 'Statistics', icon: '📊' },
    { path: '/about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[1000] flex items-center p-4 bg-ki-blue text-white shadow-md">
        <button 
          className="md:hidden mr-4 p-2 rounded hover:bg-white/10 text-xl"
          onClick={toggleDrawer}
        >
          ☰
        </button>
        <h1 className="flex-1 m-0 text-lg md:text-xl font-medium">
          Kiyânaw Transcription Platform
        </h1>
        <div className="flex items-center gap-4">
          {signedIn ? (
            <div className="flex items-center gap-4">
              <span className="hidden md:inline">Welcome, {user?.username}</span>
              <button 
                onClick={signOut} 
                className="bg-white/10 border border-white/30 text-white py-2 px-3 rounded text-sm hover:bg-white/20 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <span>Please sign in</span>
          )}
        </div>
      </header>

      {/* Navigation Drawer */}
      <nav className={`fixed top-0 left-0 w-64 h-screen bg-gray-100 border-r border-gray-300 z-[999] pt-20 transition-transform duration-300 ease-in-out ${
        drawerOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        <div className="py-4">
          <ul className="list-none m-0 p-0">
            {navigationItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center py-4 px-6 text-gray-800 no-underline transition-colors hover:bg-gray-300 ${
                    location.pathname === item.path ? 'bg-ki-blue text-white' : ''
                  }`}
                  onClick={() => setDrawerOpen(false)}
                >
                  <span className="mr-4 text-xl">{item.icon}</span>
                  <span className="text-base font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Overlay for mobile */}
      {drawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[998] md:hidden" 
          onClick={() => setDrawerOpen(false)} 
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-0 bg-gray-50 md:ml-64 mt-20">
        <Outlet />
      </main>
    </div>
  );
};
