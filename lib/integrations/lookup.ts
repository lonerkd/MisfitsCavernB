// Asks app/api/links what a pasted address is. Never throws: when the answer
// doesn't come (offline, rate-limited, the provider is down) the link is
// simply added as it is.

import type { LinkDetails, Pin } from './links';

export type LinkLookup =
  | { type: 'video'; details: LinkDetails }
  | { type: 'board'; board: string | null; pins: Pin[]; error?: string }
  | { type: 'none' };

export async function lookupLink(url: string): Promise<LinkLookup> {
  try {
    const res = await fetch(`/api/links?url=${encodeURIComponent(url.trim())}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { type: 'none' };
    const data = (await res.json()) as LinkLookup;
    return data && (data.type === 'video' || data.type === 'board') ? data : { type: 'none' };
  } catch {
    return { type: 'none' };
  }
}
