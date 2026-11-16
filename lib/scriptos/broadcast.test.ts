import { describe, expect, it, vi } from 'vitest';
import { ChunkReassembler, MAX_CHUNK_CHARS } from './chunks';
import { broadcastMergedUpdate, type BroadcastChannel, type BroadcastClient } from './broadcast';

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
    expect(client.channel).toHaveBeenCalledWith('script_s1', { config: expect.objectContaining({ private: true }) });
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

  it('sends a state too large for one message as chunks that reassemble to the original', async () => {
    const { client, sent } = fake();
    const big = 'A'.repeat(MAX_CHUNK_CHARS * 2 + 5);
    expect(await broadcastMergedUpdate(client, 's1', big)).toBe('sent');
    expect(sent).toHaveLength(3);
    const r = new ChunkReassembler();
    const done = (sent as { event: string; payload: unknown }[]).map((m) => { expect(m.event).toBe('yjs_sync'); return r.accept(m.payload); });
    expect(done[2]).toBe(big);
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
