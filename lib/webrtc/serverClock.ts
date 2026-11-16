// Seat order in a voice room must not depend on each person's own clock: a
// laptop that is two minutes slow would always look like the earliest joiner.
// Each client asks the server for its time, works out how far its own clock is
// off, and stamps its join time with the correction.

export interface ClockSample {
  /** Local time when the request left. */
  sentAt: number;
  /** The server's time, as it answered. */
  serverNow: number;
  /** Local time when the answer arrived. */
  receivedAt: number;
}

/**
 * How many ms to add to the local clock to get the server's. The server read
 * its clock somewhere in the round trip; the midpoint is the best guess, so
 * the error is at most half the round trip.
 */
export function clockOffset(s: ClockSample): number {
  return s.serverNow - (s.sentAt + s.receivedAt) / 2;
}

/** The offset from the sample with the shortest round trip (the least uncertain); 0 with none. */
export function bestOffset(samples: ClockSample[]): number {
  let best: ClockSample | null = null;
  for (const s of samples) {
    if (!Number.isFinite(s.serverNow)) continue;
    if (!best || s.receivedAt - s.sentAt < best.receivedAt - best.sentAt) best = s;
  }
  return best ? clockOffset(best) : 0;
}

/** The server's time now, given an offset from `bestOffset`. */
export function serverTime(offset: number, localNow: number = Date.now()): number {
  return Math.round(localNow + offset);
}

/**
 * Ask `/api/time` a few times and return the offset to apply to the local
 * clock. Never throws: when the server cannot be reached the offset is 0, the
 * local clock (the cap still holds; only the tie order is less fair).
 */
export async function fetchServerOffset(
  fetchFn: typeof fetch = (...a) => fetch(...a),
  attempts = 3,
  timeoutMs = 1500,
): Promise<number> {
  const samples: ClockSample[] = [];
  for (let i = 0; i < attempts; i++) {
    const sentAt = Date.now();
    try {
      const res = await fetchFn('/api/time', { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      const body = (await res.json()) as { now?: unknown };
      const receivedAt = Date.now();
      if (typeof body.now === 'number') samples.push({ sentAt, serverNow: body.now, receivedAt });
    } catch {
      break; // offline or slow: do not keep the join waiting
    }
  }
  return bestOffset(samples);
}
