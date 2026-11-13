// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({ mode: 'closed' as 'closed' | 'full' | 'mini', inPane: false }));
vi.mock('@/lib/cavern/CavernContext', () => ({ useCavern: () => ({ mode: state.mode, open: vi.fn(), minimise: vi.fn(), close: vi.fn() }) }));
vi.mock('@/lib/split/pane', () => ({ useInPane: () => state.inPane }));
vi.mock('next/dynamic', () => ({ default: () => ({ variant }: { variant: string }) => <div>cave: {variant}</div> }));
import CavernHost from './CavernHost';

afterEach(() => { cleanup(); state.mode = 'closed'; state.inPane = false; });

describe('CavernHost', () => {
  it('shows nothing while closed, and the cave in whichever place it is asked for', () => {
    const { rerender } = render(<CavernHost />);
    expect(screen.queryByText(/cave:/)).toBeNull();
    state.mode = 'full'; rerender(<CavernHost />);
    expect(screen.getByText('cave: full')).toBeTruthy();
    state.mode = 'mini'; rerender(<CavernHost />);
    expect(screen.getByText('cave: mini')).toBeTruthy();
  });
  it('does not draw a second cave inside a split-screen pane', () => {
    state.mode = 'full'; state.inPane = true;
    render(<CavernHost />);
    expect(screen.queryByText(/cave:/)).toBeNull();
  });
});
