import { YJS_SYNC_EVENT } from './cowriting';
import { toWirePayloads } from './chunks';

const SUBSCRIBE_TIMEOUT_MS = 5_000;

/** The slice of a Supabase client this needs, so a test can hand in a fake. */
export interface BroadcastChannel {
  subscribe(callback: (status: string) => void): unknown;
  send(message: { type: 'broadcast'; event: string; payload: unknown }): Promise<unknown>;
}
export interface BroadcastClient {
  channel(topic: string, config?: unknown): BroadcastChannel;
  removeChannel(channel: BroadcastChannel): unknown;
  /** The channels this client already has open (Supabase hands back an open one for the same topic). */
  getChannels?(): { topic: string }[];
}

export type BroadcastResult = 'sent' | 'failed' | 'editor-open-here';

/**
 * After the offline queue merged its edits into the server's shared document, tell editors already open on the
 * script (another tab or device: the queue only runs where none is open) at once, in the same message the live
 * provider sends when asked for the state (`yjs_sync`), so they apply it as they apply any update.
 *
 * Never throws and never blocks the queue: the merge is already saved, and an editor that misses this still
 * merges the stored state at its next save. A state too large for one Realtime message is sent as numbered chunks
 * (`chunks.ts`), which the live provider reassembles.
 */
export async function broadcastMergedUpdate(client: BroadcastClient, scriptId: string, encodedState: string): Promise<BroadcastResult> {
  // `channel(topic)` returns the channel already open for that topic. If an editor in this tab has the script's
  // channel, it is that editor's live co-writing channel: it already syncs the merge, and removing it below would
  // cut the editor off. So leave it alone.
  if (client.getChannels?.().some((c) => c.topic === `realtime:script_${scriptId}`)) return 'editor-open-here';
  let channel: BroadcastChannel | null = null;
  try {
    channel = client.channel(`script_${scriptId}`, { config: { private: true, broadcast: { self: false } } });
    const ch = channel;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out subscribing')), SUBSCRIBE_TIMEOUT_MS);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(timer); reject(new Error(status)); }
      });
    });
    for (const payload of toWirePayloads(encodedState)) {
      const status = await ch.send({ type: 'broadcast', event: YJS_SYNC_EVENT, payload });
      if (status !== 'ok') return 'failed';
    }
    return 'sent';
  } catch (error) {
    console.warn('[Offline Sync] Could not tell open editors about the merge:', error);
    return 'failed';
  } finally {
    if (channel) { try { void client.removeChannel(channel); } catch { /* nothing to clean up */ } }
  }
}
