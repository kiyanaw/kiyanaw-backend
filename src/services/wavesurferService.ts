import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import mitt from 'mitt';
import { generateSignedUrl } from './transcriptionService';
import { FLASH_CONFIG } from './flashIndicatorService';

// Type definitions for WaveSurfer service
interface RegionEvent {
  id: string;
  start: number;
  end: number;
  element?: HTMLElement;
  content?: string;
  resize?: boolean;
  drag?: boolean;
}



interface DelayedLoad {
  source: string;
  peaks: unknown;
}

// Type for regions plugin instance
type RegionsPlugin = InstanceType<typeof Regions>;
type TimelinePlugin = InstanceType<typeof Timeline>;


class WaveSurferService {
  private static instance: WaveSurferService;
  private emitter = mitt();
  private wavesurfer: WaveSurfer | null = null;
  private regionsPlugin: RegionsPlugin | null = null;
  private timelinePlugin: TimelinePlugin | null = null;
  private muteEvents: boolean = false;
  private ready: boolean = false;
  private _delayedRegions: RegionEvent[] = []
  private _delayedSeekRegion: RegionEvent | null = null
  private _delayedLoad: DelayedLoad | null = null
  // Store references to current containers for comparison
  private currentContainer: HTMLElement | null = null;
  private currentTimelineContainer: HTMLElement | null = null;
  private currentMediaElement: HTMLMediaElement | null = null;
  // Inbound region highlighting state management
  // Used to ignore region-out events immediately after seeking to prevent unwanted highlight removal
  private _inboundRegionIgnoreNextOut: boolean = false
  // Tracks the currently highlighted region in the wavesurfer player for inbound region management
  private _inboundRegionCurrentHighlighted: RegionEvent | null = null
  // Tracks the region we want to stop playback at (for region-bounded playback)
  private _playbackBoundRegion: RegionEvent | null = null
  // Flag to prevent subscription-created regions from triggering creation flow
  private _isAddingSubscriptionRegion: boolean = false
  private _canEdit: boolean = false
  private _disableDragSelection: (() => void) | null = null

  private REGION_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.1)'
  private REGION_HIGHLIGHTED_COLOR = 'rgba(0, 213, 255, 0.1)'

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WaveSurferService {
    if (!WaveSurferService.instance) {
      WaveSurferService.instance = new WaveSurferService();
    }
    return WaveSurferService.instance;
  }

  initialize(container: HTMLElement, timelineContainer: HTMLElement, mediaElement?: HTMLMediaElement, canEdit: boolean = false): WaveSurfer {
    // Check if containers have changed
    const containersChanged =
      this.currentContainer !== container ||
      this.currentTimelineContainer !== timelineContainer ||
      this.currentMediaElement !== (mediaElement || null);
    
    const canEditChanged = this._canEdit !== canEdit;

    if (this.wavesurfer && containersChanged) {
      // Preserve delayed regions before destroying
      const preservedDelayedRegions = [...this._delayedRegions];
      const preservedDelayedSeekRegion = this._delayedSeekRegion;
      const preservedDelayedLoad = this._delayedLoad;
      
      // Destroy the old instance
      this.destroy();
      
      // Restore preserved delayed regions
      this._delayedRegions = preservedDelayedRegions;
      this._delayedSeekRegion = preservedDelayedSeekRegion;
      this._delayedLoad = preservedDelayedLoad;
      
      // Create new instance with new containers
      this._createNewInstance(container, timelineContainer, mediaElement, canEdit);
      
      return this.wavesurfer!;
    }
    
    if (this.wavesurfer) {
      // If only canEdit changed, we'd need to recreate the instance since 
      // drag selection can only be enabled at creation time
      if (canEditChanged && !containersChanged) {
        // For now, just store the new value - drag selection state won't change
        this._canEdit = canEdit;
      }
      return this.wavesurfer;
    }

    // Create new instance
    this._createNewInstance(container, timelineContainer, mediaElement, canEdit);
    return this.wavesurfer!;
  }

  private _createNewInstance(container: HTMLElement, timelineContainer: HTMLElement, mediaElement?: HTMLMediaElement, canEdit: boolean = false): void {
    // Store container references
    this.currentContainer = container;
    this.currentTimelineContainer = timelineContainer;
    this.currentMediaElement = mediaElement || null;
    this._canEdit = canEdit;


    // Create plugins
    this.regionsPlugin = Regions.create();
    this.timelinePlugin = Timeline.create({
      // container: timelineContainer,
      height: 20,  // Explicit height to ensure proper rendering
    });
    
    // Initialize WaveSurfer without media - we'll load it later
    this.wavesurfer = WaveSurfer.create({
      container,
      media: mediaElement,
      waveColor: '#305880',
      progressColor: '#162738',
      barWidth: 2,
      height: 128,
      minPxPerSec: 20, // initial zoom value
      plugins: [this.regionsPlugin, this.timelinePlugin],
    });

    // Enable drag selection based on canEdit permissions
    if (this._canEdit) {
      this._disableDragSelection = this.regionsPlugin.enableDragSelection({}, 5);
    }

    this.registerEvents();

    // If we have a delayed load waiting, process it immediately after creation
    if (this._delayedLoad) {
      this.load(this._delayedLoad.source, this._delayedLoad.peaks);
      this._delayedLoad = null;
    }

    (window as { ws?: WaveSurferService }).ws = this;
  }

  registerEvents(): void {
    /**
     * WAVESURFER EVENTS
     */
    this.wavesurfer?.on('ready', () => {
      this.ready = true
      
      if (this._delayedLoad !== null) {
        this.load(this._delayedLoad.source, this._delayedLoad.peaks);
        this._delayedLoad = null;
      }
      
      if (this._delayedRegions.length) {
        this.setRegions(this._delayedRegions)
      }

      if (this._delayedSeekRegion !== null) {
        this.wavesurfer?.setTime(this._delayedSeekRegion.start)
        this._delayedSeekRegion = null
        // Ignore the next region-out event since we're seeking to a region intentionally
        this._inboundRegionIgnoreNextOut = true
      }
      
      // Emit the ready event and duration so other components can listen to it
      this.emitEvent('ready', { duration: this.wavesurfer?.getDuration() || 0 });
    })

    this.wavesurfer?.on('play', () => {
      this.emitEvent('play');
    })

    this.wavesurfer?.on('pause', () => {
      this.emitEvent('pause');
    })

    this.wavesurfer?.on('error', async (_event) => {
      const mediaError = _event as unknown as MediaError;
      console.error('Wavesurfer error event', mediaError);
      
      // Check if this is a media load/network error (code 2 or 4) that looks like 403
      // Code 2: MEDIA_ERR_NETWORK - A network error occurred
      // Code 4: MEDIA_ERR_SRC_NOT_SUPPORTED - Media source not supported (could be 403)
      const isNetworkError = mediaError.code === 2 || mediaError.code === 4;
      const errorMessage = mediaError.message || '';
      const looksLike403 = errorMessage.includes('403') || errorMessage.includes('Forbidden') || 
                            errorMessage.includes('PIPELINE_ERROR_READ') ||
                            errorMessage.includes('ORB') || errorMessage.includes('blocked') ||
                            errorMessage.includes('ExpiredToken') || errorMessage.includes('SignatureDoesNotMatch');
      
      if (isNetworkError && looksLike403 && this._currentSource) {
        await this.logErrorDetails();
      }
      
      // Emit error event so UI can handle it
      this.emitEvent('error', _event);
    })

    // Listen for timeupdate to enforce region-bounded playback AND emit time updates
    this.wavesurfer?.on('timeupdate', (currentTime) => {
      // Emit current time for components to listen
      this.emitEvent('timeupdate', { currentTime });
      
      if (!this._playbackBoundRegion) return;        // guard not armed
      if (!this.wavesurfer?.isPlaying()) return;     // only act during playback

      if (currentTime >= this._playbackBoundRegion.end) {
        this.wavesurfer.pause();
        this._playbackBoundRegion = null;            // disarm the guard
      }
    })

    // Listen for user interactions to clear bounded playback when user seeks outside the region
    this.wavesurfer?.on('interaction', (newTime) => {
      if (!this._playbackBoundRegion) return;        // guard not armed

      // If user seeks outside the bounded region, clear the guard (enable free playback)
      if (newTime < this._playbackBoundRegion.start || newTime > this._playbackBoundRegion.end) {
        this._playbackBoundRegion = null;
      }
    })

    // Region events
    this.regionsPlugin?.on('region-created', (event: unknown) => {
      const regionEvent = event as RegionEvent;
      
      // Don't emit creation event for subscription-created regions to prevent double creation
      if (!this._isAddingSubscriptionRegion) {
        this.emitEvent('region-created', {
          id: regionEvent.id,
          start: regionEvent.start,
          end: regionEvent.end
        });
      }
      this.updateRegionIndices()
    });

    this.regionsPlugin?.on('region-updated', (event: unknown) => {
      const regionEvent = event as RegionEvent;
      this.emitEvent('region-update-end', {
        id: regionEvent.id,
        start: regionEvent.start,
        end: regionEvent.end
      });
      this.updateRegionIndices();
    });


    /**
     * For `region-in` we have a little extra checking because there is some additional
     * logic around when we have an "inbound region". This means that we have a deep-
     * link to a region and the region gets highlighted, but we need some additional
     * logic to make sure that the highlight gets cleared properly when we play the
     * media or click somewhere else. 
     */
    this.regionsPlugin?.on('region-in', (event: unknown) => {
      const regionEvent = event as RegionEvent;
      // Guard against deleted regions
      if (!regionEvent?.element) {
        return;
      }
      
      const previouslyHighlightedInboundRegion = this._inboundRegionCurrentHighlighted !== null;
      const newRegionInIsDifferent = previouslyHighlightedInboundRegion && this._inboundRegionCurrentHighlighted?.id !== regionEvent.id;
      const needToClearHighlight = newRegionInIsDifferent;
      if (needToClearHighlight && this._inboundRegionCurrentHighlighted?.element) {
        this._inboundRegionCurrentHighlighted.element.style.backgroundColor = this.REGION_BACKGROUND_COLOR;
      }
      // Set highlight color when entering region
      regionEvent.element.style.backgroundColor = this.REGION_HIGHLIGHTED_COLOR;
      this._inboundRegionCurrentHighlighted = regionEvent;
      this.emitEvent('region-in', {regionId: regionEvent.id})
    })

    /**
     * Similarly for the `region-out` event, we have extra logic that "skips" the very
     * first event of `region-out` when we have an inbound region, this is so the region
     * stays highlighted in wavesurfer, since both `region-in` and `region-out` fire
     * back-to-back when we seek to the initial region. It could possible be cleaner,
     * but this is where we are today :)
     */
    this.regionsPlugin?.on('region-out', (event: unknown) => {
      const regionEvent = event as RegionEvent;
      // Check if we should ignore this region-out event
      const shouldIgnoreRegionOutEvent = this._inboundRegionIgnoreNextOut;
      if (shouldIgnoreRegionOutEvent) {
        console.debug('📋 Ignoring region-out event after initial seek')
        this._inboundRegionIgnoreNextOut = false
        return
      }
      // Guard against deleted regions
      if (!regionEvent?.element) {
        return;
      }
      
      // Restore original background color when leaving region
      regionEvent.element.style.backgroundColor = this.REGION_BACKGROUND_COLOR
      // Clear current highlighted region tracking if this is the one leaving
      const previouslyHighlightedInboundRegion = this._inboundRegionCurrentHighlighted !== null;
      const isLeavingCurrentlyHighlightedRegion = previouslyHighlightedInboundRegion && this._inboundRegionCurrentHighlighted?.id === regionEvent.id;
      if (isLeavingCurrentlyHighlightedRegion) {
        this._inboundRegionCurrentHighlighted = null
      }
      this.emitEvent('region-out', {regionId: regionEvent.id})
    })


  }

  emitEvent(eventName: string, data?: unknown): void {
    if (!this.muteEvents) {
      this.emitter.emit(eventName, data);
    }
  }

  clearAllListeners(): void {
    this.emitter.all.clear();
  }

  on(eventName: string, callback: (data: unknown) => void): void {
    this.emitter.on(eventName, callback);
  }

  off(eventName: string, callback: (data: unknown) => void): void {
    this.emitter.off(eventName, callback);
  }

  /* NEVER USE THIS ONLY FOR TESTING */
  getWaveSurfer(): WaveSurfer | null {
    return this.wavesurfer;
  }

  getRegionsPlugin(): RegionsPlugin | null {
    return this.regionsPlugin;
  }

  // Store the current source and peaks
  private _currentSource: string | null = null;
  private _currentPeaks: unknown = null;

  // Set a new source URL and peaks data
  async load(source: string, peaks: unknown): Promise<void> {
    if (!this.wavesurfer) {
      this._delayedLoad = { source, peaks };
      return;
    }
    
    // Store source and peaks
    this._currentSource = source;
    this._currentPeaks = peaks;
    
    try {
      let signedMediaUrl: string;
      
      if (this.currentMediaElement) {
        // If we have a media element, we need to set the src attribute to the signed URL
        // and then load peaks only in wavesurfer
        signedMediaUrl = await generateSignedUrl(source);
        this.currentMediaElement.src = signedMediaUrl;
        this.wavesurfer?.load(signedMediaUrl, peaks as (Float32Array)[]);
      } else {
        // For audio-only, load the signed media source directly.
        signedMediaUrl = await generateSignedUrl(source);
        this.wavesurfer?.load(signedMediaUrl, peaks as (Float32Array)[]);
      }
    } catch (error) {
      console.error('Failed to load media with signed URL:', error);
      // Fallback to original URL if signing fails
      if (this.currentMediaElement) {
        this.currentMediaElement.src = source;
        this.wavesurfer?.load(source, peaks as (Float32Array)[]);
      } else {
        this.wavesurfer?.load(source, peaks as (Float32Array)[]);
      }
    }
  }

  /**
   * Log detailed error information for 403/waveform errors
   */
  private async logErrorDetails(): Promise<void> {
    const { getCredentialSetupTime } = await import('./transcriptionService');
    const credentialSetupTime = getCredentialSetupTime();
    
    // Get the current media source URL
    const currentUrl = this.currentMediaElement?.src || 
                      (this.wavesurfer?.getMediaElement() as HTMLMediaElement)?.src;
    
    if (!currentUrl) {
      return;
    }
    
    // Try to fetch S3 XML error details
    let errorDetails: { code?: string; message?: string; requestId?: string } = {};
    try {
      if (currentUrl.includes('s3.amazonaws.com')) {
        const response = await fetch(currentUrl, { method: 'HEAD' });
        if (!response.ok) {
          const text = await response.text();
          if (text.includes('<Error>')) {
            const codeMatch = text.match(/<Code>([^<]+)<\/Code>/);
            const messageMatch = text.match(/<Message>([^<]+)<\/Message>/);
            const requestIdMatch = text.match(/<RequestId>([^<]+)<\/RequestId>/);
            
            errorDetails = {
              code: codeMatch?.[1],
              message: messageMatch?.[1],
              requestId: requestIdMatch?.[1]
            };
          }
        }
      }
    } catch (error) {
      // Ignore fetch errors
    }
    
    // Log error details
    console.error('🚨 Waveform/Media Error Details:');
    console.error('URL:', currentUrl.substring(0, 100) + '...');
    
    if (errorDetails.code) {
      console.error('S3 Error Code:', errorDetails.code);
      if (errorDetails.message) console.error('S3 Error Message:', errorDetails.message);
      if (errorDetails.requestId) console.error('Request ID:', errorDetails.requestId);
    }
    
    // Log credential age
    if (credentialSetupTime) {
      const timeSinceSetup = Date.now() - credentialSetupTime;
      const hoursSinceSetup = timeSinceSetup / (1000 * 60 * 60);
      const minutesSinceSetup = timeSinceSetup / (1000 * 60);
      
      console.error('Credential Setup Time:', new Date(credentialSetupTime).toISOString());
      console.error('Credential Age:', `${Math.floor(minutesSinceSetup)}m ${Math.floor((minutesSinceSetup % 1) * 60)}s`);
      
      if (hoursSinceSetup < 1) {
        console.error('⚠️ CRITICAL: Error occurred within 1 hour of fresh credentials!');
      }
    } else {
      console.error('⚠️ No credential setup time tracked');
    }
  }

  setRegions(regions: RegionEvent[]) {
    if (this.wavesurfer) {
      if (this.ready) {
        // Clear existing regions first
        this.regionsPlugin?.clearRegions();
        // Clear delayed regions first since we're processing them now
        this._delayedRegions = []

        this.muteEvents = true
        regions.forEach((region: RegionEvent, index: number) => {
          const input = {
            id: region.id, // Pass the region ID so wavesurfer uses the same ID as the database
            start: region.start,
            end: region.end,
            content: `${index + 1}`,
            resize: this._canEdit, // Only allow resize if user can edit
            drag: this._canEdit,   // Only allow drag if user can edit
          }
          this.regionsPlugin?.addRegion(input);
        });
        this.muteEvents = false
      } else {
        this._delayedRegions = regions
      }
    } else {
      this._delayedRegions = regions
    }
  }

  /**
   * Check if the WaveSurfer instance needs to be reloaded due to container changes
   * This is used by components to determine if they need to reload media
   */
  needsReload(): boolean {
    // If we have delayed regions but no ready state, we likely need a reload
    return this._delayedRegions.length > 0 && !this.ready;
  }

  /**
   * Get the current delayed regions (useful for state restoration)
   */
  getDelayedRegions(): RegionEvent[] {
    return this._delayedRegions;
  }

  /**
   * Adds a new region and updates the display indices of all regions
   */
  updateRegionIndices() {
    const allRegions = this.regionsPlugin?.getRegions();
    if (!allRegions) return;
    
    // Sort regions by start time to ensure proper chronological ordering
    const sortedRegions = allRegions.sort((a: unknown, b: unknown) => {
      const regionA = a as RegionEvent;
      const regionB = b as RegionEvent;
      return regionA.start - regionB.start;
    });
    sortedRegions.forEach((region: unknown, index: number) => {
      const regionEvent = region as { setContent: (content: string) => void };
      regionEvent.setContent(`${index + 1}`)
    });
    
  }

  setZoom(value: number): void {
    this.wavesurfer?.zoom(value);
  }

  setPlaybackRate(rate: number): void {
    // Convert percentage to decimal (e.g., 100 -> 1.0, 150 -> 1.5, 50 -> 0.5)
    const normalizedRate = rate / 100;
    this.wavesurfer?.setPlaybackRate(normalizedRate);
  }

  // seekToTime went away, replaced by seekToRegion

  seekToRegion(region: RegionEvent): void {
    // Arm the region-bounded playback guard
    this._playbackBoundRegion = region;
    
    // Seek to the region start
    if (this.wavesurfer && this.ready) {
      this.wavesurfer.setTime(region.start);
    } else {
      this._delayedSeekRegion = region;
    }
  }

  /**
   * Clears the region-bounded playback guard, allowing free playback
   */
  clearRegionBoundedPlayback(): void {
    if (this._playbackBoundRegion) {
      this._playbackBoundRegion = null;
    }
  }

  // Track if we're currently in the middle of a play attempt to prevent race conditions
  private _playAttemptInProgress: boolean = false;

  async play(options: { playInFull?: boolean } = {}): Promise<void> {
    // Prevent multiple simultaneous play attempts
    if (this._playAttemptInProgress) {
      console.debug('⏭️ Skipping play() - another play attempt in progress');
      return;
    }

    try {
      this._playAttemptInProgress = true;
      
      if (options.playInFull) {
        // Clear any region-bounded playback restrictions for full playback
        this.clearRegionBoundedPlayback();
      }
      
      await this.wavesurfer?.play();
    } catch (error) {
      // Handle AbortError gracefully (this is expected when rapidly switching regions)
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('⏸️ Play request was aborted (expected during rapid region switching)');
        return;
      }
      // Re-throw other errors
      throw error;
    } finally {
      this._playAttemptInProgress = false;
    }
  }

  pause(): void {
    this.wavesurfer?.pause();
  }

  playPause(): Promise<void> {
    return this.wavesurfer?.playPause() || Promise.resolve();
  }

  setRegionPosition(regionId: string, bounds: { start: number; end: number }): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const region = this.regionsPlugin!.getRegions().find((r: any) => r.id === regionId);
    if (!region) {
      console.warn('🎵 Cannot set region position: region not found:', regionId);
      return;
    }

    try {
      region.setOptions({
        start: bounds.start,
        end: bounds.end
      });
      // Update region indices after position change
      this.updateRegionIndices();
    } catch (error) {
      console.error('🎵 Failed to set region position:', error);
    }
  }

  /**
   * Add a region with a predefined ID (used for realtime/subscription events)
   */
  addRegionWithId(regionData: { id: string; start: number; end: number }): void {
    try {
      // Temporarily mark this as a subscription-created region to prevent double creation
      this._isAddingSubscriptionRegion = true;
      console.debug('📡 Adding region from subscription (will not trigger creation event):', regionData.id);
      
      this.regionsPlugin!.addRegion({
        id: regionData.id,
        start: regionData.start,
        end: regionData.end,
        content: '', // Will be set by updateRegionIndices
        resize: this._canEdit,
        drag: this._canEdit
      });
      this.updateRegionIndices();
    } catch (error) {
      console.error('🎵 Failed to add region:', error);
    } finally {
      // Always reset the flag
      this._isAddingSubscriptionRegion = false;
    }
  }

  deleteRegion(regionId: string): void {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const region = this.regionsPlugin!.getRegions().find((r: any) => r.id === regionId);
    if (!region) {
      console.warn('🎵 Cannot delete region: region not found:', regionId);
      return;
    }

    try {
      region.remove();
      this.updateRegionIndices();
    } catch (error) {
      console.error('🎵 Failed to delete region:', error);
    }
  }

  /**
   * Toggle region editing capabilities (drag selection, resize, drag)
   */
  setRegionEditingEnabled(enabled: boolean): void {
    this._canEdit = enabled;
    
    if (!this.regionsPlugin) {
      console.warn('🎵 Cannot toggle region editing: regions plugin not available');
      return;
    }

    // Update existing regions
    const allRegions = this.regionsPlugin.getRegions();
    allRegions.forEach((region: unknown) => {
      const regionWithOptions = region as { setOptions: (options: { resize: boolean; drag: boolean }) => void };
      try {
        regionWithOptions.setOptions({
          resize: enabled,
          drag: enabled
        });
      } catch (error) {
        console.warn('🎵 Failed to update region options:', error);
      }
    });

    // Update drag selection
    if (enabled && !this._disableDragSelection) {
      this._disableDragSelection = this.regionsPlugin.enableDragSelection({}, 5);
    } else if (!enabled && this._disableDragSelection) {
      // Call the disable function returned by enableDragSelection
      this._disableDragSelection();
      this._disableDragSelection = null;
    }
  }

  /**
   * Flash the background color of a region briefly (for realtime updates)
   */
  flashRegionBackground(regionId: string, username?: string): void {
    if (!this.regionsPlugin) {
      console.warn('🎵 Cannot flash region: regions plugin not available');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const region = this.regionsPlugin.getRegions().find((r: any) => r.id === regionId);
    if (!region?.element) {
      console.warn('🎵 Cannot flash region: region not found or no element:', regionId);
      return;
    }

    try {
      // Determine current color (highlighted vs normal)
      const isHighlighted = this._inboundRegionCurrentHighlighted?.id === regionId;
      const originalColor = isHighlighted ? this.REGION_HIGHLIGHTED_COLOR : this.REGION_BACKGROUND_COLOR;
      
      // Flash green briefly
      const flashColor = FLASH_CONFIG.flashColor; // Light green
      
      // Apply flash with CSS transition
      region.element.style.transition = `background-color ${FLASH_CONFIG.backgroundFlashDuration}ms ${FLASH_CONFIG.backgroundEasing}`;
      region.element.style.backgroundColor = flashColor;
      
      // Add username text if provided
      let textElement: HTMLElement | null = null;
      if (username) {
        // Ensure region element has relative positioning for absolute child
        const originalPosition = region.element.style.position;
        if (!originalPosition || originalPosition === 'static') {
          region.element.style.position = 'relative';
        }

        textElement = document.createElement('div');
        textElement.textContent = username;
        textElement.style.cssText = `
          position: absolute;
          bottom: 2px;
          right: 4px;
          font-size: 10px;
          font-weight: 600;
          color: ${FLASH_CONFIG.textColor};
          padding: 2px 6px;
          border-radius: 3px;
          pointer-events: none;
          opacity: 0;
          transition: opacity ${FLASH_CONFIG.usernameFadeDuration}ms ${FLASH_CONFIG.usernameEasing};
          z-index: 10;
          text-shadow: 0 0 4px rgba(255,255,255,0.9);
        `;
        region.element.appendChild(textElement);

        // Fade in the text
        setTimeout(() => {
          if (textElement) textElement.style.opacity = '1';
        }, 100);
      }
      
      // Restore background color after flash duration
      setTimeout(() => {
        if (region.element) { // Guard against region deletion during flash
          region.element.style.backgroundColor = originalColor;
          // Remove transition after animation completes
          setTimeout(() => {
            if (region.element) {
              region.element.style.transition = '';
            }
          }, FLASH_CONFIG.backgroundFlashDuration);
        }
      }, FLASH_CONFIG.textFadeDuration);

      // Fade out and remove username text after visible duration
      if (textElement) {
        setTimeout(() => {
          if (textElement) {
            textElement.style.opacity = '0';
            setTimeout(() => {
              if (textElement && textElement.parentNode) {
                textElement.remove();
              }
            }, FLASH_CONFIG.usernameFadeDuration);
          }
        }, FLASH_CONFIG.usernameVisibleDuration);
      }

    } catch (error) {
      console.error('🎵 Failed to flash region background:', error);
    }
  }
  
  destroy(): void {
    
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
      this.wavesurfer = null;
      this.regionsPlugin = null;
      this.timelinePlugin = null;
    }
    // Reset state
    this.ready = false;
    this.currentContainer = null;
    this.currentTimelineContainer = null;
    this.currentMediaElement = null;
    this._delayedRegions = [];
    this._delayedSeekRegion = null;
    this._delayedLoad = null;
    this._inboundRegionIgnoreNextOut = false;
    this._inboundRegionCurrentHighlighted = null;
    this._playbackBoundRegion = null;
    this._disableDragSelection = null;
    this._playAttemptInProgress = false;
    this._currentSource = null;
    this._currentPeaks = null;
    this.muteEvents = false;
    this.clearAllListeners();
  }


}

// Export the singleton instance
export const wavesurferService = WaveSurferService.getInstance();
