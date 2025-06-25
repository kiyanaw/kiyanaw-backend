import { showToast } from './toastService';
import Timeout from 'smart-timeout';

// Mock Timeout
jest.mock('smart-timeout', () => ({
  set: jest.fn(),
}));

const mockTimeout = Timeout as jest.Mocked<typeof Timeout>;

describe('ToastService', () => {
  const mockElement = {
    style: {
      cssText: '',
    },
    textContent: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DOM methods
    jest.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockElement as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockElement as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('showToast', () => {
    it('should create and append a toast element', () => {
      showToast('Test message');

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockElement);
      expect(mockElement.textContent).toBe('Test message');
    });

    it('should apply success styling by default', () => {
      showToast('Success message');

      expect(mockElement.style.cssText).toContain('#10b981'); // success color
    });

    it('should apply error styling when type is error', () => {
      showToast('Error message', 'error');

      expect(mockElement.style.cssText).toContain('#ef4444'); // error color
    });

    it('should set up animation timers correctly', () => {
      showToast('Test message');

      // Should set up 2 timers initially: animate-in and remove
      expect(mockTimeout.set).toHaveBeenCalledTimes(2);
      
      // Check animate-in timer (10ms delay)
      expect(mockTimeout.set).toHaveBeenCalledWith(
        'toast-animate-in',
        expect.any(Function),
        10
      );
      
      // Check remove timer (3000ms delay)
      expect(mockTimeout.set).toHaveBeenCalledWith(
        'toast-remove',
        expect.any(Function),
        3000
      );
    });

    it('should apply correct styles for positioning and appearance', () => {
      showToast('Test message');

      const styles = mockElement.style.cssText;
      expect(styles).toContain('position: fixed');
      expect(styles).toContain('top: 20px');
      expect(styles).toContain('right: 20px');
      expect(styles).toContain('color: white');
      expect(styles).toContain('z-index: 1000');
      expect(styles).toContain('opacity: 0');
      expect(styles).toContain('transform: translateX(100%)');
    });

    it('should handle multiple toast messages', () => {
      showToast('First message');
      showToast('Second message');

      expect(document.createElement).toHaveBeenCalledTimes(2);
      expect(document.body.appendChild).toHaveBeenCalledTimes(2);
    });
  });
}); 