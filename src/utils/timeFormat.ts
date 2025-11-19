/**
 * Formats a time value in seconds to mm:ss format
 * @param seconds - Time in seconds
 * @returns Formatted string like "3:24"
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const secsStr = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mins}:${secsStr}`;
};

/**
 * Formats a timestamp range from "start:end" format (in seconds) to readable format
 * @param timestamp - Timestamp string like "202.108:202.869"
 * @returns Formatted string like "3:22" or "3:22-3:27" for ranges
 */
export const formatTimestamp = (timestamp: string): string => {
  // Timestamp format is "start:end" in seconds (e.g. "202.108:202.869")
  const [start, end] = timestamp.split(':').map(t => parseFloat(t));
  
  if (!end || start === end) {
    return formatTime(start);
  }
  
  return `${formatTime(start)}-${formatTime(end)}`;
};

