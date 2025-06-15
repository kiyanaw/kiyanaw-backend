import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import Timeline from 'wavesurfer.js/dist/plugins/timeline.esm.js';

class WaveSurferService {
  private static instance: WaveSurferService;
  private wavesurfer: WaveSurfer | null = null;
  private regionsPlugin: any = null;
  private timelinePlugin: any = null;

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

    console.log('📋 Initializing WaveSurfer singleton 111', this.peaks);

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
      peaks: this.peaks,
      plugins: [this.regionsPlugin, this.timelinePlugin],
    });

    console.log('📋 WaveSurfer singleton initialized');
    return this.wavesurfer;
  }

  getWaveSurfer(): WaveSurfer | null {
    return this.wavesurfer;
  }

  getRegionsPlugin(): any {
    return this.regionsPlugin;
  }

  load(source:string, peaks: any): void{
    this.wavesurfer?.load(source, peaks)
  }

  updateMediaElement(mediaElement: HTMLMediaElement): void {
    if (!this.wavesurfer) {
      console.warn('📋 WaveSurfer not initialized, cannot update media element');
      return;
    }

    console.log('📋 Updating WaveSurfer media element');
    this.wavesurfer.setMediaElement(mediaElement);
  }

  loadAudio(source: string, peaks?: number[]): Promise<void> {
    if (!this.wavesurfer) {
      throw new Error('WaveSurfer not initialized');
    }

    console.log('📋 Loading audio into WaveSurfer singleton:', source);
    return this.wavesurfer.load(source, peaks as any);
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