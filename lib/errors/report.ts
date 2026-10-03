// Errors people hit, sent to the suite's own log (public.client_errors, read
// in Admin › Errors). Pure helpers first — what's worth sending and in what
// shape — then the one function that sends. Never throws: reporting an error
// must not cause another.

export type ErrorKind = 'render' | 'window' | 'promise';

export interface ErrorReport {
  kind: ErrorKind;
  message: string;
  stack: string;
  path: string;
  digest: string;
  release: string;
  user_agent: string;
}

// Noise every browser produces that says nothing about the suite.
const IGNORE = [
  /^ResizeObserver loop/i,
  /^Script error\.?$/i, // cross-origin script, no detail
  /Loading chunk \d+ failed/i, // a deploy replaced the build mid-visit; the next load is fine
  /NEXT_REDIRECT|NEXT_NOT_FOUND/,
  /AbortError|The user aborted a request/i,
  /extension:\/\//i,
];

/** What an unknown thrown value says, as a message and a stack. */
export function describeError(err: unknown): { message: string; stack: string } {
  if (err instanceof Error) return { message: err.message || err.name || 'Error', stack: err.stack ?? '' };
  if (typeof err === 'string') return { message: err, stack: '' };
  try { return { message: JSON.stringify(err) ?? String(err), stack: '' }; } catch { return { message: String(err), stack: '' }; }
}

/** The report to send, or null when it's noise. Paths lose their query (it can carry tokens). */
export function toReport(kind: ErrorKind, err: unknown, where: { path: string; userAgent: string; release: string; digest?: string }): ErrorReport | null {
  const { message, stack } = describeError(err);
  const clean = message.trim();
  if (!clean || IGNORE.some((re) => re.test(clean) || re.test(stack))) return null;
  return {
    kind,
    message: clean.slice(0, 1000),
    stack: stack.slice(0, 8000),
    path: where.path.split(/[?#]/)[0].slice(0, 300),
    digest: (where.digest ?? '').slice(0, 100),
    release: where.release.slice(0, 60),
    user_agent: where.userAgent.slice(0, 300),
  };
}

/** One page visit sends each distinct error once, and at most `max` in all. */
export function createGate(max = 10) {
  const seen = new Set<string>();
  return (r: ErrorReport) => {
    const key = `${r.kind}|${r.message}|${r.path}`;
    if (seen.has(key) || seen.size >= max) return false;
    seen.add(key);
    return true;
  };
}

const gate = createGate();

/** Send an error to the suite's log. Fire and forget. */
export async function reportError(kind: ErrorKind, err: unknown, digest?: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const report = toReport(kind, err, {
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? 'local',
      digest,
    });
    if (!report || !gate(report)) return;
    const { supabase } = await import('@/lib/supabase/client');
    await supabase.rpc('report_client_error', {
      p_kind: report.kind, p_message: report.message, p_stack: report.stack, p_path: report.path,
      p_digest: report.digest, p_release: report.release, p_user_agent: report.user_agent,
    });
  } catch { /* the log is best-effort */ }
}
