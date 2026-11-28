import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, adminClient, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// Board-level permissions, annotation pins and the expiring share link.
// Sam owns the project, Jordan is a contributor (shapes it; flipped to a viewer where a test needs one), Riley is outside.
let cast: Cast;
let projectId: string;
let boardId: string;
let itemId: string;
const admin = adminClient();

const setCrewRole = async (role: 'contributor' | 'viewer') => {
  const { error } = await admin.from('project_crew').update({ role }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  expect(error).toBeNull();
};

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Board access'));
  const sam = createStudioApi(cast.sam.client);
  boardId = (await sam.createMoodBoard(projectId, cast.sam.id, 'Look', 'free')).board.id;
  const note = await sam.addBoardNote({ id: boardId, project_id: projectId }, cast.sam.id, 'A card to pin', []);
  itemId = note.id;
});
afterAll(async () => { await destroyCast(cast); });

describe('board access', () => {
  it('an open board is seen and edited by the crew, and an outsider sees nothing', async () => {
    const jordan = createStudioApi(cast.jordan.client);
    expect((await jordan.listMoodBoards(projectId)).map((b) => b.id)).toContain(boardId);
    await expect(jordan.addBoardNote({ id: boardId, project_id: projectId }, cast.jordan.id, 'Jordan was here', [])).resolves.toBeTruthy();
    expect(await createStudioApi(cast.riley.client).listMoodBoards(projectId)).toEqual([]);
  });

  it('only people who shape the project change a board\'s access; an outsider cannot', async () => {
    const riley = createStudioApi(cast.riley.client);
    await expect(riley.setBoardAccess(boardId, 'private')).rejects.toThrow();
    const sam = createStudioApi(cast.sam.client);
    expect((await sam.setBoardAccess(boardId, 'view')).access).toBe('view');
  });

  it('view: a viewer sees the board and its cards but cannot edit, pin, or delete; someone who shapes still can', async () => {
    await setCrewRole('viewer');
    const jordan = createStudioApi(cast.jordan.client);
    expect((await jordan.listMoodBoards(projectId)).map((b) => b.access)).toContain('view');
    expect((await jordan.listMoodBoardItems(projectId)).some((i) => i.id === itemId)).toBe(true);
    await expect(jordan.addBoardNote({ id: boardId, project_id: projectId }, cast.jordan.id, 'no', [])).rejects.toThrow();
    await expect(jordan.updateBoardItem(itemId, { x: 40, y: 40 })).rejects.toThrow();
    await expect(jordan.addBoardPin({ id: itemId, project_id: projectId }, cast.jordan.id, { x: 10, y: 10 }, 'nope')).rejects.toThrow();
    await expect(jordan.deleteMoodBoard(boardId)).rejects.toThrow();
    await expect(jordan.setBoardAccess(boardId, 'open')).rejects.toThrow();
    // The board is unchanged.
    const sam = createStudioApi(cast.sam.client);
    expect((await sam.listMoodBoards(projectId)).find((b) => b.id === boardId)?.access).toBe('view');
    await setCrewRole('contributor');
    await expect(createStudioApi(cast.jordan.client).updateBoardItem(itemId, { x: 40, y: 40 })).resolves.toBeTruthy();
  });

  it('private: a viewer and an outsider do not see the board, its cards or its pins; Sam does', async () => {
    const sam = createStudioApi(cast.sam.client);
    const pin = await sam.addBoardPin({ id: itemId, project_id: projectId }, cast.sam.id, { x: 20, y: 30 }, 'Private pin');
    await sam.setBoardAccess(boardId, 'private');
    await setCrewRole('viewer');
    for (const who of [cast.jordan, cast.riley]) {
      const api = createStudioApi(who.client);
      expect((await api.listMoodBoards(projectId)).some((b) => b.id === boardId)).toBe(false);
      expect((await api.listMoodBoardItems(projectId)).some((i) => i.board_id === boardId)).toBe(false);
      expect((await api.listMoodBoardPins(projectId)).some((p) => p.id === pin.id)).toBe(false);
    }
    expect((await sam.listMoodBoards(projectId)).some((b) => b.id === boardId)).toBe(true);
    // A viewer cannot create a restricted board either.
    await expect(createStudioApi(cast.jordan.client).setBoardAccess(boardId, 'open')).rejects.toThrow();
    await setCrewRole('contributor');
    expect((await createStudioApi(cast.jordan.client).listMoodBoards(projectId)).some((b) => b.id === boardId)).toBe(true);
    await sam.removeBoardPin(pin.id);
    await sam.setBoardAccess(boardId, 'open');
  });

  it('a viewer cannot make a restricted board', async () => {
    await setCrewRole('viewer');
    const { error } = await cast.jordan.client.from('mood_boards').insert({ project_id: projectId, name: 'Sneaky', access: 'private', created_by: cast.jordan.id });
    expect(error).not.toBeNull();
    await setCrewRole('contributor');
  });
});

describe('annotation pins', () => {
  it('a pin is saved with its spot, edited, numbered and removed; an outsider cannot read or write them', async () => {
    const sam = createStudioApi(cast.sam.client);
    const a = await sam.addBoardPin({ id: itemId, project_id: projectId }, cast.sam.id, { x: 12.5, y: 80 }, '  Warm light here  ');
    expect(a.text).toBe('Warm light here');
    expect([a.x, a.y]).toEqual([12.5, 80]);
    const edited = await sam.updateBoardPin(a.id, { text: 'Warmer light here' });
    expect(edited.text).toBe('Warmer light here');
    expect((await createStudioApi(cast.jordan.client).listMoodBoardPins(projectId)).map((p) => p.id)).toContain(a.id);

    const riley = createStudioApi(cast.riley.client);
    expect(await riley.listMoodBoardPins(projectId)).toEqual([]);
    await expect(riley.addBoardPin({ id: itemId, project_id: projectId }, cast.riley.id, { x: 1, y: 1 }, 'leak')).rejects.toThrow();
    await expect(riley.removeBoardPin(a.id)).rejects.toThrow();
    await expect(riley.updateBoardPin(a.id, { text: 'hijack' })).rejects.toThrow();
    expect((await sam.listMoodBoardPins(projectId)).find((p) => p.id === a.id)?.text).toBe('Warmer light here');

    await expect(sam.addBoardPin({ id: itemId, project_id: projectId }, cast.sam.id, { x: 1, y: 1 }, '   ')).rejects.toThrow();
    const bad = await cast.sam.client.from('mood_board_pins').insert({ item_id: itemId, project_id: projectId, x: 120, y: 5, text: 'off the card', created_by: cast.sam.id });
    expect(bad.error).not.toBeNull();
    await sam.removeBoardPin(a.id);
    expect((await sam.listMoodBoardPins(projectId)).some((p) => p.id === a.id)).toBe(false);
  });

  it('a collaborator can edit someone else\'s pin, but the authorship never moves', async () => {
    const sam = createStudioApi(cast.sam.client);
    const a = await sam.addBoardPin({ id: itemId, project_id: projectId }, cast.sam.id, { x: 40, y: 40 }, 'Sam wrote this');
    // Jordan edits the text and tries to take the authorship (or hand it to someone else).
    await cast.jordan.client.from('mood_board_pins').update({ text: 'Jordan edited this', created_by: cast.jordan.id }).eq('id', a.id);
    const after = await cast.sam.client.from('mood_board_pins').select('text, created_by').eq('id', a.id).single();
    expect(after.data?.created_by).toBe(cast.sam.id);
    await sam.removeBoardPin(a.id);
  });

  it('pins die with their card and ride on the share link, oldest first', async () => {
    const sam = createStudioApi(cast.sam.client);
    const share = await sam.shareBoard({ id: boardId, project_id: projectId }, cast.sam.id);
    const p1 = await sam.addBoardPin({ id: itemId, project_id: projectId }, cast.sam.id, { x: 10, y: 10 }, 'First');
    const p2 = await sam.addBoardPin({ id: itemId, project_id: projectId }, cast.sam.id, { x: 90, y: 90 }, 'Second');
    const shared = await createStudioApi(anonClient()).getSharedBoard(share.token);
    const card = shared?.items.find((i) => i.id === itemId);
    expect(card?.pins?.map((p) => p.text)).toEqual(['First', 'Second']);
    // The table itself stays closed to the public: the link reads pins only through get_shared_board.
    const direct = await anonClient().from('mood_board_pins').select('id');
    expect(direct.data ?? []).toEqual([]);
    await sam.removeBoardItem(itemId);
    const left = (await sam.listMoodBoardPins(projectId)).filter((p) => [p1.id, p2.id].includes(p.id));
    expect(left).toEqual([]);
    await sam.closeBoardShare(boardId);
  });
});

describe('an expiring share link', () => {
  const day = 86_400_000;

  it('works before it expires, returns nothing like an unknown link after, and is revived by moving the date', async () => {
    const sam = createStudioApi(cast.sam.client);
    const share = await sam.shareBoard({ id: boardId, project_id: projectId }, cast.sam.id, new Date(Date.now() + day).toISOString());
    expect((await createStudioApi(anonClient()).getSharedBoard(share.token))?.name).toBe('Look');

    await sam.setBoardShareExpiry(boardId, new Date(Date.now() - 1000).toISOString());
    expect(await createStudioApi(anonClient()).getSharedBoard(share.token)).toBeNull();
    expect(await createStudioApi(anonClient()).getSharedBoard('nope')).toBeNull();

    const cleared = await sam.setBoardShareExpiry(boardId, null);
    expect(cleared.expires_at).toBeNull();
    expect((await createStudioApi(anonClient()).getSharedBoard(share.token))?.name).toBe('Look');
    await sam.closeBoardShare(boardId);
  });

  it('only people who shape the project set it; a viewer and an outsider cannot, and no other column of the row can change', async () => {
    const sam = createStudioApi(cast.sam.client);
    const share = await sam.shareBoard({ id: boardId, project_id: projectId }, cast.sam.id);
    await expect(createStudioApi(cast.riley.client).setBoardShareExpiry(boardId, new Date(Date.now() + day).toISOString())).rejects.toThrow();
    await setCrewRole('viewer');
    await expect(createStudioApi(cast.jordan.client).setBoardShareExpiry(boardId, new Date(Date.now() + day).toISOString())).rejects.toThrow();
    await setCrewRole('contributor');
    await expect(createStudioApi(cast.jordan.client).setBoardShareExpiry(boardId, new Date(Date.now() + day).toISOString())).resolves.toBeTruthy();
    // Only expires_at is writable: the token cannot be rewritten.
    const swap = await cast.sam.client.from('mood_board_shares').update({ token: 'x'.repeat(40) }).eq('board_id', boardId);
    expect(swap.error).not.toBeNull();
    expect((await sam.getBoardShare(boardId))?.token).toBe(share.token);
    await sam.closeBoardShare(boardId);
  });

  it('images on an expired link stop loading for the link', async () => {
    const sam = createStudioApi(cast.sam.client);
    const mediaId = crypto.randomUUID();
    const path = `${projectId}/${mediaId}/exp.png`;
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    expect((await cast.sam.client.storage.from('project-media').upload(path, png, { contentType: 'image/png' })).error).toBeNull();
    await cast.sam.client.from('media').insert({ id: mediaId, project_id: projectId, kind: 'image', title: 'Exp', storage_path: path, mime_type: 'image/png', size_bytes: 8, created_by: cast.sam.id });
    await cast.sam.client.from('mood_board_items').insert({ board_id: boardId, project_id: projectId, media_id: mediaId, x: 5, y: 5, w: 24, z: 0, created_by: cast.sam.id });
    await sam.shareBoard({ id: boardId, project_id: projectId }, cast.sam.id, new Date(Date.now() + day).toISOString());
    const live = await anonClient().storage.from('project-media').createSignedUrls([path], 60);
    expect(live.data?.[0]?.signedUrl).toBeTruthy();
    await sam.setBoardShareExpiry(boardId, new Date(Date.now() - 1000).toISOString());
    const dead = await anonClient().storage.from('project-media').createSignedUrls([path], 60);
    expect(dead.data?.[0]?.signedUrl ?? null).toBeNull();
    await sam.closeBoardShare(boardId);
    await cast.sam.client.storage.from('project-media').remove([path]);
  });
});
