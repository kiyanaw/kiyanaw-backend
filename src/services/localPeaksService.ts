import type { PeaksWorkerResponse } from '../workers/peaks.worker';

export interface LocalPeaks {
  data: number[];
  length: number;
  duration: number;
  hasVideo: boolean;
}

/** Computes waveform peaks for a local file in a Web Worker. */
export const computePeaks = (file: File): Promise<LocalPeaks> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/peaks.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<PeaksWorkerResponse>) => {
      worker.terminate();
      const message = event.data;
      if (message.ok) {
        resolve({ data: message.data, length: message.length, duration: message.duration, hasVideo: message.hasVideo });
      } else {
        reject(new Error(message.error));
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(`Waveform worker failed: ${event.message}`));
    };
    worker.postMessage({ file });
  });
