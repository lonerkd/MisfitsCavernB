import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// A mood board's share link: anyone holding the exact link reads that one board and the images on it, nothing else.
// Only people who shape the project (owner, leads, contributors) make or close a link. Sam owns, Jordan is a
// contributor, Riley is outside.
let cast: Cast;
let projectId: string;
let boardId: string;
let otherBoardId: string;
let mediaPath: string;
let otherMediaPath: string;
let secretNote: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Board links'));
  const sam = createStudioApi(cast.sam.client);
  const boardMediaId = randomUUID();
  const otherMediaId = randomUUID();
  mediaPath = `${projectId}/${boardMediaId}/board.png`;
  otherMediaPath = `${projectId}/${otherMediaId}/library-only.png`;
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  for (const path of [mediaPath, otherMediaPath]) {
    const up = await cast.sam.client.storage.from('project-media').upload(path, png, { contentType: 'image/png' });
    expect(up.error).toBeNull();
  }
  const onBoard = (await cast.sam.client.from('media').insert({ id: boardMediaId, project_id: projectId, kind: 'image', title: 'On the board', storage_path: mediaPath, mime_type: 'image/png', size_bytes: 8, created_by: cast.sam.id }).select('id').single()).data!;
  await cast.sam.client.from('media').insert({ id: otherMediaId, project_id: projectId, kind: 'image', title: 'Library only', storage_path: otherMediaPath, mime_type: 'image/png', size_bytes: 8, created_by: cast.sam.id });
  boardId = (await sam.createMoodBoard(projectId, cast.sam.id, 'Shared look', 'free')).board.id;
  otherBoardId = (await sam.createMoodBoard(projectId, cast.sam.id, 'Private board', 'free')).board.id;
  secretNote = 'Private note on another board';
  await cast.sam.client.from('mood_board_items').insert([
    { board_id: boardId, project_id: projectId, media_id: onBoard.id, x: 10, y: 10, w: 30, z: 0, created_by: cast.sam.id },
    { board_id: boardId, project_id: projectId, note: 'Wet hair, always', x: 50, y: 20, w: 24, z: 1, created_by: cast.sam.id },
    { board_id: otherBoardId, project_id: projectId, note: secretNote, x: 5, y: 5, w: 24, z: 0, created_by: cast.sam.id },
  ]);
});
afterAll(async () => {
  await cast?.sam.client.storage.from('project-media').remove([mediaPath, otherMediaPath]);
  await destroyCast(cast);
});

const anonApi = () => createStudioApi(anonClient());

describe('the link', () => {
  it('only people who shape the project can make, see or close it', async () => {
    const sam = createStudioApi(cast.sam.client);
    const jordan = createStudioApi(cast.jordan.client);
    const riley = createStudioApi(cast.riley.client);
    // An outsider can neither make nor see a link.
    await expect(riley.shareBoard({ id: boardId, project_id: projectId }, cast.riley.id)).rejects.toThrow();
    const share = await sam.shareBoard({ id: boardId, project_id: projectId }, cast.sam.id);
    expect(share.token.length).toBeGreaterThanOrEqual(32);
    expect(await riley.getBoardShare(boardId)).toBeNull();
    await riley.closeBoardShare(boardId); // no row visible to them: it deletes nothing
    // Crew who shape the project (a contributor, as for a script's link) see the same link.
    expect((await jordan.getBoardShare(boardId))?.token).toBe(share.token);
    expect((await sam.getBoardShare(boardId))?.token).toBe(share.token);
  });

  it('opens the one board for anyone holding the exact link, and nothing else of the project', async () => {
    const sam = createStudioApi(cast.sam.client);
    const token = (await sam.getBoardShare(boardId))!.token;
    const shared = await anonApi().getSharedBoard(token);
    expect(shared?.name).toBe('Shared look');
    expect(shared?.items.map((i) => i.note ?? i.media?.title)).toEqual(['On the board', 'Wet hair, always']);
    expect(JSON.stringify(shared)).not.toContain(secretNote);
    expect(JSON.stringify(shared)).not.toContain('Library only');
    expect(await anonApi().getSharedBoard('nope')).toBeNull();
    expect(await anonApi().getSharedBoard('')).toBeNull();
    // The tables themselves stay closed to the public.
    expect((await anonClient().from('mood_boards').select('id')).data ?? []).toEqual([]);
    expect((await anonClient().from('mood_board_shares').select('token')).data ?? []).toEqual([]);
  });

  it('lets the link load the images on the board, and only those', async () => {
    const sam = createStudioApi(cast.sam.client);
    const token = (await sam.getBoardShare(boardId))!.token;
    expect(token).toBeTruthy();
    const anon = anonClient();
    const signed = await anon.storage.from('project-media').createSignedUrls([mediaPath, otherMediaPath], 60);
    const byPath = new Map((signed.data ?? []).map((r) => [r.path, r]));
    expect(byPath.get(mediaPath)?.signedUrl).toBeTruthy();
    expect(byPath.get(otherMediaPath)?.signedUrl ?? null).toBeNull();
  });

  it('a new link kills the old one at once, and stopping closes the board and its images', async () => {
    const sam = createStudioApi(cast.sam.client);
    const old = (await sam.getBoardShare(boardId))!.token;
    const fresh = await sam.newBoardLink({ id: boardId, project_id: projectId }, cast.sam.id);
    expect(fresh.token).not.toBe(old);
    expect(await anonApi().getSharedBoard(old)).toBeNull();
    expect((await anonApi().getSharedBoard(fresh.token))?.name).toBe('Shared look');
    await sam.closeBoardShare(boardId);
    expect(await anonApi().getSharedBoard(fresh.token)).toBeNull();
    const signed = await anonClient().storage.from('project-media').createSignedUrls([mediaPath], 60);
    expect(signed.data?.[0]?.signedUrl ?? null).toBeNull();
  });
});
