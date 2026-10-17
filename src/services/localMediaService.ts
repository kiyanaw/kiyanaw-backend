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

const objectUrls = new Map<string, string>();

/** Returns a blob: URL for a local source, reusing one URL per project for the page's lifetime. */
export const getMediaUrl = async (source: string): Promise<string> => {
  const projectId = projectIdFromSource(source);
  const existing = objectUrls.get(projectId);
  if (existing) return existing;
  const url = URL.createObjectURL(await getMediaFile(projectId));
  objectUrls.set(projectId, url);
  return url;
};
