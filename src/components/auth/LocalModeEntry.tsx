import { HardDrive } from 'lucide-react';
import { useLocalProjectCount } from '../../hooks/useLocalProjectCount';
import { LOCAL_ROOT } from '../../services/appModeService';

/**
 * Sign-in page entry into local mode. A plain link (full page load) so local mode boots
 * without the backend configured.
 */
export const LocalModeEntry = () => {
  const count = useLocalProjectCount();
  if (count === null) return null;

  return (
    <div className="flex justify-center mt-6 mb-10">
      {count > 0 ? (
        <a
          href={LOCAL_ROOT}
          data-testid="local-mode-entry"
          className="inline-flex items-center gap-2 rounded-lg border border-ki-blue/30 bg-white px-4 py-2 text-sm font-medium text-ki-blue hover:bg-ki-blue/5"
        >
          <HardDrive size={16} />
          My local transcriptions ({count})
        </a>
      ) : (
        <a href={LOCAL_ROOT} data-testid="local-mode-entry" className="text-sm text-gray-500 hover:text-ki-blue underline">
          Work offline: open a local file, no account needed
        </a>
      )}
    </div>
  );
};
