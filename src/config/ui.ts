/**
 * UI Configuration Constants
 * 
 * Centralized configuration for UI-related constants like breakpoints,
 * ensuring consistency across the application.
 */

/**
 * Mobile breakpoint in pixels.
 * Matches Tailwind's `lg:` breakpoint (1024px).
 * Devices with width < MOBILE_BREAKPOINT are considered mobile.
 */
export const MOBILE_BREAKPOINT = 1024;

/**
 * Helper function to check if current viewport is mobile
 */
export const isMobileViewport = (): boolean => {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
};

