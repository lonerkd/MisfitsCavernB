// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { buildBoard, dayOutOfDays } from '@/lib/studio/stripboard';
import { DoodTable } from './DoodTable';

afterEach(cleanup);

// Scenes by shoot day; the cast comes from the film graph (a function), exactly as the Stripboard and the Production tab pass it.
const scene = (n: number, day: number) => ({ id: `s${n}`, scene_number: n, shoot_day: day, est_duration: null, status: 'planned', heading: `INT. PLACE ${n} - DAY` }) as never;
const cast = (s: { id: string }) => ({ s1: ['MAYA'], s2: ['ELI'], s3: ['MAYA'] } as Record<string, string[]>)[s.id] ?? [];

describe('DoodTable', () => {
  it('shows Start, Hold and Finish from the shared engine, and only the codes that engine produces', () => {
    const board = buildBoard([scene(1, 1), scene(2, 2), scene(3, 3)], 64, cast as never, () => 'x');
    render(<DoodTable board={board} dood={dayOutOfDays(board)} />);
    const maya = screen.getByText('MAYA').closest('tr')!;
    expect([...maya.querySelectorAll('td')].map((td) => td.textContent)).toEqual(['S', 'H', 'F', '2']);
    // The old Production-tab view promised "T travel" and "R" and never computed them.
    expect(screen.queryByText(/travel/i)).toBeNull();
  });

  it('no cast says where cast comes from', () => {
    render(<DoodTable board={[]} dood={[]} />);
    expect(screen.getByText(/no cast yet/i)).toBeTruthy();
  });
});
