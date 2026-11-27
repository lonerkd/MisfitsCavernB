/**
 * Whether the live co-writing provider (`sync.ts`) may broadcast right now.
 *
 * A window can look connected while its writer is effectively offline: the Realtime websocket stays
 * open (Playwright's offline switch does not close it, and a flaky network may not either) while the
 * HTTP saves fail and queue. The provider used to gate sends on the local `subscribed` flag alone, so
 * "offline" edits still broadcast live while their saves queued — the two streams then met a server
 * state that knew nothing of them, and reconciled badly (BACKLOG 3.33 leftover (i): a garbled merge,
 * an edit landed inside a heading).
 *
 * This gate holds a send unless every leg is healthy: the channel is subscribed, the browser reports
 * itself online, and the last save attempt reached the server. A held send is never queued payload by
 * payload — Yjs updates are incremental, and the full stored state subsumes them — instead the gate
 * remembers that a resync is owed, and the provider answers it with one full-state send (plus a sync
 * request) the moment health returns. Pure: no channel, no timers, no DOM — the provider feeds it
 * events and asks before sending.
 */
export class BroadcastGate {
  private subscribed = false;
  private online: boolean;
  private reachable = true;
  private resyncOwed = false;

  constructor(online = true) {
    this.online = online;
  }

  /** Every leg healthy: sends may go out now. */
  get healthy(): boolean {
    return this.subscribed && this.online && this.reachable;
  }

  /**
   * Ask before sending one payload. True when it may go out; false holds it and records that a
   * full-state resync is owed once health returns.
   */
  allowSend(): boolean {
    if (this.healthy) return true;
    this.resyncOwed = true;
    return false;
  }

  /** The channel's subscription changed. True when this made the gate healthy. */
  setSubscribed(subscribed: boolean): boolean {
    const was = this.healthy;
    this.subscribed = subscribed;
    return !was && this.healthy;
  }

  /** The browser's online/offline state changed. True when this made the gate healthy. */
  setOnline(online: boolean): boolean {
    const was = this.healthy;
    this.online = online;
    return !was && this.healthy;
  }

  /**
   * A save attempt's outcome: a failure means the server is not being reached, however open the
   * websocket looks. True when a success made the gate healthy again.
   */
  recordSave(ok: boolean): boolean {
    const was = this.healthy;
    this.reachable = ok;
    return !was && this.healthy;
  }

  /** Whether a full-state resync is owed, spending the debt. Only spends while healthy. */
  consumeResync(): boolean {
    if (!this.healthy) return false;
    const owed = this.resyncOwed;
    this.resyncOwed = false;
    return owed;
  }
}
