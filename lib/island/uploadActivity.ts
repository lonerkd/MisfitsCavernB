// What the island says while files are going up: how many, how far along. Pure (the numbers in, an Activity out);
// `lib/island/uploads.ts` keeps the numbers and publishes them, `lib/supabase/uploadProgress.ts` produces them.
import type { Activity } from './activities';

export interface UploadSnapshot {
  /** Uploads in flight. */
  count: number;
  /** The name when there is exactly one. */
  name: string | null;
  loaded: number;
  total: number;
}

/** Whole percent, so the bar does not republish the island for a change nobody can see. */
export const quantize = (fraction: number): number => Math.round(Math.min(1, Math.max(0, fraction)) * 100) / 100;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function uploadActivity(s: UploadSnapshot): Activity | null {
  if (s.count === 0) return null;
  const fraction = s.total > 0 ? Math.min(1, s.loaded / s.total) : undefined;
  // Everything shown moves in whole percent (the bytes too), so the island is told only when a person could see a change.
  const shown = fraction === undefined ? undefined : quantize(fraction);
  const pct = shown === undefined ? '' : `${Math.round(shown * 100)}%`;
  return {
    id: 'upload',
    kind: 'upload',
    tone: 'busy',
    title: s.count === 1 && s.name ? `Uploading ${s.name}` : `Uploading ${s.count} files`,
    detail: shown !== undefined ? [pct, `${formatBytes(Math.round(shown * s.total))} of ${formatBytes(s.total)}`].join(' · ') : undefined,
    progress: shown,
  };
}
