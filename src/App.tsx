import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthenticatorShell } from './components/auth/AuthenticatorShell';
import { AppLayout } from './components/layout/AppLayout';
import { TranscribeListPage } from './pages/TranscribeListPage';
import { StatsPage } from './pages/StatsPage';
import { AboutPage } from './pages/AboutPage';
import { UploadForm } from './components/upload/UploadForm';
import { EditorPage } from './pages/EditorPage';
import './App.css';

function App() {
  console.log('app')
  return (
    <AuthenticatorShell>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            {/* <Route index element={<Navigate to="/transcribe-list" replace />} /> */}
            {/* <Route path="transcribe-list" element={<TranscribeListPage />} />
            <Route path="transcribe-add" element={<UploadForm />} />
            <Route path="transcribe-edit/:id" element={<EditorPage />} /> */}
            <Route
              path="transcribe-edit/:id/:regionId"
              element={<EditorPage />}
            />
            {/* <Route path="stats" element={<StatsPage />} />
            <Route path="about" element={<AboutPage />} /> */}
          </Route>
        </Routes>
      </Router>
    </AuthenticatorShell>
  );
}

export default App;
