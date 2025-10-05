// utils/time.ts
export function getRelativeTime(input: Date): string {
  const now = Date.now();
  const then = new Date(input).getTime();
  
  let seconds = Math.floor((now - then) / 1000);

  // Future dates or invalid -> treat as just now
  if (seconds < 60) return "just now";

  const units = [
    { abbr: "y", seconds: 365 * 24 * 60 * 60 },   // year
    { abbr: "mo", seconds: 30 * 24 * 60 * 60 },   // month (approx)
    { abbr: "w", seconds: 7 * 24 * 60 * 60 },     // week
    { abbr: "d", seconds: 24 * 60 * 60 },         // day
    { abbr: "h", seconds: 60 * 60 },              // hour
    { abbr: "m", seconds: 60 },                   // minute
  ];

  for (const u of units) {
    if (seconds >= u.seconds) {
      const value = Math.floor(seconds / u.seconds);
      return `${value}${u.abbr} ago`;
    }
  }

  return "just now"; // fallback (shouldn't reach here)
}