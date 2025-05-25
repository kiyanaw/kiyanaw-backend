import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './AppLayout.css';

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
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <button className="drawer-toggle" onClick={toggleDrawer}>
          ☰
        </button>
        <h1 className="app-title">Kiyânaw Transcription Platform</h1>
        <div className="auth-section">
          {signedIn ? (
            <div className="user-menu">
              <span>Welcome, {user?.username}</span>
              <button onClick={signOut} className="sign-out-btn">
                Sign out
              </button>
            </div>
          ) : (
            <span>Please sign in</span>
          )}
        </div>
      </header>

      {/* Navigation Drawer */}
      <nav className={`navigation-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-content">
          <ul className="nav-list">
            {navigationItems.map((item) => (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Overlay for mobile */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
