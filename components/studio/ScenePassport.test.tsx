// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

let records: Map<string, Array<{ kind: string; label: string; count: number }>> = new Map();
vi.mock('@/components/studio/StudioContext', () => ({
  useStudio: () => ({
    scenes: { rows: [{ id: 's1', scene_number: 12, ordinal: 0, shoot_day: null }] },
    mediaByScene: new Map(),
    shots: { rows: [] },
    project: { budget_items: [] },
    doubtfulSceneOrdinals: new Set(),
    recordsByScene: records,
  }),
}));
import { ScenePassport } from './ScenePassport';

afterEach(() => { cleanup(); records = new Map(); });

describe('ScenePassport records', () => {
  it('counts the role-tool records linked to the scene, and says which tools in its tooltip', () => {
    records = new Map([['s1', [{ kind: 'cameraReports', label: 'Camera reports', count: 2 }, { kind: 'makeup', label: 'Makeup', count: 1 }]]]);
    render(<ScenePassport sceneId="s1" compact />);
    const chip = screen.getByTitle('2 camera reports, 1 makeup');
    expect(chip.textContent).toContain('3');
  });

  it('shows no Records chip for a scene nothing links to', () => {
    render(<ScenePassport sceneId="s1" compact />);
    expect(screen.queryByTitle('Records')).toBeNull();
    expect(screen.getByTitle('Refs')).toBeTruthy();
  });
});
