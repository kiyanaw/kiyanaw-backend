import Timeout from 'smart-timeout';

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  Timeout.set('toast-animate-in', () => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Remove after 3 seconds
  Timeout.set('toast-remove', () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    Timeout.set('toast-cleanup', () => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}; 