class BrowserService {
  private static instance: BrowserService;
  private readonly DYNAMIC_STYLES_STYLESHEET_ID = 'dynamic-styles';
  private styleIdCounter = 0;
  private styleMap = new Map<string, { selector: string; ruleIndex: number }>();

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

  /**
   * Gets or creates the dynamic stylesheet for custom styles
   */
  private getOrCreateDynamicStylesheet(): HTMLStyleElement | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }
    
    let styleSheet = document.getElementById(this.DYNAMIC_STYLES_STYLESHEET_ID) as HTMLStyleElement;
    if (!styleSheet) {
      styleSheet = document.createElement('style');
      styleSheet.id = this.DYNAMIC_STYLES_STYLESHEET_ID;
      document.head.appendChild(styleSheet);
    }
    return styleSheet;
  }

  /**
   * Adds a custom CSS rule and returns an ID for later removal
   * @param selector CSS selector (e.g., 'div#myElement', '.myClass')
   * @param styles CSS styles object (e.g., { backgroundColor: 'red', color: 'white' })
   * @returns Unique ID for this style rule that can be used for removal
   */
  addCustomStyle(selector: string, styles: Record<string, string>): string {
    if (typeof window === 'undefined' || typeof document === 'undefined') return '';

    const styleSheet = this.getOrCreateDynamicStylesheet();
    if (!styleSheet) return '';
    
    const styleId = `style-${++this.styleIdCounter}`;
    
    // Convert styles object to CSS string
    const styleString = Object.keys(styles)
      .map(property => `${property}: ${styles[property]}`)
      .join('; ');
    
    const rule = `${selector} { ${styleString}; }`;
    
    if (styleSheet.sheet) {
      const ruleIndex = styleSheet.sheet.cssRules.length;
      styleSheet.sheet.insertRule(rule, ruleIndex);
      
      // Store mapping for later removal
      this.styleMap.set(styleId, { selector, ruleIndex });
    }
    
    return styleId;
  }

  /**
   * Removes a custom CSS rule by its ID
   * @param styleId The ID returned from addCustomStyle()
   */
  removeCustomStyle(styleId: string): void {
    if (typeof window === 'undefined') return;

    const styleInfo = this.styleMap.get(styleId);
    if (!styleInfo) return;

    const styleSheet = document.getElementById(this.DYNAMIC_STYLES_STYLESHEET_ID) as HTMLStyleElement;
    if (styleSheet && styleSheet.sheet) {
      const rules = styleSheet.sheet.cssRules;
      
      // Find the rule by selector and remove it
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i] as CSSStyleRule;
        if (rule.selectorText === styleInfo.selector) {
          styleSheet.sheet.deleteRule(i);
          break;
        }
      }
    }
    
    // Clean up our mapping
    this.styleMap.delete(styleId);
  }

  /**
   * Clears all custom styles (useful for cleanup)
   */
  clearAllCustomStyles(): void {
    if (typeof window === 'undefined') return;

    const styleSheet = document.getElementById(this.DYNAMIC_STYLES_STYLESHEET_ID) as HTMLStyleElement;
    if (styleSheet && styleSheet.sheet) {
      while (styleSheet.sheet.cssRules.length > 0) {
        styleSheet.sheet.deleteRule(0);
      }
    }
    
    // Clear our mapping
    this.styleMap.clear();
    this.styleIdCounter = 0;
  }
}

// Export the singleton instance
export const browserService = BrowserService.getInstance(); 