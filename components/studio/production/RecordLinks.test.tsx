// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const upsert = vi.fn();
vi.mock('../StudioContext', () => ({ useStudio: () => ({ project: { id: 'p1', settings: null } }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/lib/supabase/productionRecords', () => ({
  listRecords: async () => [],
  upsertRecords: (...a: unknown[]) => upsert(...a),
  deleteRecords: async () => undefined,
  subscribeToRecords: () => () => {},
}));

const SCENES = [
  { id: 's12', scene_number: 12, heading: 'INT. KITCHEN - DAY', title: 'KITCHEN' },
  { id: 's14', scene_number: 14, heading: 'EXT. GARDEN - NIGHT', title: 'GARDEN' },
];
const CHARS = [{ id: 'c1', name: 'MAYA' }, { id: 'c2', name: 'ELI' }];
const sceneById = new Map(SCENES.map((s) => [s.id, s]));

vi.mock('@/lib/studio', () => ({
  useProjectScenes: () => ({ rows: SCENES }),
  useCharacters: () => ({ rows: CHARS }),
}));
import { CharacterLinkField, NotInSceneNote, SceneLinkField } from './RecordLinks';
import { CostumeView } from './CostumeView';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function Scene({ onChange }: { onChange: (v: { ids: string[]; text: string }) => void }) {
  const [v, setV] = useState<{ ids: string[]; text: string }>({ ids: [], text: '' });
  return <SceneLinkField scenes={SCENES} sceneById={sceneById} ids={v.ids} text={v.text} onChange={(n) => { setV(n); onChange(n); }} />;
}

describe('SceneLinkField', () => {
  it('links a scene chosen from the project, keeping its number as the label, and several can be linked', () => {
    const onChange = vi.fn();
    render(<Scene onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Scene: add a scene'), { target: { value: 's12' } });
    expect(onChange).toHaveBeenLastCalledWith({ ids: ['s12'], text: '12' });
    fireEvent.change(screen.getByLabelText('Scene: add a scene'), { target: { value: 's14' } });
    expect(onChange).toHaveBeenLastCalledWith({ ids: ['s12', 's14'], text: '12, 14' });
    // a linked scene is not offered twice
    expect(screen.queryByRole('option', { name: /^12 ·/ })).toBeNull();
  });

  it('unlinks a scene', () => {
    const onChange = vi.fn();
    render(<Scene onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Scene: add a scene'), { target: { value: 's12' } });
    fireEvent.click(screen.getByLabelText('Unlink scene 12'));
    expect(onChange).toHaveBeenLastCalledWith({ ids: [], text: '' });
  });

  it('a scene not written yet is a label with no link', () => {
    const onChange = vi.fn();
    render(<Scene onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Scene: add a scene'), { target: { value: '__other__' } });
    fireEvent.change(screen.getByLabelText('Scene (typed)'), { target: { value: '40 (reshoot)' } });
    expect(onChange).toHaveBeenLastCalledWith({ ids: [], text: '40 (reshoot)' });
  });
});

describe('CharacterLinkField', () => {
  it('links a character of the project and carries its name as the label', () => {
    const onChange = vi.fn();
    render(<CharacterLinkField characters={CHARS} id={null} text="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c2' } });
    expect(onChange).toHaveBeenCalledWith({ id: 'c2', text: 'ELI' });
  });

  it('a project with no characters yet falls back to typing a name', () => {
    const onChange = vi.fn();
    render(<CharacterLinkField characters={[]} id={null} text="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Lead actress' } });
    expect(onChange).toHaveBeenCalledWith({ id: null, text: 'Lead actress' });
  });
});

describe('a view saves its links', () => {
  it('Costumes saves the linked character and scenes as real links, and the labels with them', async () => {
    upsert.mockResolvedValue(undefined);
    render(<CostumeView />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Character' }), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText('Scene: add a scene'), { target: { value: 's12' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0][2]).toEqual([expect.objectContaining({ character: 'MAYA', character_id: 'c1', scene: '12', scene_ids: ['s12'] })]);
  });
});

describe('NotInSceneNote', () => {
  const cast: Record<string, string[]> = { s12: ['MAYA'], s14: ['ELI'] };
  const t = { sceneById, characterById: new Map(CHARS.map((c) => [c.id, c])), castFor: (id: string) => cast[id] ?? [] } as unknown as Parameters<typeof NotInSceneNote>[0]['t'];

  it('says so when a look is for a scene its character is not in', () => {
    render(<NotInSceneNote record={{ scene_ids: ['s12', 's14'], character_id: 'c1' }} t={t} />);
    expect(screen.getByRole('note').textContent).toMatch(/MAYA is not in scene 14/);
  });

  it('says nothing when the character is in every linked scene, or nothing is linked', () => {
    render(<NotInSceneNote record={{ scene_ids: ['s12'], character_id: 'c1' }} t={t} />);
    render(<NotInSceneNote record={{ character: 'Lead actress' }} t={t} />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
