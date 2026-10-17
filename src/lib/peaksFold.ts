/**
 * Folds decoded PCM into waveform peaks in the same shape the backend produces
 * (audiowaveform --pixels-per-second 20, mono, normalised by the largest value).
 */

export const PEAKS_PER_SECOND = 20;

export interface PeaksResult {
  length: number;
  data: number[];
}

export class PeaksAccumulator {
  private readonly samplesPerPeak: number;
  private readonly out: number[] = [];
  private min = Infinity;
  private max = -Infinity;
  private count = 0;

  constructor(sampleRate: number) {
    if (!(sampleRate > 0)) {
      throw new Error(`PeaksAccumulator: invalid sample rate ${sampleRate}`);
    }
    this.samplesPerPeak = Math.floor(sampleRate / PEAKS_PER_SECOND);
  }

  /** Adds one block of planar audio (one Float32Array per channel, equal lengths). */
  push(planes: Float32Array[]): void {
    const channels = planes.length;
    if (channels === 0) {
      throw new Error('PeaksAccumulator: no channels');
    }
    const frames = planes[0].length;
    for (let i = 0; i < frames; i++) {
      let v = 0;
      for (let c = 0; c < channels; c++) v += planes[c][i];
      v /= channels;
      if (v < this.min) this.min = v;
      if (v > this.max) this.max = v;
      if (++this.count === this.samplesPerPeak) {
        this.out.push(this.min, this.max);
        this.min = Infinity;
        this.max = -Infinity;
        this.count = 0;
      }
    }
  }

  finish(): PeaksResult {
    if (this.count > 0) {
      this.out.push(this.min, this.max);
      this.count = 0;
    }
    return normalisePeaks(this.out);
  }
}

/** Normalises by the largest value and rounds to 2 decimals, as processMedia does. Silent input is returned as-is. */
export const normalisePeaks = (raw: number[]): PeaksResult => {
  if (raw.length === 0) {
    throw new Error('Peaks array is empty');
  }
  let max = raw[0];
  for (let i = 1; i < raw.length; i++) if (raw[i] > max) max = raw[i];
  const data = max === 0 ? raw.slice() : raw.map((v) => Math.round((v / max) * 100) / 100);
  return { length: data.length / 2, data };
};
