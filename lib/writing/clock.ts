/** Seconds as a clock: 1500 → "25:00". */
export const mmss = (seconds: number): string => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
