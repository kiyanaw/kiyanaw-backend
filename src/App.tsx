import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useEffect } from 'react';
import { AuthenticatorShell } from './components/auth/AuthenticatorShell';
import { AppLayout } from './components/layout/AppLayout';
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
import './App.css';

function App() {
  const { showConflictDialog, ConflictDialogComponent } = useConflictDialog();

  // Register the dialog function with the global manager
  useEffect(() => {
    conflictDialogManager.setDialogFunction(showConflictDialog);
    console.debug('🔧 Conflict dialog manager initialized');
  }, [showConflictDialog]);

  return (
    <AuthenticatorShell>
      <Router>
        <Routes>
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
            <Route path="support" element={<SupportPage />} />
            <Route path="issue-browser" element={<IssueBrowserPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>
      
      {/* Global conflict resolution dialog */}
      <ConflictDialogComponent />
    </AuthenticatorShell>
  );
}

export default App;
