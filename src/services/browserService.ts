class BrowserService {
  private static instance: BrowserService;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }
    return BrowserService.instance;
  }

  /**
   * Updates the current URL without triggering a page reload
   * Uses pushState to add a new entry to the browser history
   */
  updateUrl(path: string): void {
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState(null, '', path);
    }
  }

  /**
   * Replaces the current URL without triggering a page reload
   * Uses replaceState to replace the current history entry
   */
  replaceUrl(path: string): void {
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState(null, '', path);
    }
  }
}

// Export the singleton instance
export const browserService = BrowserService.getInstance(); 