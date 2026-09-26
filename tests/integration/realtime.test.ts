import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createCast, destroyCast, type Cast, type Client } from './support/personas';
import { createCrewedProject } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// Live sync: changes reach every project member's open session, and never an
// outsider's. Realtime applies each subscriber's RLS to every event.
let cast: Cast;
let projectId: string;
const channels: Array<[Client, RealtimeChannel]> = [];

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Realtime'));
});

afterAll(async () => {
  for (const [client, ch] of channels) await client.removeChannel(ch);
  await destroyCast(cast);
});

/** Subscribe to one table for this project; resolves once the subscription is live. */
async function listen(client: Client, table: 'media' | 'scene_media' | 'projects', filter?: string, event: '*' | 'DELETE' = '*') {
  const events: Array<{ eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }> = [];
  const channel = client.channel(`test:${table}:${Math.random()}`);
  channel.on('postgres_changes', { event, schema: 'public', table, ...(filter ? { filter } : {}) } as never, (payload: { eventType: string; new: unknown; old: unknown }) => {
    events.push({ eventType: payload.eventType, new: payload.new as Record<string, unknown>, old: payload.old as Record<string, unknown> });
  });
  // SUBSCRIBED only means the socket joined the channel. The database-change
  // listener is live once Realtime sends its postgres_changes "ok" system
  // message — on a cold stack that can be seconds later, so wait for it.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`realtime: no postgres_changes ack for ${table}`)), 20_000);
    channel.on('system', {}, (msg: { extension?: string; status?: string; message?: string }) => {
      if (msg.extension !== 'postgres_changes') return;
      clearTimeout(timer);
      if (msg.status === 'ok') resolve();
      else reject(new Error(`realtime: ${msg.message ?? 'subscription failed'}`));
    });
    channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(err ?? new Error(status)); }
    });
  });
  channels.push([client, channel]);
  return events;
}

async function waitFor(check: () => boolean, ms = 8000) {
  const start = Date.now();
  while (!check() && Date.now() - start < ms) await new Promise((r) => setTimeout(r, 100));
  return check();
}

describe('realtime', () => {
  it('a new library item reaches crew live, and never the outsider', async () => {
    const jordanSees = await listen(cast.jordan.client, 'media', `project_id=eq.${projectId}`);
    const rileySees = await listen(cast.riley.client, 'media', `project_id=eq.${projectId}`);

    const item = await createStudioApi(cast.sam.client).addLink(projectId, cast.sam.id, { url: 'https://example.com/live.png', title: 'Live' });

    expect(await waitFor(() => jordanSees.some((e) => e.new.id === item.id))).toBe(true);
    expect(jordanSees.find((e) => e.new.id === item.id)?.eventType).toBe('INSERT');
    // Give the outsider's socket the same time to (not) receive it.
    await new Promise((r) => setTimeout(r, 1500));
    expect(rileySees).toEqual([]);
  });

  it('project edits reach crew live (the suite-wide project sync depends on it)', async () => {
    const jordanSees = await listen(cast.jordan.client, 'projects', `id=eq.${projectId}`);
    const { error } = await cast.sam.client.from('projects').update({ description: 'Now with a logline' }).eq('id', projectId);
    expect(error).toBeNull();
    expect(await waitFor(() => jordanSees.some((e) => e.new.description === 'Now with a logline'))).toBe(true);
  });

  it('deletes reach crew (by primary key — the shape lib/studio/live.ts relies on)', async () => {
    const api = createStudioApi(cast.sam.client);
    const item = await api.addLink(projectId, cast.sam.id, { url: 'https://example.com/doomed.png' });
    const jordanSees = await listen(cast.jordan.client, 'media', undefined, 'DELETE');
    await api.deleteMedia(item);
    expect(await waitFor(() => jordanSees.some((e) => e.old.id === item.id))).toBe(true);
  });
});
