import type { AppMode } from '../services/appModeService';

// HTMLMediaElement MediaError codes
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

/** A message the person can act on, for a media element error code. */
export const mediaErrorMessage = (code: number | undefined, mode: AppMode): string => {
  if (code === MEDIA_ERR_DECODE) {
    return "This browser couldn't play the recording. The file may be damaged or in a format the browser doesn't support.";
  }
  if (mode === 'local') {
    if (code === MEDIA_ERR_SRC_NOT_SUPPORTED) {
      return "This browser can't play this file's format, or the file is no longer stored on this device.";
    }
    return "The recording couldn't be read from this device.";
  }
  if (code === MEDIA_ERR_NETWORK) {
    return "The recording couldn't be downloaded. Check your connection.";
  }
  if (code === MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return "The recording couldn't be loaded. Its access link may have expired.";
  }
  return "The recording couldn't be loaded.";
};
