interface VideoPreferences {
  position: 'left' | 'center' | 'right';
  size: 'small' | 'big';
  isMinimized: boolean;
  zoom: number;
  speed: number;
}

import { isMobileViewport } from '../config/ui';

class BrowserService {
  private static instance: BrowserService;
  private readonly DYNAMIC_STYLES_STYLESHEET_ID = 'dynamic-styles';
  private styleIdCounter = 0;
  private styleMap = new Map<string, { selector: string; ruleIndex: number }>();
  private selectedRegionStyleId: string | null = null;

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

  /**
   * Extracts regionId from the current URL
   * Supports both query parameter (?regionId=xxx) and path segment patterns
   * @returns regionId if found, null otherwise
   */
  getRegionIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const url = new URL(window.location.href);
      
      // Check query parameter first: ?regionId=xxx
      const regionIdFromQuery = url.searchParams.get('regionId');
      if (regionIdFromQuery) {
        return regionIdFromQuery;
      }

      // Check path segments for patterns like: /transcribe-edit/transcriptionId/regionId
      const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
      
      // Look for pattern: ['transcribe-edit', transcriptionId, regionId]
      if (pathSegments.length >= 3 && pathSegments[0] === 'transcribe-edit') {
        const potentialRegionId = pathSegments[2];
        // Basic validation: region IDs should not be empty
        if (potentialRegionId && potentialRegionId.trim() !== '') {
          return potentialRegionId;
        }
      }

      return null;
    } catch (error) {
      console.warn('Error parsing URL for regionId:', error);
      return null;
    }
  }

  /**
   * Extracts issueId from the current URL
   * Supports query parameter (?issueId=xxx)
   */
  getIssueIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const url = new URL(window.location.href);
      const issueIdFromQuery = url.searchParams.get('issueId');
      return issueIdFromQuery && issueIdFromQuery.trim() !== '' ? issueIdFromQuery : null;
    } catch (error) {
      console.warn('Error parsing URL for issueId:', error);
      return null;
    }
  }

  /**
   * Adds or updates the selected issue in the URL as a query parameter without reloading
   */
  setSelectedIssue(issueId: string): void {
    if (typeof window === 'undefined' || !issueId || issueId.trim() === '') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('issueId', issueId);
      this.replaceUrl(url.toString());
    } catch {
      // Be resilient in non-browser environments
    }
  }

  /**
   * Clears the selected issue from the URL if present
   */
  clearSelectedIssue(): void {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('issueId');
      this.replaceUrl(url.toString());
    } catch {
      // Be resilient in non-browser environments
    }
  }

  /**
   * Gets the current URL pathname
   * @returns current pathname or empty string if window is undefined
   */
  getCurrentPath(): string {
    if (typeof window === 'undefined') return '';
    return window.location.pathname;
  }

  /**
   * Sets the selected region styling, clearing any previous selection
   * @param regionId The ID of the region to mark as selected
   */
  setSelectedRegion(regionId: string): void {
    // Clear previous selection
    this.clearSelectedRegion();
    
    // Apply new selection styling (only if regionId is not empty)
    if (regionId && regionId.trim() !== '') {
      const selector = `div#regionitem-${regionId}`;
      const styles = { 
        'border': '2px solid rgb(0, 170, 204) !important' // bolder version of playback blue
      };
      this.selectedRegionStyleId = this.addCustomStyle(selector, styles);
    }
  }

  /**
   * Clears the currently selected region styling
   */
  clearSelectedRegion(): void {
    if (this.selectedRegionStyleId) {
      this.removeCustomStyle(this.selectedRegionStyleId);
      this.selectedRegionStyleId = null;
    }
  }

  /**
   * Video preferences management
   */
  private readonly VIDEO_PREFERENCES_KEY = 'kiyanaw-video-preferences';

  /**
   * Gets video preferences from localStorage
   */
  getVideoPreferences(): VideoPreferences {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { position: 'right', size: 'small', isMinimized: false, zoom: 40, speed: 100 };
    }

    try {
      const stored = localStorage.getItem(this.VIDEO_PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          position: parsed.position || 'right',
          size: parsed.size || 'small',
          isMinimized: parsed.isMinimized || false,
          zoom: parsed.zoom || 40,
          speed: parsed.speed || 100,
        };
      }
    } catch (error) {
      console.warn('Error loading video preferences:', error);
    }

    return { position: 'right', size: 'small', isMinimized: false, zoom: 40, speed: 100 };
  }

  /**
   * Saves video preferences to localStorage
   */
  saveVideoPreferences(preferences: Partial<VideoPreferences>): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    try {
      const current = this.getVideoPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem(this.VIDEO_PREFERENCES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Error saving video preferences:', error);
    }
  }

  /**
   * Scrolls an element into view using the provided CSS selector
   * @param selector CSS selector to find the element (e.g., 'div#regionitem-123')
   * @param options Optional scroll behavior configuration
   */
  scrollElementIntoView(selector: string, options?: ScrollIntoViewOptions): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const element = document.querySelector(selector);
    if (!element || typeof element.scrollIntoView !== 'function') return;

    const defaultOptions: ScrollIntoViewOptions = {
      behavior: 'smooth',
      block: 'nearest'
    };
    
    // Try standard scrollIntoView first
    element.scrollIntoView({ ...defaultOptions, ...options });
    
    // For mobile: also try manual scroll on the correct container
    let scrollContainer;
    
    if (isMobileViewport()) {
      const mobileContainer = document.getElementById('mobile-regions-container');
      scrollContainer = mobileContainer?.querySelector('.overflow-y-auto');
    } else {
      const desktopContainer = document.getElementById('desktop-regions-container');
      scrollContainer = desktopContainer?.querySelector('.overflow-y-auto');
    }
    
    if (scrollContainer && (scrollContainer as HTMLElement).offsetParent !== null && scrollContainer.clientHeight > 0) {
      const targetElement = scrollContainer.querySelector(`#${element.id}`);
      
      if (targetElement) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const elementTopRelativeToContainer = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        
        // Scroll to nearest (like desktop) instead of center
        let targetScrollTop = elementTopRelativeToContainer;
        
        // If element is above viewport, scroll to show it at top
        if (elementRect.top < containerRect.top) {
          targetScrollTop = elementTopRelativeToContainer;
        }
        // If element is below viewport, scroll to show it at bottom
        else if (elementRect.bottom > containerRect.bottom) {
          targetScrollTop = elementTopRelativeToContainer - scrollContainer.clientHeight + elementRect.height;
        }
        // If element is already visible, don't scroll
        else {
          return;
        }
        
        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    }
  }
}

// Export the singleton instance
export const browserService = BrowserService.getInstance(); 