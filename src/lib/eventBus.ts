import mitt from 'mitt';

// Create and export the event emitter
export const eventBus = mitt();

// Export convenience methods
export const emit = eventBus.emit;
export const on = eventBus.on;
export const off = eventBus.off;

// Type definitions for events (for documentation)
export interface EventTypes {
  'transcription-ready': void;
  'on-load-peaks-error': void;
  'realtime-cursor': {
    user: string;
    regionId: string;
    color: string;
    cursor: any;
  };
  'refresh-local-text': void;
  'region-in': string;
  'region-out': string;
  'region-updated': any;
  'waveform-ready': void;
  'player-ready': void;
}
