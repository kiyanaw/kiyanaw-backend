export type AppMode = 'cloud' | 'local';

/** All local-mode routes live under this path; anything else boots the cloud app. */
export const LOCAL_ROOT = '/local';

export const detectAppMode = (pathname: string): AppMode =>
  pathname === LOCAL_ROOT || pathname.startsWith(`${LOCAL_ROOT}/`) ? 'local' : 'cloud';

/** URL of the editor (optionally deep-linked to a region) for the given mode. */
export const editorPath = (mode: AppMode, transcriptionId: string, regionId?: string): string => {
  const base = mode === 'local' ? `${LOCAL_ROOT}/edit/${transcriptionId}` : `/transcribe-edit/${transcriptionId}`;
  return regionId ? `${base}/${regionId}` : base;
};

/**
 * Content Security Policy for local mode. Blocks every request that isn't to the app's
 * own origin (or blob:/data:), so nothing can leave the device even by mistake.
 */
export const localModeCsp = (allowDevServer: boolean): string =>
  [
    "default-src 'self'",
    `connect-src 'self' blob: data:${allowDevServer ? ' ws: wss:' : ''}`,
    "media-src 'self' blob:",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self'${allowDevServer ? " 'unsafe-inline'" : ''}`,
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
  ].join('; ');
