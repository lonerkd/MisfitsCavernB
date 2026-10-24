// Logging for share-link lookups (/s/<token>). A miss is a wrong, revoked or
// switched-off token; a burst of them from one place is someone guessing.
// Each miss is one structured line on stdout (Vercel's runtime logs / a log
// drain, where the platform's own request record carries the connecting
// address and can be filtered and alerted on). We log no address ourselves:
// x-forwarded-for is client-supplied unless the proxy overwrites it, so
// anything we derived from it could be forged. The token is never logged —
// only a short one-way fingerprint, enough to see the same guess repeated.
import { createHash } from 'node:crypto';

export function tokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 12);
}

export type ShareLookupEvent = 'share_link_miss' | 'share_link_error';

export function logShareLookup(event: ShareLookupEvent, token: string, detail?: string): void {
  const line = JSON.stringify({
    event,
    token_fp: tokenFingerprint(token),
    token_len: token.length,
    ...(detail ? { detail } : {}),
  });
  if (event === 'share_link_error') console.error(line);
  else console.warn(line);
}
