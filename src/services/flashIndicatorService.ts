/**
 * Flash Indicator Service
 * 
 * Event-based service for region flash notifications.
 * Avoids store pollution and performance issues with large region counts.
 */

import { wavesurferService } from './wavesurferService';

// Centralized flash configuration
export const FLASH_CONFIG = {
  // Text flash in region list - SHOULD MATCH WAVESURFER USERNAME TIMING
  textFadeDuration: 300, // Duration of the fade-out animation (match wavesurfer)
  textTotalDuration: 800, // Total time before cleanup (fade + buffer)
  textEasing: 'ease-out',
  
  // Wavesurfer background flash
  backgroundFlashDuration: 500, // Duration of background color flash
  backgroundEasing: 'ease-out',
  
  // Wavesurfer username text
  usernameVisibleDuration: 2500, // How long username stays visible
  usernameFadeDuration: 300, // Duration of username fade in/out
  usernameEasing: 'ease-out', // Changed to match text flash
  
  // Colors
  flashColor: 'rgba(34, 197, 94, 0.2)', // Light green for background
  textColor: '#15803d', // Green-700 for text
} as const;

type FlashEventCallback = (username: string) => void;

class FlashIndicatorServiceImpl {
  private listeners = new Map<string, Set<FlashEventCallback>>();
  private issueListeners = new Map<string, Set<FlashEventCallback>>();

  /**
   * Trigger a flash for a specific region
   */
  flashRegion(regionId: string, userEmail: string): void {
    // Extract username from email (everything before @)
    const username = userEmail.includes('@') 
      ? userEmail.split('@')[0] 
      : userEmail;

    console.log('⚡ Flash triggered for region:', regionId, 'by user:', username);

    // Trigger text flash in region list (via event system)
    const regionListeners = this.listeners.get(regionId);
    if (regionListeners) {
      regionListeners.forEach(callback => callback(username));
    }

    // Trigger region list background flash
    this.flashRegionListBackground(regionId);

    // Trigger wavesurfer background flash
    wavesurferService.flashRegionBackground(regionId, username);
  }

  /**
   * Trigger a flash for a specific issue (flashes both the issue and its region)
   */
  flashIssue(issueId: string, regionId: string, userEmail: string): void {
    const username = userEmail.includes('@') 
      ? userEmail.split('@')[0] 
      : userEmail;

    console.log('⚡ Flash triggered for issue:', issueId, 'region:', regionId, 'by user:', username);

    // 1) Flash the associated region (waveform + region list)
    this.flashRegion(regionId, userEmail);

    // 2) Trigger issue-specific flash
    const issueListeners = this.issueListeners.get(issueId);
    if (issueListeners) {
      issueListeners.forEach(callback => callback(username));
    }

    // 3) Flash the issue card background
    this.flashIssueCardBackground(issueId);
  }

  /**
   * Subscribe to flash events for a specific region
   */
  onFlash(regionId: string, callback: FlashEventCallback): () => void {
    if (!this.listeners.has(regionId)) {
      this.listeners.set(regionId, new Set());
    }

    const regionListeners = this.listeners.get(regionId)!;
    regionListeners.add(callback);

    // Return unsubscribe function
    return () => {
      regionListeners.delete(callback);
      if (regionListeners.size === 0) {
        this.listeners.delete(regionId);
      }
    };
  }

  /**
   * Subscribe to flash events for a specific issue
   */
  onIssueFlash(issueId: string, callback: FlashEventCallback): () => void {
    if (!this.issueListeners.has(issueId)) {
      this.issueListeners.set(issueId, new Set());
    }

    const issueListeners = this.issueListeners.get(issueId)!;
    issueListeners.add(callback);

    // Return unsubscribe function
    return () => {
      issueListeners.delete(callback);
      if (issueListeners.size === 0) {
        this.issueListeners.delete(issueId);
      }
    };
  }

  /**
   * Get count of active listeners (for debugging)
   */
  getListenerCount(): number {
    return Array.from(this.listeners.values())
      .reduce((total, set) => total + set.size, 0);
  }

  /**
   * Get count of active issue listeners (for debugging)
   */
  getIssueListenerCount(): number {
    return Array.from(this.issueListeners.values())
      .reduce((total, set) => total + set.size, 0);
  }

  /**
   * Clear all listeners (for testing/cleanup)
   */
  clearAll(): void {
    this.listeners.clear();
    this.issueListeners.clear();
  }

  /**
   * Flash the background of a region list item (preserves selected state)
   */
  private flashRegionListBackground(regionId: string): void {
    const regionElement = document.getElementById(`regionitem-${regionId}`);
    if (!regionElement) {
      console.warn('⚡ Cannot flash region list background: element not found:', regionId);
      return;
    }

    try {
      // Check if region currently has blue background (is selected/highlighted)
      const computedStyle = window.getComputedStyle(regionElement);
      const currentBackground = computedStyle.backgroundColor;
      const hasBlueBackground = currentBackground.includes('213, 255') || // playback blue
                               currentBackground.includes('0, 213, 255'); // exact blue match

      // Flash green briefly
      const flashColor = FLASH_CONFIG.flashColor; // Same green as wavesurfer
      
      // Apply flash with CSS transition
      regionElement.style.transition = `background-color ${FLASH_CONFIG.backgroundFlashDuration}ms ${FLASH_CONFIG.backgroundEasing}`;
      regionElement.style.backgroundColor = flashColor;
      
      // Restore background after flash duration
      setTimeout(() => {
        if (hasBlueBackground) {
          // Restore blue background if it was blue before
          regionElement.style.backgroundColor = 'rgba(0, 213, 255, 0.1)';
        } else {
          // Clear background if it wasn't blue (return to normal)
          regionElement.style.backgroundColor = '';
        }
        
        // Remove transition after animation completes
        setTimeout(() => {
          regionElement.style.transition = '';
        }, FLASH_CONFIG.backgroundFlashDuration);
      }, FLASH_CONFIG.backgroundFlashDuration);

      console.log('⚡ Flashed region list background:', regionId, hasBlueBackground ? 'with blue restore' : 'normal');
    } catch (error) {
      console.error('⚡ Failed to flash region list background:', error);
    }
  }

  /**
   * Flash the background of an issue card briefly
   */
  private flashIssueCardBackground(issueId: string): void {
    const issueElement = document.getElementById(`issueitem-${issueId}`);
    if (!issueElement) {
      console.warn('⚡ Cannot flash issue card background: element not found:', issueId);
      return;
    }

    try {
      // Get current background
      const computedStyle = window.getComputedStyle(issueElement);
      const currentBackground = computedStyle.backgroundColor;
      
      // Flash green briefly
      const flashColor = FLASH_CONFIG.flashColor;
      
      // Apply flash with CSS transition
      issueElement.style.transition = `background-color ${FLASH_CONFIG.backgroundFlashDuration}ms ${FLASH_CONFIG.backgroundEasing}`;
      issueElement.style.backgroundColor = flashColor;
      
      // Restore background after flash duration
      setTimeout(() => {
        // Restore original background
        issueElement.style.backgroundColor = currentBackground;
        
        // Remove transition after animation completes
        setTimeout(() => {
          issueElement.style.transition = '';
        }, FLASH_CONFIG.backgroundFlashDuration);
      }, FLASH_CONFIG.backgroundFlashDuration);

      console.log('⚡ Flashed issue card background:', issueId);
    } catch (error) {
      console.error('⚡ Failed to flash issue card background:', error);
    }
  }
}

export const flashIndicatorService = new FlashIndicatorServiceImpl(); 