// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useSlowWhile } from './useSlowWhile';

function Probe({ active }: { active: boolean }) {
  return <div>{useSlowWhile(active, 1000) ? 'slow' : 'fast'}</div>;
}
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useSlowWhile', () => {
  it('turns true only after the wait has lasted, and false when it ends', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Probe active />);
    expect(screen.getByText('fast')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1100); });
    expect(screen.getByText('slow')).toBeTruthy();
    rerender(<Probe active={false} />);
    expect(screen.getByText('fast')).toBeTruthy();
  });
  it('never turns true when the wait ends first', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Probe active />);
    act(() => { vi.advanceTimersByTime(500); });
    rerender(<Probe active={false} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText('fast')).toBeTruthy();
  });
});
