/**
 * Flash Indicator Service
 * 
 * Event-based service for region flash notifications.
 * Avoids store pollution and performance issues with large region counts.
 */

type FlashEventCallback = (username: string) => void;

class FlashIndicatorServiceImpl {
  private listeners = new Map<string, Set<FlashEventCallback>>();

  /**
   * Trigger a flash for a specific region
   */
  flashRegion(regionId: string, userEmail: string): void {
    // Extract username from email (everything before @)
    const username = userEmail.includes('@') 
      ? userEmail.split('@')[0] 
      : userEmail;

    console.log('⚡ Flash triggered for region:', regionId, 'by user:', username);

    const regionListeners = this.listeners.get(regionId);
    if (regionListeners) {
      regionListeners.forEach(callback => callback(username));
    }
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
   * Get count of active listeners (for debugging)
   */
  getListenerCount(): number {
    return Array.from(this.listeners.values())
      .reduce((total, set) => total + set.size, 0);
  }

  /**
   * Clear all listeners (for testing/cleanup)
   */
  clearAll(): void {
    this.listeners.clear();
  }
}

export const flashIndicatorService = new FlashIndicatorServiceImpl(); 