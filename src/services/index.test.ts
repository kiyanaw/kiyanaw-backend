import { services } from './index';

describe('Services Index', () => {
  it('should export pendingEditsService', () => {
    expect(services.pendingEditsService).toBeDefined();
    expect(typeof services.pendingEditsService.startEdit).toBe('function');
    expect(typeof services.pendingEditsService.endEdit).toBe('function');
    expect(typeof services.pendingEditsService.isEditing).toBe('function');
    expect(typeof services.pendingEditsService.getActivePendingEdits).toBe('function');
    expect(typeof services.pendingEditsService.cleanup).toBe('function');
  });

  it('should have all expected services', () => {
    const expectedServices = [
      'userService',
      'authService',
      'regionService',
      'transcriptionService',
      'wavesurferService',
      'browserService',
      'rteService',
      'spellCheckerService',
      'textHighlightService',
      'awsConfigService',
      'uploadService',
      'toastService',
      'inviteService',
      'storeService',
      'flashIndicatorService',
      'pendingEditsService',
    ];

    expectedServices.forEach(serviceName => {
      expect(services).toHaveProperty(serviceName);
    });
  });
}); 