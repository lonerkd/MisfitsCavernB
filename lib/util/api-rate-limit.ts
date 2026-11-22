

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

interface RateLimitOptions {

  maxRequests: number;

  windowMs: number;

  /** The endpoint, so two routes do not share one counter for the same caller. */
  scope?: string;
}

interface RateLimitResult {

  allowed: boolean;

  remaining: number;

  resetAt: number;
}

/**
 * Counts are per server instance (in memory), so a burst spread over instances can exceed the limit; a shared store is an
 * owner decision (a service and a cost). `scope` keeps each endpoint's counter apart from the others'.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 10, windowMs: 60_000 },
): RateLimitResult {
  const now = Date.now();
  const key = options.scope ? `${options.scope}:${identifier}` : identifier;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {

    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.maxRequests - 1, resetAt };
  }

  if (entry.count >= options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getClientIp(req: Request | { headers: Headers }): string {
  // On Vercel the edge sets these itself; a client-sent x-forwarded-for can only add to the front of the list.
  const vercel = req.headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {

    // Behind a proxy that appends, the last entry is the one it saw.
    return forwarded.split(',').pop()!.trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}