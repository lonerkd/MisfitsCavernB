'use client';

// The outbox: every capture is written here (IndexedDB, this device) before
// it's sent, and removed once the library has it. No signal on set means it
// waits; the connection coming back, the app coming to the front, or the next
// capture sends it. Blobs are stored as they are, so a clip or a memo survives
// the phone locking or the tab closing.

import { studio } from '@/lib/studio';
import { isOffline, sendOrder, type Capture } from './capture';

const DB = 'mc-pocket';
const STORE = 'outbox';
export const OUTBOX_EVENT = 'mc:outbox';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally { db.close(); }
}

export const listOutbox = (): Promise<Capture[]> => tx('readonly', (s) => s.getAll() as IDBRequest<Capture[]>).catch(() => []);
const put = (c: Capture) => tx('readwrite', (s) => s.put(c));
const remove = (id: string) => tx('readwrite', (s) => s.delete(id));

async function announce() {
  const waiting = await listOutbox();
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT, { detail: waiting }));
  return waiting;
}

/** Keep a capture on this device, then try to send everything waiting. */
export async function capture(c: Capture, userId: string): Promise<FlushResult> {
  await put(c);
  await announce();
  return flush(userId);
}

async function send(c: Capture, userId: string) {
  if (c.kind === 'note') { await studio.addNote(c.projectId, userId, { title: c.title ?? undefined, text: c.text }); return; }
  if (c.kind === 'link') { await studio.addLink(c.projectId, userId, { url: c.url }); return; }
  const file = new File([c.blob], c.name, { type: c.type });
  const media = await studio.uploadFile(c.projectId, userId, file, { title: c.title ?? undefined, meta: { duration_seconds: c.duration ?? null } });
  if (c.lines?.length) {
    // The memo is in; losing its dictation shouldn't hold it back.
    try { await studio.addTranscriptLines(media, userId, c.lines, -1); } catch { /* the recording stands on its own */ }
  }
}

export interface FlushResult { sent: string[]; waiting: number; failed: Array<{ id: string; error: string }>; offline: boolean }

let running: Promise<FlushResult> | null = null;

/** Send what's waiting, oldest first. One run at a time. */
export function flush(userId: string, retryFailed = false): Promise<FlushResult> {
  running ??= (async () => {
    const result: FlushResult = { sent: [], waiting: 0, failed: [], offline: false };
    try {
      for (const c of sendOrder(await listOutbox())) {
        if (c.error && !retryFailed) continue;
        try {
          await send(c, userId);
          await remove(c.id);
          result.sent.push(c.id);
        } catch (err) {
          if (isOffline(err, navigator.onLine)) { result.offline = true; break; }
          const error = err instanceof Error ? err.message : 'Could not send';
          await put({ ...c, error });
          result.failed.push({ id: c.id, error });
        }
      }
    } finally {
      result.waiting = (await announce()).length;
      running = null;
    }
    return result;
  })();
  return running;
}

export async function discard(id: string) { await remove(id); await announce(); }
