import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useEffect } from 'react';
import { AuthenticatorShell } from './components/auth/AuthenticatorShell';
import { AppLayout } from './components/layout/AppLayout';
import { SupportLayout } from './components/layout/SupportLayout';
import { TranscribeListPage } from './pages/TranscribeListPage';
import { StatsPage } from './pages/StatsPage';
import { AboutPage } from './pages/AboutPage';
import { SupportPage } from './pages/SupportPage';
import { UploadForm } from './components/upload/UploadForm';
import { EditorPage } from './pages/EditorPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { InvitationsPage } from './pages/InvitationsPage';
import IssueBrowserPage from './pages/IssueBrowserPage';
import { DatabaseHomePage } from './pages/DatabaseHomePage';
import { DatabaseLemmaPage } from './pages/DatabaseLemmaPage';
import { useConflictDialog } from './hooks/useConflictDialog';
import { conflictDialogManager } from './services/conflictDialogManager';
import { LocalLayout } from './components/layout/LocalLayout';
import { LocalProjectsPage } from './pages/LocalProjectsPage';
import { LOCAL_ROOT, type AppMode } from './services/appModeService';
import './App.css';

function App({ mode }: { mode: AppMode }) {
  const { showConflictDialog, ConflictDialogComponent } = useConflictDialog();

  // Register the dialog function with the global manager
  useEffect(() => {
    conflictDialogManager.setDialogFunction(showConflictDialog);
    console.debug('🔧 Conflict dialog manager initialized');
  }, [showConflictDialog]);

  return (
    <>
      <Router>
        {mode === 'local' ? (
          <Routes>
            {/* Local mode: no account, no backend. Only these routes exist. */}
            <Route path={LOCAL_ROOT} element={<LocalLayout />}>
              <Route index element={<LocalProjectsPage />} />
              <Route path="edit/:id" element={<EditorPage />} />
              <Route path="edit/:id/:regionId" element={<EditorPage />} />
            </Route>
            <Route path="*" element={<Navigate to={LOCAL_ROOT} replace />} />
          </Routes>
        ) : (
          <Routes>
            {/* Public routes — no authentication required */}
            <Route element={<SupportLayout />}>
              <Route path="/support" element={<SupportPage />} />
            </Route>

            {/* Authenticated routes */}
            <Route element={<AuthenticatedShell />}>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/transcribe-list" replace />} />
                <Route path="transcribe-list" element={<TranscribeListPage />} />
                <Route path="transcribe-add" element={<UploadForm />} />
                <Route path="transcribe-edit/:id" element={<EditorPage />} />
                <Route
                  path="transcribe-edit/:id/:regionId"
                  element={<EditorPage />}
                />
                <Route path="invitations" element={<InvitationsPage />} />
                <Route path="invitations/:inviteId" element={<InvitationsPage />} />
                <Route path="database" element={<DatabaseHomePage />} />
                <Route path="database/lemma/:lemma" element={<DatabaseLemmaPage />} />
                <Route path="stats" element={<StatsPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="issue-browser" element={<IssueBrowserPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        )}
      </Router>

      {/* Global conflict resolution dialog */}
      <ConflictDialogComponent />
    </>
  );
}

function AuthenticatedShell() {
  return (
    <AuthenticatorShell>
      <Outlet />
    </AuthenticatorShell>
  );
}

export default App;
