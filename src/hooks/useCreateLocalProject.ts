import { useCallback } from 'react';
import { CreateLocalProjectUseCase } from '../use-cases/create-local-project';
import { localServices } from '../services/localServices';

export const useCreateLocalProject = () =>
  useCallback(
    (title: string, file: File) =>
      new CreateLocalProjectUseCase({
        title,
        file,
        services: localServices,
        newId: () => crypto.randomUUID(),
        now: () => new Date().toISOString(),
      }).execute(),
    []
  );
