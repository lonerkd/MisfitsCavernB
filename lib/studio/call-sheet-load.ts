// Loading the crew's call sheet page, as one of three outcomes, and what each
// outcome tells the person and the admins. Pure: the page runs the load and
// carries out the notice.

import type { CallSheetView } from './api';

export type CallSheetLoad =
  | { status: 'ready'; view: CallSheetView }
  | { status: 'missing' }
  | { status: 'error'; message: string; error: unknown };

/**
 * Runs the load and never rejects. Nothing back — or a sheet whose production
 * can't be read — is "missing": the sheet was removed, or the person isn't on
 * the production (RLS hides both the same way).
 */
export async function loadCallSheet(get: () => Promise<CallSheetView | null>): Promise<CallSheetLoad> {
  try {
    const view = await get();
    if (!view || !view.project) return { status: 'missing' };
    return { status: 'ready', view };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Could not load the call sheet';
    return { status: 'error', message, error };
  }
}

export interface CallSheetNotice {
  toast: { message: string; type: 'error' | 'info' };
  /** For the suite's error log (Admin › Errors): the error and a digest that groups it. */
  log: { error: unknown; digest: string };
}

/**
 * What to tell the person, and what to log, when the page can't show a sheet.
 * Null when it loaded. A missing sheet is logged too — a notification or link
 * that leads nowhere is worth an admin seeing; the log's per-visit gate and
 * the database's rate limit keep it from flooding.
 */
export function callSheetNotice(load: CallSheetLoad, sheetId: string): CallSheetNotice | null {
  if (load.status === 'ready') return null;
  if (load.status === 'missing') {
    return {
      toast: { message: 'That call sheet isn’t available to you — it may have been removed.', type: 'info' },
      log: { error: new Error(`Call sheet not found or not visible: ${sheetId}`), digest: 'call-sheet:missing' },
    };
  }
  return {
    toast: { message: `${load.message.replace(/\.$/, '')}. Try again in a moment.`, type: 'error' },
    log: { error: load.error, digest: 'call-sheet:load-failed' },
  };
}
