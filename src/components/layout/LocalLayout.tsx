import { Outlet, Link } from 'react-router-dom';
import { HardDrive } from 'lucide-react';
import { LOCAL_ROOT } from '../../services/appModeService';

/** Chrome for local mode. No account, no backend: everything stays on this device. */
export const LocalLayout = () => (
  <div className="flex flex-col h-screen bg-gray-50">
    <header className="flex-shrink-0 flex items-center gap-4 px-4 py-3 bg-ki-blue text-white shadow-md">
      <img src="/logo.png" alt="kiyânaw Transcribe" className="w-[40px] h-[40px] rounded-[3px] border border-white" />
      <Link to={LOCAL_ROOT} className="font-semibold text-lg hover:text-white/80">
        My local transcriptions
      </Link>
      <span
        className="hidden sm:flex items-center gap-1 text-xs bg-white/15 rounded-full px-3 py-1"
        data-testid="local-mode-badge"
      >
        <HardDrive size={14} />
        Local: stored only on this device
      </span>
      <div className="flex-1" />
      {/* A full page load: switching to the cloud app re-boots with the backend configured. */}
      <a href="/" className="text-sm font-medium hover:text-white/80">
        Sign in
      </a>
    </header>
    <main className="flex-1 min-h-0 overflow-hidden">
      <Outlet />
    </main>
  </div>
);
