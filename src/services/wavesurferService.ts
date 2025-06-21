import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import mitt from 'mitt';


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
  // Store references to current containers for comparison
  private currentContainer: HTMLElement | null = null;
  private currentTimelineContainer: HTMLElement | null = null;
  // Inbound region highlighting state management
  // Used to ignore region-out events immediately after seeking to prevent unwanted highlight removal
  private _inboundRegionIgnoreNextOut: boolean = false
  // Tracks the currently highlighted region in the wavesurfer player for inbound region management
  private _inboundRegionCurrentHighlighted: any = null
  // Tracks the region we want to stop playback at (for region-bounded playback)
  private _playbackBoundRegion: { id: string, start: number, end: number } | null = null

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

  initialize(container: HTMLElement, timelineContainer: HTMLElement): WaveSurfer {
    // Check if containers have changed
    const containersChanged = this.currentContainer !== container || this.currentTimelineContainer !== timelineContainer;
    
    if (this.wavesurfer && containersChanged) {
      console.log('📋 Containers changed, recreating WaveSurfer instance');
      
      // Preserve delayed regions before destroying
      const preservedDelayedRegions = [...this._delayedRegions];
      const preservedDelayedSeekRegion = this._delayedSeekRegion;
      
      // Destroy the old instance
      this.destroy();
      
      // Restore preserved delayed regions
      this._delayedRegions = preservedDelayedRegions;
      this._delayedSeekRegion = preservedDelayedSeekRegion;
      
      // Create new instance with new containers
      this._createNewInstance(container, timelineContainer);
      
      console.log('📋 Will need to reload media after container change');
      
      return this.wavesurfer!;
    }
    
    if (this.wavesurfer) {
      console.log('📋 WaveSurfer singleton already initialized, returning existing instance');
      return this.wavesurfer;
    }

    // Create new instance
    this._createNewInstance(container, timelineContainer);
    return this.wavesurfer!;
  }

  private _createNewInstance(container: HTMLElement, timelineContainer: HTMLElement): void {
    // Store container references
    this.currentContainer = container;
    this.currentTimelineContainer = timelineContainer;

    // Create plugins
    this.regionsPlugin = Regions.create();
    this.timelinePlugin = Timeline.create({
      container: timelineContainer,
    });
    
    // Initialize WaveSurfer without media - we'll load it later
    this.wavesurfer = WaveSurfer.create({
      container,
      waveColor: '#305880',
      progressColor: '#162738',
      barWidth: 2,
      height: 128,
      minPxPerSec: 20, // initial zoom value
      plugins: [this.regionsPlugin, this.timelinePlugin],
    });

    // TODO: we'll need to check permissions for this, maybe add an .enableDragSelection()?
    this.regionsPlugin.enableDragSelection({}, 5);

    this.registerEvents();

    (window as any).ws = this;

    console.log('📋 WaveSurfer singleton initialized');
  }

  registerEvents(): void {
    /**
     * WAVESURFER EVENTS
     */
    this.wavesurfer?.on('ready', (event) => {
      console.log('📋 Wavesurfer ready event fired!', event)
      this.ready = true
      
      if (this._delayedRegions.length) {
        console.log(`📋 Processing ${this._delayedRegions.length} delayed regions`)
        this.setRegions(this._delayedRegions)
      } else {
        console.log('📋 No delayed regions to process')
      }

      if (this._delayedSeekRegion !== null) {
        console.log(`📋 Processing delayed seek to region: ${this._delayedSeekRegion.id} (${this._delayedSeekRegion.start}s - ${this._delayedSeekRegion.end}s)`)
        this.wavesurfer?.setTime(this._delayedSeekRegion.start)
        this._delayedSeekRegion = null
        // Ignore the next region-out event since we're seeking to a region intentionally
        this._inboundRegionIgnoreNextOut = true
      }
    })

    this.wavesurfer?.on('play', () => {
      this.emitEvent('play');
    })

    this.wavesurfer?.on('pause', () => {
      this.emitEvent('pause');
    })

    this.wavesurfer?.on('error', (event) => {
      console.log('Wavesurfer error event', event)
    })

    // Listen for timeupdate to enforce region-bounded playback
    this.wavesurfer?.on('timeupdate', (currentTime) => {
      if (!this._playbackBoundRegion) return;        // guard not armed
      if (!this.wavesurfer?.isPlaying()) return;     // only act during playback

      if (currentTime >= this._playbackBoundRegion.end) {
        console.log(`📋 Reached end of bounded region ${this._playbackBoundRegion.id} at ${this._playbackBoundRegion.end}s, stopping playback`);
        this.wavesurfer.pause();
        this._playbackBoundRegion = null;            // disarm the guard
      }
    })

    // Listen for user interactions to clear bounded playback when user seeks outside the region
    this.wavesurfer?.on('interaction', (newTime) => {
      if (!this._playbackBoundRegion) return;        // guard not armed

      // If user seeks outside the bounded region, clear the guard (enable free playback)
      if (newTime < this._playbackBoundRegion.start || newTime > this._playbackBoundRegion.end) {
        console.log(`📋 User seeked outside bounded region ${this._playbackBoundRegion.id} (${newTime}s), clearing region-bounded playback`);
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
      const previouslyHighlightedInboundRegion = this._inboundRegionCurrentHighlighted !== null;
      const newRegionInIsDifferent = previouslyHighlightedInboundRegion && this._inboundRegionCurrentHighlighted.id !== event.id;
      const needToClearHighlight = newRegionInIsDifferent;
      if (needToClearHighlight) {
        console.log(`📋 Manually clearing highlight from previous region: ${this._inboundRegionCurrentHighlighted.id}`)
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
  load(source:string, peaks: any): void{
    this.wavesurfer?.load(source, peaks)
  }

  setRegions(regions:any) {
    if (this.wavesurfer) {
      if (this.ready) {
        console.log('📋 Rendering regions immediately, total: ', regions.length)
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
            resize: true,
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

  // seekToTime went away, replaced by seekToRegion

  seekToRegion(region: { id: string, start: number, end: number }): void {
    console.log(`📋 Seeking to region: ${region.id} (${region.start}s - ${region.end}s)`);
    
    // Arm the region-bounded playback guard
    this._playbackBoundRegion = region;
    console.log(`📋 Armed region-bounded playback for region ${region.id} (will stop at ${region.end}s)`);
    
    // Seek to the region start
    if (this.wavesurfer && this.ready) {
      this.wavesurfer.setTime(region.start);
    } else {
      console.log(`📋 Wavesurfer not ready, delaying seek to region: ${region.id}`)
      this._delayedSeekRegion = region;
    }
  }

  /**
   * Clears the region-bounded playback guard, allowing free playback
   */
  clearRegionBoundedPlayback(): void {
    if (this._playbackBoundRegion) {
      console.log(`📋 Clearing region-bounded playback for region ${this._playbackBoundRegion.id}`);
      this._playbackBoundRegion = null;
    }
  }

  async play(): Promise<void> {
    await this.wavesurfer?.play();
  }

  pause(): void {
    this.wavesurfer?.pause();
  }

  playPause(): Promise<void> {
    return this.wavesurfer?.playPause() || Promise.resolve();
  }
  
  updateMediaElement(mediaElement: HTMLMediaElement): void {
    if (!this.wavesurfer) {
      console.warn('📋 WaveSurfer not initialized, cannot update media element');
      return;
    }

    this.wavesurfer.setMediaElement(mediaElement);
  }

  destroy(): void {
    if (this.wavesurfer) {
      console.log('📋 Destroying WaveSurfer singleton');
      this.wavesurfer.destroy();
      this.wavesurfer = null;
      this.regionsPlugin = null;
      this.timelinePlugin = null;
    }
    // Reset state
    this.ready = false;
    this.currentContainer = null;
    this.currentTimelineContainer = null;
    this._delayedRegions = [];
    this._delayedSeekRegion = null;
    this._inboundRegionIgnoreNextOut = false;
    this._inboundRegionCurrentHighlighted = null;
    this._playbackBoundRegion = null;
    this.muteEvents = false;
    this.clearAllListeners();
  }
}

// Export the singleton instance
export const wavesurferService = WaveSurferService.getInstance();