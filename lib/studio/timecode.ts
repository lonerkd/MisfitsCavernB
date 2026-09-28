// Timecodes for review notes: seconds <-> "m:ss" / "h:mm:ss" (with optional
// tenths). Pure, so the review UI and tests agree.

export function formatTimecode(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "83", "1:23", "1:23.5", "01:02:03" → seconds; null if it isn't a timecode. */
export function parseTimecode(input: string): number | null {
  const t = input.trim();
  if (!/^\d+(:\d{1,2}){0,2}(\.\d+)?$/.test(t)) return null;
  const [whole, frac] = t.split('.');
  const parts = whole.split(':').map(Number);
  if (parts.slice(1).some((p) => p > 59)) return null;
  const secs = parts.reduce((acc, p) => acc * 60 + p, 0) + (frac ? Number(`0.${frac}`) : 0);
  return secs < 360000 ? Math.round(secs * 100) / 100 : null;
}
