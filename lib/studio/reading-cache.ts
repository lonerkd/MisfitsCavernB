import type { ParseContext } from '@/lib/scriptos/parser';

/**
 * What `loadReadingContext` has built, per script, for a few seconds. It lives here, with nothing else imported, so the studio API (which
 * saves verdicts and overrides) and the sign-out action can clear it without an import cycle through `studio`.
 */
export const readingContextLoads = new Map<string, { at: number; promise: Promise<ParseContext> }>();

/** Forget what was loaded (after a person changes a verdict or an override, or signs out), so the next read sees the truth. */
export function forgetReadingContext(scriptId?: string): void {
  if (scriptId) readingContextLoads.delete(scriptId); else readingContextLoads.clear();
}
