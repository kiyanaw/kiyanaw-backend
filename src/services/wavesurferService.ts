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
    if (this.wavesurfer) {
      console.log('📋 WaveSurfer singleton already initialized, returning existing instance');
      return this.wavesurfer;
    }

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
    return this.wavesurfer;
  }

  registerEvents(): void {

    // Wavesurfer events
    this.wavesurfer?.on('ready', (event) => {
      console.log('📋 Wavesurfer ready event fired!', event)
      this.ready = true
      
      if (this._delayedRegions.length) {
        console.log(`📋 Processing ${this._delayedRegions.length} delayed regions`)
        this.setRegions(this._delayedRegions)
      } else {
        console.log('📋 No delayed regions to process')
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

    // Region events
    this.regionsPlugin?.on('region-created', (event: any) => {
      this.emitEvent('region-created', {
        id: event.id,
        start: event.start,
        end: event.end
      });
      this.updateRegionIndices()
    });


    this.regionsPlugin?.on('region-in', (event: any) => {
      console.log('region in', event)

      // Set highlight color when entering region
      event.element.style.backgroundColor = this.REGION_HIGHLIGHTED_COLOR;
      this.emitEvent('region-in', {regionId: event.id})
    })
    this.regionsPlugin?.on('region-out', (event: any) => {
      console.log('region out', event)
      // Restore original background color when leaving region
      event.element.style.backgroundColor = this.REGION_BACKGROUND_COLOR
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
  
  seekToTime(timeInSeconds: number): void {
    this.wavesurfer?.setTime(timeInSeconds);
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
    this._delayedRegions = [];
    this.muteEvents = false;
    this.clearAllListeners();
  }
}

// Export the singleton instance
export const wavesurferService = WaveSurferService.getInstance();