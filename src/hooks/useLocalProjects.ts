import { useCallback, useEffect, useState } from 'react';
import { localServices } from '../services/localServices';
import type { TranscriptionModel } from '../services/adt';

/** Lists the local projects stored on this device (straight pass-through to the local service). */
export const useLocalProjects = () => {
  const [projects, setProjects] = useState<TranscriptionModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    localServices.localTranscriptionService
      .listLocalTranscriptions()
      .then((list) => {
        setProjects(list);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { projects, error, reload };
};
