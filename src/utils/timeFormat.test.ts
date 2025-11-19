import { formatTime, formatTimestamp } from './timeFormat';

describe('timeFormat', () => {
  describe('formatTime', () => {
    it('formats seconds to mm:ss with leading zero for seconds', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(125)).toBe('2:05');
    });

    it('formats seconds to mm:ss without leading zero when >= 10', () => {
      expect(formatTime(10)).toBe('0:10');
      expect(formatTime(70)).toBe('1:10');
      expect(formatTime(610)).toBe('10:10');
    });

    it('handles zero correctly', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('handles large values correctly', () => {
      expect(formatTime(3661)).toBe('61:01'); // 1 hour, 1 minute, 1 second
    });
  });

  describe('formatTimestamp', () => {
    it('formats single timestamp (no range)', () => {
      expect(formatTimestamp('202.108:202.108')).toBe('3:22');
      expect(formatTimestamp('65.0:65.0')).toBe('1:05');
    });

    it('formats timestamp range', () => {
      expect(formatTimestamp('202.108:202.869')).toBe('3:22-3:22');
      expect(formatTimestamp('180.0:247.5')).toBe('3:00-4:07');
    });

    it('treats missing end time as single timestamp', () => {
      expect(formatTimestamp('125.5:')).toBe('2:05');
    });

    it('handles timestamps with decimal precision', () => {
      expect(formatTimestamp('5.123:10.987')).toBe('0:05-0:10');
    });
  });
});

