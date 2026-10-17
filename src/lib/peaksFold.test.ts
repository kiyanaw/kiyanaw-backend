import { PeaksAccumulator, normalisePeaks } from './peaksFold';

describe('PeaksAccumulator', () => {
  it('emits one min/max pair per 1/20 s, mixing channels to mono', () => {
    // 40 Hz sample rate -> 2 samples per peak
    const acc = new PeaksAccumulator(40);
    acc.push([new Float32Array([0.5, -0.5, 0.2, 0.4]), new Float32Array([0.5, -0.5, 0.0, 0.0])]);
    // mono: [0.5, -0.5, 0.1, 0.2] -> pairs (-0.5, 0.5), (0.1, 0.2); normalised by 0.5
    expect(acc.finish()).toEqual({ length: 2, data: [-1, 1, 0.2, 0.4] });
  });

  it('carries a partial window across blocks and flushes the remainder', () => {
    const acc = new PeaksAccumulator(40);
    acc.push([new Float32Array([0.1])]);
    acc.push([new Float32Array([-0.2, 0.4])]);
    // windows: [0.1, -0.2] then [0.4] (partial)
    expect(acc.finish()).toEqual({ length: 2, data: [-0.5, 0.25, 1, 1] });
  });

  it('rejects an invalid sample rate', () => {
    expect(() => new PeaksAccumulator(0)).toThrow('invalid sample rate');
  });
});

describe('normalisePeaks', () => {
  it('leaves silent audio unnormalised', () => {
    expect(normalisePeaks([0, 0, 0, 0])).toEqual({ length: 2, data: [0, 0, 0, 0] });
  });

  it('rejects empty peaks', () => {
    expect(() => normalisePeaks([])).toThrow('empty');
  });
});
