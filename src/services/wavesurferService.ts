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
    this.regionsPlugin.enableDragSelection({}, 5)

    this.registerEvents()


    console.log('📋 WaveSurfer singleton initialized');
    return this.wavesurfer;
  }

  registerEvents(): void {

    // Wavesurfer ready
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

    // Region created
    this.regionsPlugin?.on('region-created', (event: any) => {
      this.emitEvent('region-created', {
        id: event.id,
        start: event.start,
        end: event.end
      });
    });
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
    console.log(`📋 setRegions called with ${regions.length} regions, ready: ${this.ready}, wavesurfer exists: ${!!this.wavesurfer}`)
    
    if (this.wavesurfer) {
      if (this.ready) {
        console.log('📋 Rendering regions immediately, total: ', regions.length)
        // Clear delayed regions first since we're processing them now
        this._delayedRegions = []
        
        // // Must be delayed to ensure that the element is present on the page
        // setTimeout(() => {
          console.log('📋 Actually adding regions to wavesurfer now')
          this.muteEvents = true
          regions.forEach((region: any) => {
            this.regionsPlugin.addRegion({
              start: region.start,
              end: region.end,
              content: `${region.displayIndex}`,
              resize: true,
            });
          });
          this.muteEvents = false
          console.log('📋 Finished adding regions to wavesurfer')
        // }, 50)
      } else {
        console.log('📋 Wavesurfer not ready, delaying regions')
        this._delayedRegions = regions
        console.log(`📋 Stored ${this._delayedRegions.length} regions for later`)
      }
    } else {
      console.log('📋 Wavesurfer not initialized, delaying regions')
      this._delayedRegions = regions
      console.log(`📋 Stored ${this._delayedRegions.length} regions for later`)
    }
  }
  
  setZoom(value: number): void {
    this.wavesurfer?.zoom(value);
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
  }
}

// Export the singleton instance
export const wavesurferService = WaveSurferService.getInstance();