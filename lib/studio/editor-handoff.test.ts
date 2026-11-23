import { describe, it, expect } from 'vitest';
import { editorialRecipients, handoffMessage } from './editor-handoff';
import { editorPackage } from './editor-package';

const crafts = [{ name: 'Editor', department: 'Editorial' }, { name: 'Colourist', department: 'Editorial' }, { name: 'Gaffer', department: 'Lighting & grip' }];
const crew = [
  { user_id: 'e', username: 'Eli', craft: 'Editor', status: 'confirmed' },
  { user_id: 'c', username: 'Cleo', craft: 'Colourist', status: 'confirmed' },
  { user_id: 'p', username: 'Pat', craft: 'Editor', status: 'invited' },
  { user_id: 'g', username: 'Gus', craft: 'Gaffer', status: 'confirmed' },
  { user_id: 'me', username: 'Me', craft: 'Editor', status: 'confirmed' },
  { user_id: 'e', username: 'Eli', craft: 'Editor', status: 'confirmed' },
];

describe('editorialRecipients', () => {
  it('names only confirmed editorial crew, once each, never the sender', () => {
    expect(editorialRecipients(crew, crafts, 'me').map((r) => r.user_id)).toEqual(['c', 'e']);
  });
  it('is empty when nobody in the department is confirmed', () => {
    expect(editorialRecipients(crew.filter((c) => c.craft === 'Gaffer'), crafts)).toEqual([]);
  });
});

describe('handoffMessage', () => {
  const base = { scenes: [{ id: 's1', scene_number: 1 }], shots: [{ id: 'a', scene_id: 's1', shot_number: '1A' }], camera: [], sound: [], offloads: [{ card: 'A1', status: 'verified' }] };
  it('says ready when it is', () => {
    const p = editorPackage({ ...base, takes: [{ id: '1', take: '1', circle: true, shot_id: 'a', scene_ids: ['s1'] }], sound: [{ scene_ids: ['s1'], roomTone: 'yes' }] } as never);
    const m = handoffMessage(p, 'Night Shift', 'Sam');
    expect(m.title).toBe('Sam: Footage package for Night Shift');
    expect(m.body).toContain('1 scene shot, 1 of 1 shot with a selected take, 1 card verified.');
  });
  it('lists what is not usable yet', () => {
    const p = editorPackage({ ...base, takes: [{ id: '1', take: '1', circle: false, shot_id: 'a', scene_ids: ['s1'] }] } as never);
    expect(p.ready).toBe(false);
    expect(handoffMessage(p, 'X').body).toContain('Not usable yet:');
  });
});
