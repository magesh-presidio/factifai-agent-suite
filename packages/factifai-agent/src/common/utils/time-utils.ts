/**
 * Format milliseconds into a human readable duration
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "Unknown";
  
  // Handle small durations (less than a second)
  if (ms < 1000) {
    return `${ms} ms`;
  }
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)));
  
  const parts = [];
  
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  }
  
  return parts.join(' ');
}
