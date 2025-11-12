import * as authService from './userService';
import * as regionService from './regionService'
import * as transcriptionService from './transcriptionService';
import * as issueService from './issueService';
import * as commentService from './commentService';
import { wavesurferService } from './wavesurferService'
import { browserService } from './browserService';
import { rteService } from './rteService';
import { spellCheckerService } from './spellCheckerService';
import { textHighlightService } from './textHighlightService';
import { awsConfigService } from './awsConfigService';
import { uploadService } from './uploadService';
import * as toastService from './toastService';
import * as inviteService from './inviteService';
import { storeService } from './storeService';
import { flashIndicatorService } from './flashIndicatorService';
import { pendingEditsService } from './pendingEditsService';
import { conflictDetectionService } from './conflictDetectionService';
import { conflictResolutionService } from './conflictResolutionService';
import * as versionConflictService from './versionConflictService';
import { regionSaveManager } from './regionSaveManager';

export const services = {
  userService: authService,
  authService,
  regionService,
  transcriptionService,
  issueService,
  commentService,
  wavesurferService,
  browserService,
  rteService,
  spellCheckerService,
  textHighlightService,
  awsConfigService,
  uploadService,
  toastService,
  inviteService,
  storeService,
  flashIndicatorService,
  pendingEditsService,
  conflictDetectionService,
  conflictResolutionService,
  versionConflictService,
  regionSaveManager,
};

export { regionSaveManager } from './regionSaveManager';
