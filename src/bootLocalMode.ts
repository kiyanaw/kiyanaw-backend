import { applyServiceOverrides, services } from './services';
import { localModeCsp } from './services/appModeService';
import * as localTranscriptionService from './services/localTranscriptionService';
import * as localRegionService from './services/localRegionService';
import * as localIssueService from './services/localIssueService';
import { getMediaUrl } from './services/localMediaService';
import { wavesurferService } from './services/wavesurferService';
import { useAuthStore } from './stores/useAuthStore';
import { useAppModeStore } from './stores/useAppModeStore';

/**
 * Boots the app in local mode: nothing is configured to talk to the backend,
 * and a Content Security Policy makes any request to another origin fail.
 * Must run before anything else can make a request.
 */
export const bootLocalMode = (): void => {
  const csp = document.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = localModeCsp(import.meta.env.DEV);
  document.head.prepend(csp);

  applyServiceOverrides({
    transcriptionService: { ...services.transcriptionService, ...localTranscriptionService },
    regionService: { ...services.regionService, ...localRegionService },
    issueService: { ...services.issueService, ...localIssueService },
  });
  wavesurferService.setMediaUrlResolver(getMediaUrl);

  useAuthStore.getState().setUser({ ...localTranscriptionService.LOCAL_USER });
  useAppModeStore.getState().setMode('local');
};
