import { describe, expect, it, vi } from 'vitest';
import { broadcastMergedUpdate, MAX_BROADCAST_UPDATE_CHARS, type BroadcastChannel, type BroadcastClient } from './broadcast';

function fake(opts: { status?: string; sendResult?: unknown; sendThrows?: boolean } = {}) {
  const sent: unknown[] = [];
  const channel: BroadcastChannel = {
    subscribe: (cb) => { queueMicrotask(() => cb(opts.status ?? 'SUBSCRIBED')); return channel; },
    send: async (message) => {
      if (opts.sendThrows) throw new Error('boom');
      sent.push(message);
      return opts.sendResult ?? 'ok';
    },
  };
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  } satisfies BroadcastClient;
  return { client, channel, sent };
}

describe('broadcastMergedUpdate', () => {
  it('sends the merged state on the script channel in the live provider\'s yjs_sync shape, then lets go', async () => {
    const { client, channel, sent } = fake();
    expect(await broadcastMergedUpdate(client, 's1', 'QUJD')).toBe('sent');
    expect(client.channel).toHaveBeenCalledWith('script_s1', expect.anything());
    expect(sent).toEqual([{ type: 'broadcast', event: 'yjs_sync', payload: { update: 'QUJD' } }]);
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });

  it('leaves an editor\x27s live channel in this tab alone: no reuse, no removal', async () => {
    const { client } = fake();
    const withEditor = { ...client, getChannels: () => [{ topic: 'realtime:script_s1' }] };
    expect(await broadcastMergedUpdate(withEditor, 's1', 'QUJD')).toBe('editor-open-here');
    expect(client.channel).not.toHaveBeenCalled();
    expect(client.removeChannel).not.toHaveBeenCalled();
  });

  it('skips an update too large for Realtime without opening a channel', async () => {
    const { client } = fake();
    expect(await broadcastMergedUpdate(client, 's1', 'A'.repeat(MAX_BROADCAST_UPDATE_CHARS + 1))).toBe('too-large');
    expect(client.channel).not.toHaveBeenCalled();
  });

  it('reports a channel that will not subscribe, and cleans up', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { client, sent } = fake({ status: 'CHANNEL_ERROR' });
    expect(await broadcastMergedUpdate(client, 's1', 'QUJD')).toBe('failed');
    expect(sent).toHaveLength(0);
    expect(client.removeChannel).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('never throws when the send fails or is refused', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await broadcastMergedUpdate(fake({ sendThrows: true }).client, 's1', 'QUJD')).toBe('failed');
    expect(await broadcastMergedUpdate(fake({ sendResult: 'error' }).client, 's1', 'QUJD')).toBe('failed');
    warn.mockRestore();
  });
});
