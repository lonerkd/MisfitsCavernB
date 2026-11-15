import { describe, it, expect } from 'vitest';
import { changeImpact, changeMessage, type ImpactInput } from './change-impact';

const base = (extra: Partial<ImpactInput> = {}): ImpactInput => ({
  sceneIds: ['s1'],
  scenes: [{ id: 's1', scene_number: 4, shoot_day: 2 }, { id: 's2', scene_number: 5, shoot_day: null }],
  categories: [{ id: 'c-prop', key: 'props', label: 'Props' }, { id: 'c-ward', key: 'wardrobe', label: 'Wardrobe' }, { id: 'c-other', key: 'custom', label: 'Custom' }],
  elements: [
    { id: 'e1', name: 'Brass lantern', category_id: 'c-prop', assigned_to: 'u-prop' }, { id: 'e2', name: 'Trench coat', category_id: 'c-ward' },
    { id: 'e3', name: 'Mystery', category_id: 'c-other' }, { id: 'e4', name: 'Other scene prop', category_id: 'c-prop' },
  ],
  tags: [{ scene_id: 's1', element_id: 'e1' }, { scene_id: 's1', element_id: 'e2' }, { scene_id: 's1', element_id: 'e3' }, { scene_id: 's2', element_id: 'e4' }],
  records: [{ kind: 'costumes', scene_ids: ['s1'] }, { kind: 'costumes', scene_ids: ['s1', 's2'] }, { kind: 'soundReports', scene_ids: ['s2'] }, { kind: 'safety', scene_ids: ['s1'] }],
  shots: [{ scene_id: 's1' }, { scene_id: 's1' }, { scene_id: 's2' }],
  crew: [
    { user_id: 'u-dir', username: 'dana', craft: 'Director', status: 'confirmed' },
    { user_id: 'u-cos', username: 'cole', craft: 'Costume designer', status: 'confirmed' },
    { user_id: 'u-prop', username: 'pia', craft: 'Prop master', status: 'confirmed' },
    { user_id: 'u-dp', username: 'dev', craft: 'Director of photography', status: 'confirmed' },
    { user_id: 'u-pend', username: 'pat', craft: 'Costume designer', status: 'pending' },
    { user_id: 'u-sound', username: 'sam', craft: 'Boom operator', status: 'confirmed' },
  ],
  crafts: [
    { name: 'Director', department: 'Direction' }, { name: 'Costume designer', department: 'Wardrobe, hair & makeup' }, { name: 'Prop master', department: 'Art' },
    { name: 'Director of photography', department: 'Camera' }, { name: 'Boom operator', department: 'Sound' },
  ],
  senderId: 'u-dir',
  ...extra,
});

describe('changeImpact', () => {
  it('names a department only when something real links it to the scene, with the reasons', () => {
    const { departments } = changeImpact(base());
    expect(departments.map((d) => d.department)).toEqual(['Art', 'Camera', 'Direction', 'Production', 'Wardrobe, hair & makeup']);
    const art = departments.find((d) => d.department === 'Art')!;
    expect(art.why).toEqual(['1 breakdown element (props): Brass lantern']);
    const ward = departments.find((d) => d.department === 'Wardrobe, hair & makeup')!;
    expect(ward.why).toEqual(['1 breakdown element (wardrobe): Trench coat', '2 records in Costumes']);
    expect(departments.find((d) => d.department === 'Camera')!.why).toEqual(['2 planned shots']);
    expect(departments.find((d) => d.department === 'Production')!.why).toEqual(['scheduled on day 2']);
    // Sound has a record, but on another scene; an unknown category and a tool that is not a department add nothing.
    expect(departments.some((d) => d.department === 'Sound')).toBe(false);
  });

  it('tells confirmed crew in those departments, never the sender, never a pending invitee, and the person an element is assigned to', () => {
    const { recipients } = changeImpact(base());
    expect(recipients.map((r) => r.user_id).sort()).toEqual(['u-cos', 'u-dp', 'u-prop']);
    expect(recipients.find((r) => r.user_id === 'u-prop')!.why).toEqual(expect.arrayContaining(['Brass lantern is assigned to you', 'Art: 1 breakdown element (props): Brass lantern']));
    expect(recipients.find((r) => r.user_id === 'u-cos')!.why).toHaveLength(2);
  });

  it('tells an assigned person even when the sender is also in the department, and skips an element assigned to the sender', () => {
    const out = changeImpact(base({ elements: [{ id: 'e1', name: 'Brass lantern', category_id: 'c-prop', assigned_to: 'u-dir' }, { id: 'e2', name: 'Trench coat', category_id: 'c-ward' }] }));
    expect(out.recipients.some((r) => r.user_id === 'u-dir')).toBe(false);
  });

  it('lists a department with no one in it yet, and finds nothing for a scene nothing links to', () => {
    const none = changeImpact(base({ crew: [] }));
    expect(none.departments.find((d) => d.department === 'Art')!.people).toEqual([]);
    expect(none.recipients).toEqual([]);
    // An element assigned to someone who is not confirmed crew tells no one.
    expect(none.recipients.some((r) => r.user_id === 'u-prop')).toBe(false);
    const nothing = changeImpact(base({ sceneIds: ['s9'] }));
    expect(nothing.departments).toEqual([]);
  });
});

describe('changeImpact: the owner', () => {
  it('tells the owner of an element assigned to them, though the owner is not in the crew list', () => {
    const out = changeImpact(base({ ownerId: 'u-owner', elements: [{ id: 'e1', name: 'Brass lantern', category_id: 'c-prop', assigned_to: 'u-owner' }], crew: [{ user_id: 'u-dir', username: 'dana', craft: 'Director', status: 'confirmed' }] }));
    expect(out.recipients).toEqual([{ user_id: 'u-owner', name: 'The owner', craft: null, why: ['Brass lantern is assigned to you'] }]);
  });
});

describe('changeMessage', () => {
  it('says who, which scene, what changed and what it means for the person', () => {
    const m = changeMessage({ title: 'Move the kitchen to night', notes: 'Practical lamps only.', sceneNumbers: '4', why: ['Art: 1 breakdown element (props): Brass lantern'], by: 'dana' });
    expect(m.title).toBe('dana: Change (scene 4): Move the kitchen to night');
    expect(m.body).toContain('Practical lamps only.');
    expect(m.body).toContain('For you: Art: 1 breakdown element');
  });
  it('is short enough to read: a long title and note are cut', () => {
    const m = changeMessage({ title: 'x'.repeat(400), notes: 'y'.repeat(900), sceneNumbers: '', why: ['a'] });
    expect(m.title.length).toBeLessThanOrEqual(140);
    expect(m.body.length).toBeLessThanOrEqual(600);
  });
});
