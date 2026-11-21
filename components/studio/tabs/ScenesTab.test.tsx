// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// The capability the signed-in person holds on the project, and the breakdown the tab reads through useBreakdown.
let held: string[] = [];
const useBreakdownCalls: Array<string | null> = [];
type Rows = { rows: unknown[] };
let breakdown: { status: 'ready' | 'loading' | 'error'; categories: Rows; elements: Rows; tags: Rows };
const live = (rows: unknown[]): Rows => ({ rows });

vi.mock('@/lib/roles/capabilities', () => ({
  useMyCapabilities: () => ({ loading: false, caps: new Set(held), can: (k: string) => held.includes(k) }),
}));
vi.mock('@/lib/breakdown', () => ({
  useBreakdown: (projectId: string | null) => {
    useBreakdownCalls.push(projectId);
    return breakdown;
  },
}));
vi.mock('@/components/studio/StudioContext', () => ({
  useStudio: () => ({
    project: { id: 'p1', accent_color: null },
    userId: 'u1',
    scripts: [{ id: 'sc1', title: 'Script' }],
    scriptsStatus: 'ready',
    scriptId: 'sc1',
    setScriptId: () => {},
    scenes: {
      status: 'ready',
      error: null,
      rows: [
        { id: 's1', scene_number: 1, heading: 'INT. HALL - DAY', title: null, time_of_day: null, est_duration: null, color: null, note: null, shoot_day: 1, ordinal: 0 },
        { id: 's2', scene_number: 2, heading: 'EXT. YARD - NIGHT', title: null, time_of_day: null, est_duration: null, color: null, note: null, shoot_day: 1, ordinal: 1 },
      ],
      upsertLocal: () => {},
      reload: async () => {},
    },
    sceneSync: { state: 'synced', error: null, run: async () => {} },
    media: { rows: [] },
    mediaById: new Map(),
    mediaByScene: new Map(),
    links: { upsertLocal: () => {}, removeLocal: () => {} },
    followScene: null,
    openInScript: () => {},
    postNotes: { rows: [] },
    castOf: () => [],
    doubtfulSceneOrdinals: new Set(),
    shots: { rows: [] },
  }),
}));
vi.mock('@/lib/studio', () => ({
  studio: { listShotNotes: async () => [], updateScene: async () => ({}), linkMedia: async () => ({}), unlinkMedia: async () => {} },
  useSignedUrls: () => ({}),
  mediaSrc: () => '',
}));
vi.mock('@/components/studio/toolFind', () => ({ useRecordFind: (rows: unknown[]) => ({ shown: rows }) }));
vi.mock('@/components/studio/TabHeader', () => ({ TabHeader: ({ title }: { title: string }) => <h2>{title}</h2> }));
vi.mock('@/components/studio/media/MediaThumb', () => ({ MediaThumbVisual: () => null }));
vi.mock('@/components/studio/media/MediaDetail', () => ({ MediaDetail: () => null }));
vi.mock('@/components/studio/media/MediaPicker', () => ({ MediaPicker: () => null }));
vi.mock('@/components/studio/shots/ShotDesigner', () => ({ ShotDesigner: () => null }));
vi.mock('@/components/studio/ScenePassport', () => ({ ScenePassport: () => null }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: () => {} }) }));
vi.mock('@/lib/os/undo', () => ({ pushUndo: () => {}, undoOrigin: () => null }));

import { ScenesTab } from './ScenesTab';

// Hall: a $1,000 prop entered, a $50 wardrobe item on its category default, and one element with no price anywhere.
// Yard: nothing tagged.
const CATEGORIES = [
  { id: 'c1', unit_cost: 50, position: 0, key: 'props', label: 'Props' },
  { id: 'c2', unit_cost: 0, position: 1, key: 'wardrobe', label: 'Wardrobe' },
];
const ELEMENTS = [
  { id: 'e1', category_id: 'c1', name: 'Lamp', cost: '1000' },
  { id: 'e2', category_id: 'c1', name: 'Sconce', cost: null },
  { id: 'e3', category_id: 'c2', name: 'Cape', cost: null },
];
const TAGS = [
  { scene_id: 's1', element_id: 'e1' },
  { scene_id: 's1', element_id: 'e2' },
  { scene_id: 's1', element_id: 'e3' },
];

afterEach(() => {
  cleanup();
  held = [];
  useBreakdownCalls.length = 0;
});

describe('ScenesTab cost on the scene cards', () => {
  it('shows each scene cost, with what it rests on, to someone who can read the budget', () => {
    held = ['budget.read'];
    breakdown = { status: 'ready', categories: live(CATEGORIES), elements: live(ELEMENTS), tags: live(TAGS) };
    render(<ScenesTab />);

    // The hall: $1,000 entered + $50 default + nothing for the unpriced cape = $1,050.
    expect(screen.getByText('Cost $1,050')).toBeTruthy();
    expect(screen.getByTitle('$50 is a default estimate · 1 element with no price')).toBeTruthy();
    // The yard has nothing tagged in the breakdown.
    expect(screen.getByText('Cost —')).toBeTruthy();
    expect(screen.getByTitle('nothing tagged')).toBeTruthy();
    // One breakdown read for the tab, for the project.
    expect(useBreakdownCalls.every((id) => id === 'p1')).toBe(true);
  });

  it('shows no cost, and reads no breakdown, for crew without budget.read', () => {
    held = ['scenes.read'];
    breakdown = { status: 'ready', categories: live(CATEGORIES), elements: live(ELEMENTS), tags: live(TAGS) };
    render(<ScenesTab />);

    expect(screen.getByText('INT. HALL - DAY')).toBeTruthy();
    expect(screen.queryByText(/^Cost/)).toBeNull();
    expect(screen.queryByTitle(/default estimate|no price|nothing tagged/)).toBeNull();
    // The breakdown is never asked for on this screen (a null project id keeps it idle).
    expect(useBreakdownCalls.length).toBeGreaterThan(0);
    expect(useBreakdownCalls.every((id) => id === null)).toBe(true);
  });

  it('shows no cost while the breakdown is still loading or has failed, rather than a wrong figure', () => {
    held = ['budget.read'];
    breakdown = { status: 'loading', categories: live([]), elements: live([]), tags: live([]) };
    const { unmount } = render(<ScenesTab />);
    expect(screen.queryByText(/^Cost/)).toBeNull();
    unmount();

    breakdown = { status: 'error', categories: live([]), elements: live([]), tags: live([]) };
    render(<ScenesTab />);
    expect(screen.queryByText(/^Cost/)).toBeNull();
  });
});
