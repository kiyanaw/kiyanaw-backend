import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import mitt from 'mitt';
import { generateSignedUrl } from './transcriptionService';


class WaveSurferService {
  private static instance: WaveSurferService;
  private emitter = mitt();
  private wavesurfer: WaveSurfer | null = null;
  private regionsPlugin: any = null;
  private timelinePlugin: any = null;
  private muteEvents: boolean = false;
  private ready: boolean = false;
  private _delayedRegions: any[] = []
  private _delayedSeekRegion: { id: string, start: number, end: number } | null = null
  private _delayedLoad: { source: string, peaks: any } | null = null
  // Store references to current containers for comparison
  private currentContainer: HTMLElement | null = null;
  private currentTimelineContainer: HTMLElement | null = null;
  private currentMediaElement: HTMLMediaElement | null = null;
  // Inbound region highlighting state management
  // Used to ignore region-out events immediately after seeking to prevent unwanted highlight removal
  private _inboundRegionIgnoreNextOut: boolean = false
  // Tracks the currently highlighted region in the wavesurfer player for inbound region management
  private _inboundRegionCurrentHighlighted: any = null
  // Tracks the region we want to stop playback at (for region-bounded playback)
  private _playbackBoundRegion: { id: string, start: number, end: number } | null = null
  private _canEdit: boolean = false

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
      this.regionsPlugin.enableDragSelection({}, 5);
    }

    this.registerEvents();

    // If we have a delayed load waiting, process it immediately after creation
    if (this._delayedLoad) {
      this.load(this._delayedLoad.source, this._delayedLoad.peaks);
      this._delayedLoad = null;
    }

    (window as any).ws = this;
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

    this.wavesurfer?.on('error', (_event) => {
      console.error('Wavesurfer error event', _event)
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
    this.regionsPlugin?.on('region-created', (event: any) => {
      this.emitEvent('region-created', {
        id: event.id,
        start: event.start,
        end: event.end
      });
      this.updateRegionIndices()
    });

    this.regionsPlugin?.on('region-updated', (event: any) => {
      this.emitEvent('region-update-end', {
        id: event.id,
        start: event.start,
        end: event.end
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
    this.regionsPlugin?.on('region-in', (event: any) => {
      // Guard against deleted regions
      if (!event?.element) {
        return;
      }
      
      const previouslyHighlightedInboundRegion = this._inboundRegionCurrentHighlighted !== null;
      const newRegionInIsDifferent = previouslyHighlightedInboundRegion && this._inboundRegionCurrentHighlighted.id !== event.id;
      const needToClearHighlight = newRegionInIsDifferent;
      if (needToClearHighlight && this._inboundRegionCurrentHighlighted?.element) {
        this._inboundRegionCurrentHighlighted.element.style.backgroundColor = this.REGION_BACKGROUND_COLOR;
      }
      // Set highlight color when entering region
      event.element.style.backgroundColor = this.REGION_HIGHLIGHTED_COLOR;
      this._inboundRegionCurrentHighlighted = event;
      this.emitEvent('region-in', {regionId: event.id})
    })

    /**
     * Similarly for the `region-out` event, we have extra logic that "skips" the very
     * first event of `region-out` when we have an inbound region, this is so the region
     * stays highlighted in wavesurfer, since both `region-in` and `region-out` fire
     * back-to-back when we seek to the initial region. It could possible be cleaner,
     * but this is where we are today :)
     */
    this.regionsPlugin?.on('region-out', (event: any) => {
      // Check if we should ignore this region-out event
      const shouldIgnoreRegionOutEvent = this._inboundRegionIgnoreNextOut;
      if (shouldIgnoreRegionOutEvent) {
        console.log('📋 Ignoring region-out event after initial seek')
        this._inboundRegionIgnoreNextOut = false
        return
      }
      // Guard against deleted regions
      if (!event?.element) {
        return;
      }
      
      // Restore original background color when leaving region
      event.element.style.backgroundColor = this.REGION_BACKGROUND_COLOR
      // Clear current highlighted region tracking if this is the one leaving
      const previouslyHighlightedInboundRegion = this._inboundRegionCurrentHighlighted !== null;
      const isLeavingCurrentlyHighlightedRegion = previouslyHighlightedInboundRegion && this._inboundRegionCurrentHighlighted.id === event.id;
      if (isLeavingCurrentlyHighlightedRegion) {
        this._inboundRegionCurrentHighlighted = null
      }
      this.emitEvent('region-out', {regionId: event.id})
    })


  }

  emitEvent(eventName: string, data?: any): void {
    if (!this.muteEvents) {
      this.emitter.emit(eventName, data);
    }
  }

  clearAllListeners(): void {
    this.emitter.all.clear();
  }

  on(eventName: string, callback: (data: any) => void): void {
    this.emitter.on(eventName, callback);
  }

  off(eventName: string, callback: (data: any) => void): void {
    this.emitter.off(eventName, callback);
  }

  /* NEVER USE THIS ONLY FOR TESTING */
  getWaveSurfer(): WaveSurfer | null {
    return this.wavesurfer;
  }

  getRegionsPlugin(): any {
    return this.regionsPlugin;
  }

  // Set a new source URL and peaks data
  async load(source: string, peaks: any): Promise<void> {
    if (!this.wavesurfer) {
      this._delayedLoad = { source, peaks };
      return;
    }
    
    try {
      let signedMediaUrl: string;
      
      if (this.currentMediaElement) {
        // If we have a media element, we need to set the src attribute to the signed URL
        // and then load peaks only in wavesurfer
        signedMediaUrl = await generateSignedUrl(source);
        this.currentMediaElement.src = signedMediaUrl;
        this.wavesurfer?.load(signedMediaUrl, peaks);
      } else {
        // For audio-only, load the signed media source directly.
        signedMediaUrl = await generateSignedUrl(source);
        this.wavesurfer?.load(signedMediaUrl, peaks);
      }
    } catch (error) {
      console.error('Failed to load media with signed URL:', error);
      // Fallback to original URL if signing fails
      if (this.currentMediaElement) {
        this.currentMediaElement.src = source;
        this.wavesurfer?.load(source, peaks);
      } else {
        this.wavesurfer?.load(source, peaks);
      }
    }
  }

  setRegions(regions:any) {
    if (this.wavesurfer) {
      if (this.ready) {
        // Clear existing regions first
        this.regionsPlugin.clearRegions();
        // Clear delayed regions first since we're processing them now
        this._delayedRegions = []

        this.muteEvents = true
        regions.forEach((region: any, index: number) => {
          const input = {
            id: region.id, // Pass the region ID so wavesurfer uses the same ID as the database
            start: region.start,
            end: region.end,
            content: `${index + 1}`,
            resize: this._canEdit, // Only allow resize if user can edit
            drag: this._canEdit,   // Only allow drag if user can edit
          }
          this.regionsPlugin.addRegion(input);
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
  getDelayedRegions(): any[] {
    return this._delayedRegions;
  }

  /**
   * Adds a new region and updates the display indices of all regions
   */
  updateRegionIndices() {
    const allRegions = this.regionsPlugin.getRegions();
    // Sort regions by start time to ensure proper chronological ordering
    const sortedRegions = allRegions.sort((a: any, b: any) => a.start - b.start);
    sortedRegions.forEach((region: any, index: number) => {
      region.setContent(`${index + 1}`)
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

  seekToRegion(region: { id: string, start: number, end: number }): void {
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

  async play(options: { playInFull?: boolean } = {}): Promise<void> {
    if (options.playInFull) {
      // Clear any region-bounded playback restrictions for full playback
      this.clearRegionBoundedPlayback();
    }
    await this.wavesurfer?.play();
  }

  pause(): void {
    this.wavesurfer?.pause();
  }

  playPause(): Promise<void> {
    return this.wavesurfer?.playPause() || Promise.resolve();
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
    this.muteEvents = false;
    this.clearAllListeners();
  }


}

// Export the singleton instance
export const wavesurferService = WaveSurferService.getInstance();