/// <reference lib="webworker" />
import { Input, ALL_FORMATS, BlobSource, AudioSampleSink } from 'mediabunny';
import { PeaksAccumulator } from '../lib/peaksFold';

export interface PeaksWorkerRequest {
  file: File;
}

export type PeaksWorkerResponse =
  | { ok: true; length: number; data: number[]; duration: number; hasVideo: boolean }
  | { ok: false; error: string };

/**
 * Streams the file through WebCodecs (via mediabunny) and folds it into peaks.
 * Memory stays flat regardless of the file's length; the whole file is never decoded at once.
 */
self.onmessage = async (event: MessageEvent<PeaksWorkerRequest>) => {
  const reply = (message: PeaksWorkerResponse) => self.postMessage(message);
  try {
    const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(event.data.file) });
    const track = await input.getPrimaryAudioTrack();
    if (!track) {
      throw new Error('This file has no audio track.');
    }
    if (!(await track.canDecode())) {
      throw new Error(`This browser can't decode the file's audio (${track.codec ?? 'unknown codec'}).`);
    }
    const hasVideo = (await input.getPrimaryVideoTrack()) !== null;

    const channels = track.numberOfChannels;
    const accumulator = new PeaksAccumulator(track.sampleRate);
    let planes: Float32Array[] = [];
    let frames = 0;

    for await (const sample of new AudioSampleSink(track).samples()) {
      const n = sample.numberOfFrames;
      if (planes.length === 0 || planes[0].length < n) {
        planes = Array.from({ length: channels }, () => new Float32Array(n));
      }
      const block = planes.map((plane, c) => {
        const view = plane.subarray(0, n);
        sample.copyTo(view, { planeIndex: c, format: 'f32-planar' });
        return view;
      });
      sample.close();
      accumulator.push(block);
      frames += n;
    }

    const peaks = accumulator.finish();
    reply({ ok: true, ...peaks, duration: frames / track.sampleRate, hasVideo });
  } catch (error) {
    reply({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
