'use client';

// Keeps On Set working without signal (see onset-offline.ts): writes go
// straight through when they can, wait in this device's queue when they
// can't, and the queue is sent in order as soon as the connection is back.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { studio } from './index';
import { enqueue, isNetworkError, loadQueue, replay, saveQueue, type OnSetOp } from './onset-offline';

async function send(op: OnSetOp) {
  switch (op.kind) {
    case 'shot': await studio.updateShot(op.id, { status: op.status }); return;
    case 'scene': await studio.updateScene(op.id, { status: op.status }); return;
    case 'log-add': await studio.addSetLog(op.entry); return;
    case 'log-update': await studio.updateSetLog(op.id, op.patch); return;
    case 'log-delete': await studio.deleteSetLog(op.id); return;
  }
}

const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

export interface OnSetSync {
  online: boolean;
  /** Changes made here and not yet sent. */
  pending: number;
  syncing: boolean;
  /** How many changes the last sync sent (shown briefly). */
  justSent: number;
  /**
   * Make a change: `live` sends it now; if there's no connection (or earlier
   * changes are still waiting, so order holds) it waits in the queue. The
   * caller has already shown it. Refusals are thrown as usual.
   */
  run: (op: OnSetOp, live: () => Promise<void>) => Promise<'sent' | 'queued'>;
}

export function useOnSetSync(projectId: string, opts: { reload: () => Promise<unknown>; onRefused: (messages: string[]) => void }): OnSetSync {
  const [online, setOnline] = useState(isOnline);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSent, setJustSent] = useState(0);
  const queue = useRef<OnSetOp[]>([]);
  const busy = useRef(false);
  const optsRef = useRef(opts);
  useLayoutEffect(() => { optsRef.current = opts; });

  const store = useCallback((q: OnSetOp[]) => {
    queue.current = q;
    saveQueue(projectId, q);
    setPending(q.length);
  }, [projectId]);

  const flush = useCallback(async (): Promise<void> => {
    if (busy.current || !queue.current.length || !isOnline()) return;
    busy.current = true;
    setSyncing(true);
    let again = false;
    try {
      const taken = queue.current;
      const r = await replay(taken, send, isOnline);
      // Drop what was handled; what's left, and anything made while this
      // ran (appended, never folded into what was being sent), stays.
      const handled = new Set(taken.slice(0, taken.length - r.rest.length));
      store(queue.current.filter((op) => !handled.has(op)));
      if (r.sent) { setJustSent(r.sent); window.setTimeout(() => setJustSent(0), 6000); }
      if (r.refused.length) optsRef.current.onRefused(r.refused.map((x) => x.message));
      if (!r.rest.length) await optsRef.current.reload();
      // Anything made while this ran goes next.
      again = !r.rest.length && queue.current.length > 0;
    } finally {
      busy.current = false;
      setSyncing(false);
    }
    if (again) await flush();
  }, [store]);

  useEffect(() => {
    store(loadQueue(projectId));
    const up = () => { setOnline(true); void flush(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    void flush();
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [projectId, store, flush]);

  const run = useCallback(async (op: OnSetOp, live: () => Promise<void>) => {
    if (queue.current.length || !isOnline()) {
      // While a sync is sending the queue, add to its end untouched.
      store(busy.current ? [...queue.current, op] : enqueue(queue.current, op));
      if (isOnline()) void flush();
      return 'queued' as const;
    }
    try {
      await live();
      return 'sent' as const;
    } catch (e) {
      if (!isNetworkError(e, isOnline())) throw e;
      setOnline(isOnline());
      store(busy.current ? [...queue.current, op] : enqueue(queue.current, op));
      return 'queued' as const;
    }
  }, [store, flush]);

  return { online, pending, syncing, justSent, run };
}
