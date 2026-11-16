import { YJS_SYNC_EVENT } from './cowriting';

/**
 * Supabase Realtime refuses a broadcast over its payload limit (250 KB on the free plan). Leave room for the
 * envelope: an update whose base64 text is longer than this is not sent.
 */
export const MAX_BROADCAST_UPDATE_CHARS = 200_000;

const SUBSCRIBE_TIMEOUT_MS = 5_000;

/** The slice of a Supabase client this needs, so a test can hand in a fake. */
export interface BroadcastChannel {
  subscribe(callback: (status: string) => void): unknown;
  send(message: { type: 'broadcast'; event: string; payload: unknown }): Promise<unknown>;
}
export interface BroadcastClient {
  channel(topic: string, config?: unknown): BroadcastChannel;
  removeChannel(channel: BroadcastChannel): unknown;
}

export type BroadcastResult = 'sent' | 'too-large' | 'failed';

/**
 * After the offline queue merged its edits into the server's shared document, tell editors already open on the
 * script (another tab or device: the queue only runs where none is open) at once, in the same message the live
 * provider sends when asked for the state (`yjs_sync`), so they apply it as they apply any update.
 *
 * Never throws and never blocks the queue: the merge is already saved, and an editor that misses this still
 * merges the stored state at its next save. That is also the answer to an update too large for Realtime: it is
 * skipped, not split.
 */
export async function broadcastMergedUpdate(client: BroadcastClient, scriptId: string, encodedState: string): Promise<BroadcastResult> {
  if (encodedState.length > MAX_BROADCAST_UPDATE_CHARS) return 'too-large';
  let channel: BroadcastChannel | null = null;
  try {
    channel = client.channel(`script_${scriptId}`, { config: { broadcast: { self: false } } });
    const ch = channel;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out subscribing')), SUBSCRIBE_TIMEOUT_MS);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(timer); reject(new Error(status)); }
      });
    });
    const status = await ch.send({ type: 'broadcast', event: YJS_SYNC_EVENT, payload: { update: encodedState } });
    return status === 'ok' ? 'sent' : 'failed';
  } catch (error) {
    console.warn('[Offline Sync] Could not tell open editors about the merge:', error);
    return 'failed';
  } finally {
    if (channel) { try { void client.removeChannel(channel); } catch { /* nothing to clean up */ } }
  }
}
