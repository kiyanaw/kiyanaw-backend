import { useEffect, useState } from 'react';
import { countProjects } from '../services/localDbService';

/** How many local projects this device holds. Reads IndexedDB only; works before sign-in and offline. */
export const useLocalProjectCount = (): number | null => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    countProjects()
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch((error: unknown) => console.error('Could not read local projects:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
};
