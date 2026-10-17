/**
 * Media files for local projects, kept in the Origin Private File System (OPFS).
 * Files are streamed in, so large recordings are never held in memory.
 */

const MEDIA_DIR = 'local-media';
const SOURCE_PREFIX = 'local-media:';

const mediaDir = async (): Promise<FileSystemDirectoryHandle> => {
  let root: FileSystemDirectoryHandle;
  try {
    root = await navigator.storage.getDirectory();
  } catch (error) {
    // Safari private windows (and other ephemeral sessions) refuse on-device file storage.
    console.error('OPFS unavailable:', error);
    throw new Error(
      "This browser won't let Transcribe store files on this device (are you in a private window?). " +
        'Local transcriptions need on-device storage.'
    );
  }
  return root.getDirectoryHandle(MEDIA_DIR, { create: true });
};

/** The `source` value stored on a local transcription; resolves to the project's media file. */
export const sourceForProject = (projectId: string): string => `${SOURCE_PREFIX}${projectId}`;

export const projectIdFromSource = (source: string): string => {
  if (!source.startsWith(SOURCE_PREFIX)) {
    throw new Error(`Not a local media source: ${source}`);
  }
  return source.slice(SOURCE_PREFIX.length);
};

export const putMedia = async (projectId: string, file: File): Promise<void> => {
  const handle = await (await mediaDir()).getFileHandle(projectId, { create: true });
  const writable = await handle.createWritable();
  await file.stream().pipeTo(writable);
};

export const getMediaFile = async (projectId: string): Promise<File> => {
  const handle = await (await mediaDir()).getFileHandle(projectId);
  return handle.getFile();
};

export const deleteMedia = async (projectId: string): Promise<void> => {
  await (await mediaDir()).removeEntry(projectId);
};

/** Every project id that has a media file on this device. */
export const listMediaIds = async (): Promise<string[]> => {
  const ids: string[] = [];
  for await (const name of (await mediaDir()).keys()) ids.push(name);
  return ids;
};

const CREATE_LOCK_PREFIX = 'kiyanaw-local-create:';

/**
 * Runs `work` while holding a lock that marks the project as being created, so cleanup in this
 * or another tab never deletes media that is still being written. Locks die with the page,
 * so a reload mid-create leaves an unlocked orphan that cleanup can remove.
 */
export const whileCreating = <T>(projectId: string, work: () => Promise<T>): Promise<T> =>
  navigator.locks.request(`${CREATE_LOCK_PREFIX}${projectId}`, work);

/** Runs cleanup one at a time across tabs, so two passes never race to delete the same file. */
export const withCleanupLock = <T>(work: () => Promise<T>): Promise<T> =>
  navigator.locks.request('kiyanaw-local-cleanup', work);

/** Project ids currently being created (in any tab). */
export const idsBeingCreated = async (): Promise<string[]> => {
  const { held = [], pending = [] } = await navigator.locks.query();
  return [...held, ...pending]
    .map((lock) => lock.name ?? '')
    .filter((name) => name.startsWith(CREATE_LOCK_PREFIX))
    .map((name) => name.slice(CREATE_LOCK_PREFIX.length));
};

/**
 * Returns a fresh blob: URL for a local source. Never cache it: WaveSurfer revokes `blob:` sources
 * when the player is destroyed or its source changes, so a reused URL is dead after navigating
 * away and back.
 */
export const getMediaUrl = async (source: string): Promise<string> =>
  URL.createObjectURL(await getMediaFile(projectIdFromSource(source)));
