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
    if (this.wavesurfer) {
      console.log('Rendering regions, total: ', regions.length) // TODO
      // Must be delayed to ensure that the element is present on the page
      setTimeout(() => {
        this.muteEvents = true
        regions.forEach((region: any) => {
          this.regionsPlugin.addRegion({
            start: region.start,
            end: region.end,
            content: region.displayIndex,
            resize: true,
          });
        });
        this.muteEvents = false
      }, 50)
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