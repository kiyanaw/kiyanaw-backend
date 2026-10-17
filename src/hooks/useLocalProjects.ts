import { useCallback, useEffect, useState } from 'react';
import { localServices } from '../services/localServices';
import type { TranscriptionModel } from '../services/adt';
import { CleanUpLocalMediaUseCase } from '../use-cases/clean-up-local-media';

/** Lists the local projects on this device, first clearing out media from any unfinished project. */
export const useLocalProjects = () => {
  const [projects, setProjects] = useState<TranscriptionModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    new CleanUpLocalMediaUseCase({ services: localServices })
      .execute()
      .then(() => localServices.localTranscriptionService.listLocalTranscriptions())
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
