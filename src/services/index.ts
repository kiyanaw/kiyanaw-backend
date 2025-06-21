import * as authService from './userService';
import * as regionService from './regionService'
import * as transcriptionService from './transcriptionService';
import { wavesurferService } from './wavesurferService'
import { browserService } from './browserService';
import { rteService } from './rteService';
import { spellCheckerService } from './spellCheckerService';
import { textHighlightService } from './textHighlightService';

export const services = {
  userService: authService,
  authService,
  regionService,
  transcriptionService,
  wavesurferService,
  browserService,
  rteService,
  spellCheckerService,
  textHighlightService,
};
