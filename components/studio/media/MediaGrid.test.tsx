// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Media } from '@/lib/studio';

vi.mock('@/lib/studio', () => ({ useSignedUrls: () => ({}), mediaSrc: () => null }));
vi.mock('./MediaThumb', () => ({ MediaThumbVisual: () => null, kindLabel: () => 'Note' }));

import { MediaGrid } from './MediaGrid';

const item = (id: string, title: string, lifecycle: string) =>
  ({ id, title, kind: 'note', lifecycle, board: null, shared: false, storage_path: null }) as unknown as Media;

afterEach(() => { cleanup(); });

describe('MediaGrid archived badge', () => {
  const items = [item('a', 'Working', 'working'), item('b', 'Old take', 'archived')];

  it('marks archived cards only', () => {
    render(<MediaGrid items={items} onOpen={() => {}} />);
    expect(screen.getAllByText('Archived')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Old take/ }).textContent).toContain('Archived');
    expect(screen.getByRole('button', { name: /Working/ }).textContent).not.toContain('Archived');
  });

});
