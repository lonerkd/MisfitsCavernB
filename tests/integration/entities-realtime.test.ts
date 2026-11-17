import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast, type Client } from './support/personas';
import { createCrewedProject } from './support/project';

// The film graph's labels are live: `entities` is in the Realtime publication (20261117000100), so a rename reaches a crew
// member's open page, and RLS still keeps it from an outsider. (Before the migration `entities` was the one subscribed table
// missing from the publication, and nobody was told about a collaborator's rename.)
let cast: Cast;
let projectId: string;
let characterId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Realtime entities'));
  characterId = (await adminClient().from('characters').insert({ project_id: projectId, name: 'ROSA' }).select('id').single()).data!.id;
});
afterAll(async () => {
  await adminClient().from('projects').delete().eq('id', projectId);
  await destroyCast(cast);
});

/** Listens for entity updates on the project as one persona; resolves the labels seen after `ms`. */
async function listen(client: Client, name: string) {
  const seen: string[] = [];
  // postgres_changes is authorised by the connection's token: hand the socket the signed-in token (not the anon key) so RLS applies to this person.
  const token = (await client.auth.getSession()).data.session?.access_token;
  if (token) await client.realtime.setAuth(token);
  const channel = client.channel(name).on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'entities', filter: `project_id=eq.${projectId}` },
    (payload) => { seen.push((payload.new as { label: string }).label); },
  );
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('realtime did not subscribe')), 10_000);
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') { clearTimeout(t); resolve(); } });
  });
  return { seen, stop: () => client.removeChannel(channel) };
}

describe('entities over Realtime', () => {
  it('a rename reaches crew live and nobody outside the project', async () => {
    const jordan = await listen(cast.jordan.client, `ent-jordan-${Date.now()}`);
    const riley = await listen(cast.riley.client, `ent-riley-${Date.now()}`);
    await new Promise((r) => setTimeout(r, 500));
    expect((await adminClient().from('characters').update({ name: 'ROSA DIAZ' }).eq('id', characterId)).error).toBeNull();
    await new Promise((r) => setTimeout(r, 3_000));
    expect(jordan.seen).toContain('ROSA DIAZ');
    expect(riley.seen).toEqual([]);
    await jordan.stop();
    await riley.stop();
  }, 30_000);
});
