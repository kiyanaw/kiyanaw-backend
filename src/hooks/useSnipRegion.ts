import { useCallback, useState } from 'react';
import { SnipRegionUseCase } from '../use-cases/snip-region';
import { useEditorStore } from '../stores/useEditorStore';
import { currentUser } from '../services/userService';

/**
 * Download a single region as an MP3 clip (to share). Enabled for the transcription
 * owner, or for anyone when the transcription is public (isPrivate === false) — the
 * backend re-checks this authoritatively. Returns `canSnip` so the UI can gate the button.
 */
export const useSnipRegion = () => {
  const transcription = useEditorStore((state) => state.transcription);
  const [isSnipping, setIsSnipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = currentUser();
  const isOwner = !!user && !!transcription && transcription.author === user.userId;
  const isPublic = transcription?.isPrivate === false;
  const canSnip = isOwner || isPublic;

  const snip = useCallback(async (regionId: string): Promise<void> => {
    setError(null);
    setIsSnipping(true);
    try {
      const url = await new SnipRegionUseCase({ regionId, canSnip }).execute();
      // The presigned URL carries Content-Disposition: attachment with a friendly
      // filename, so a plain anchor click downloads the clip.
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Region snip failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to download the clip.');
      throw err;
    } finally {
      setIsSnipping(false);
    }
  }, [canSnip]);

  return { snip, isSnipping, error, canSnip };
};
