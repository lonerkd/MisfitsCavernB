'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { getSyncStatus, subscribeSyncStatus, syncPendingScripts, type SyncStatus } from '@/lib/scriptos/storage';
import { formatWait } from '@/lib/scriptos/syncWording';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export { formatWait };

export interface SyncChipView {
  text: string;
  tone: 'warn' | 'error' | 'busy';
  /** A "sync now" button makes sense: something is queued and we're not already mid-pass. */
  canRetry: boolean;
}

/** What the chip says for a queue state, or null when there is nothing to say. */
export function describeSync(s: SyncStatus, now: number): SyncChipView | null {
  const queued = s.pending + s.deletes;
  const what = [
    s.pending > 0 ? plural(s.pending, 'script', 'scripts') : '',
    s.deletes > 0 ? plural(s.deletes, 'delete', 'deletes') : '',
  ].filter(Boolean).join(' + ');

  if (queued === 0) return s.online ? null : { text: 'Offline — nothing waiting', tone: 'warn', canRetry: false };
  if (s.syncing) return { text: `Syncing ${what}…`, tone: 'busy', canRetry: false };
  if (!s.online) return { text: `Offline — ${what} saved on this device, will sync on reconnect`, tone: 'warn', canRetry: false };
  const retry = s.nextRetryAt === null ? '' : ` · retry in ${formatWait(s.nextRetryAt - now)}`;
  if (s.attempts > 0) {
    return { text: `Can’t reach the server — ${what} waiting${retry} (try ${s.attempts + 1})`, tone: 'error', canRetry: true };
  }
  return { text: `${what} waiting to sync${retry}`, tone: 'warn', canRetry: true };
}

const TONE_COLOR = { warn: 'var(--warn)', error: 'var(--err, #ef4444)', busy: 'var(--violet)' } as const;

/** The queue's state as the chip words it (null when there is nothing to say); ticks each second only while a retry countdown shows. */
function useSyncView(): SyncChipView | null {
  const status = useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
  const [now, setNow] = useState(() => Date.now());
  const counting = status.nextRetryAt !== null;

  // Tick once a second only while a retry countdown is on screen (a stale first
  // frame reads "1 s" — formatWait never goes below it).
  useEffect(() => {
    if (!counting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [counting]);

  return describeSync(status, now);
}

function ChipBody({ view }: { view: SyncChipView }) {
  return (
    <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 6, color: TONE_COLOR[view.tone] }}>
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: view.tone === 'busy' ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
      <span>{view.text}</span>
      {view.canRetry && (
        <button
          type="button"
          onClick={() => { syncPendingScripts().catch(console.error); }}
          style={{ background: 'transparent', border: '1px solid currentColor', borderRadius: 8, color: 'inherit', cursor: 'pointer', font: 'inherit', padding: '1px 6px' }}
        >
          Sync now
        </button>
      )}
    </span>
  );
}

/** The offline queue in the editor's status bar: network, what is waiting, when it retries. */
export function SyncStatusChip() {
  const view = useSyncView();
  return view ? <ChipBody view={view} /> : null;
}

/**
 * The same queue on a phone while the keyboard is up (the status bar is hidden then, to give the page its room): a one-line strip
 * on top of the tool strip, only when there is something to say, so a stuck save is not invisible while you type.
 */
export function PhoneSyncLine({ bottom }: { bottom: number }) {
  const view = useSyncView();
  if (!view) return null;
  return (
    <div data-testid="phone-sync-line" style={{ position: 'fixed', left: 0, right: 0, bottom, zIndex: 149, padding: '4px 12px', background: 'var(--surface)', borderTop: '1px solid rgba(var(--ink-rgb), 0.08)', fontFamily: 'var(--mono)', fontSize: 12, display: 'flex', justifyContent: 'center' }}>
      <ChipBody view={view} />
    </div>
  );
}
