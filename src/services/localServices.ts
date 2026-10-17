import * as localMediaService from './localMediaService';
import * as localPeaksService from './localPeaksService';
import * as localTranscriptionService from './localTranscriptionService';

/** Services only local mode uses (creating and listing on-device projects). */
export const localServices = {
  localMediaService,
  localPeaksService,
  localTranscriptionService,
};

export type LocalServices = typeof localServices;
