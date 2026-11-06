import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// Mood boards: boards as objects, each an arrangement of library items and note cards.
// Sam owns, Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;
let otherProjectId: string;
let mediaId: string;
let otherMediaId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Boards'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Another film'));
  mediaId = (await cast.sam.client.from('media').insert({ project_id: projectId, kind: 'link', title: 'Ref', external_url: 'https://example.com/a', created_by: cast.sam.id }).select('id').single()).data!.id;
  otherMediaId = (await cast.sam.client.from('media').insert({ project_id: otherProjectId, kind: 'link', title: 'Elsewhere', external_url: 'https://example.com/b', created_by: cast.sam.id }).select('id').single()).data!.id;
});
afterAll(async () => { await destroyCast(cast); });

describe('boards', () => {
  it('a template starts a board with its note cards; a free board starts empty', async () => {
    const api = createStudioApi(cast.sam.client);
    const tone = await api.createMoodBoard(projectId, cast.sam.id, 'Tone', 'tone');
    expect(tone.items.map((i) => i.note)).toEqual(['The feeling', 'Pace & rhythm', 'Texture']);
    const free = await api.createMoodBoard(projectId, cast.sam.id, 'Scratch');
    expect(free.items).toEqual([]);
  });

  it('crew arrange the board: add library items and notes, move, edit, remove', async () => {
    const sam = createStudioApi(cast.sam.client);
    const jordan = createStudioApi(cast.jordan.client);
    const { board } = await sam.createMoodBoard(projectId, cast.sam.id, 'Crew board');
    const [item] = await jordan.addBoardMedia(board, cast.jordan.id, [mediaId], []);
    expect(item).toMatchObject({ media_id: mediaId, board_id: board.id });
    const note = await jordan.addBoardNote(board, cast.jordan.id, 'More rain', [item]);
    expect(`${note.x},${note.y}`).not.toBe(`${item.x},${item.y}`);
    expect((await jordan.updateBoardItem(item.id, { x: 50, y: 40 })).x).toBe(50);
    expect((await jordan.updateBoardItem(note.id, { note: 'Much more rain' })).note).toBe('Much more rain');
    await jordan.removeBoardItem(note.id);
    expect((await sam.listMoodBoardItems(projectId)).filter((i) => i.board_id === board.id)).toHaveLength(1);
  });

  it('an outsider sees no boards and cannot make or change any', async () => {
    const riley = createStudioApi(cast.riley.client);
    expect(await riley.listMoodBoards(projectId)).toEqual([]);
    expect(await riley.listMoodBoardItems(projectId)).toEqual([]);
    await expect(riley.createMoodBoard(projectId, cast.riley.id, 'Sneaky')).rejects.toThrow();
    const sam = createStudioApi(cast.sam.client);
    const { board } = await sam.createMoodBoard(projectId, cast.sam.id, 'Private');
    await riley.deleteMoodBoard(board.id).catch(() => undefined);
    expect((await sam.listMoodBoards(projectId)).some((b) => b.id === board.id)).toBe(true);
    await expect(riley.addBoardNote(board, cast.riley.id, 'hi', [])).rejects.toThrow();
  });

  it('a board only holds media from its own project, and an item is a library item or a note, not both or neither', async () => {
    const sam = createStudioApi(cast.sam.client);
    const { board } = await sam.createMoodBoard(projectId, cast.sam.id, 'Strict');
    await expect(sam.addBoardMedia(board, cast.sam.id, [otherMediaId], [])).rejects.toThrow();
    const both = await cast.sam.client.from('mood_board_items').insert({ board_id: board.id, project_id: projectId, media_id: mediaId, note: 'x', created_by: cast.sam.id });
    expect(both.error).not.toBeNull();
    const neither = await cast.sam.client.from('mood_board_items').insert({ board_id: board.id, project_id: projectId, created_by: cast.sam.id });
    expect(neither.error).not.toBeNull();
    const off = await cast.sam.client.from('mood_board_items').insert({ board_id: board.id, project_id: projectId, note: 'x', x: 120, created_by: cast.sam.id });
    expect(off.error).not.toBeNull();
  });

  it('validates names and deleting a board or its media takes the cards with it', async () => {
    const sam = createStudioApi(cast.sam.client);
    await expect(sam.createMoodBoard(projectId, cast.sam.id, '   ')).rejects.toThrow(/name/);
    const { board } = await sam.createMoodBoard(projectId, cast.sam.id, 'Gone soon');
    const [item] = await sam.addBoardMedia(board, cast.sam.id, [mediaId], []);
    await cast.sam.client.from('media').delete().eq('id', mediaId);
    expect((await sam.listMoodBoardItems(projectId)).some((i) => i.id === item.id)).toBe(false);
    await sam.deleteMoodBoard(board.id);
    expect((await sam.listMoodBoards(projectId)).some((b) => b.id === board.id)).toBe(false);
  });
});
