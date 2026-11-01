// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Activity } from '@/lib/island/activities';
import { ACTIVITY_TONE_COLOR, ActivityControls, ActivityLabel } from './IslandActivity';

afterEach(cleanup);

const activity = (over: Partial<Activity> = {}): Activity => ({ id: 'q', kind: 'sync', title: '2 scripts waiting to sync', ...over });

describe('ActivityLabel', () => {
  it('shows the title and the detail', () => {
    render(<ActivityLabel activity={activity({ detail: 'Retry in 12 s' })} />);
    expect(screen.getByText('2 scripts waiting to sync')).toBeTruthy();
    expect(screen.getByText('Retry in 12 s')).toBeTruthy();
  });

  it('is a live region, so a change in what is waiting is announced…', () => {
    render(<ActivityLabel activity={activity()} />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('…but a ticking timer is not, or a screen reader would read out every second', () => {
    render(<ActivityLabel activity={activity({ kind: 'timer', title: 'Sprint 12:34' })} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('draws a progress bar only when the work knows how far along it is', () => {
    const { rerender } = render(<ActivityLabel activity={activity()} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    rerender(<ActivityLabel activity={activity({ progress: 0.426 })} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('43');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('43%');
  });
});

describe('ActivityControls', () => {
  it('has no buttons, and takes no room, when there is nothing to press', () => {
    const { container } = render(<ActivityControls activity={activity()} count={1} onCycle={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the activity\'s own buttons and runs them', () => {
    const run = vi.fn();
    render(<ActivityControls activity={activity({ controls: [{ id: 'go', label: 'Sync now', run }] })} count={1} onCycle={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('offers "+N" to show the next when several are running, and says what it does', () => {
    const onCycle = vi.fn();
    render(<ActivityControls activity={activity()} count={3} onCycle={onCycle} />);
    const more = screen.getByRole('button', { name: '2 more running — show the next' });
    expect(more.textContent).toBe('+2');
    fireEvent.click(more);
    expect(onCycle).toHaveBeenCalledTimes(1);
  });
});

describe('ACTIVITY_TONE_COLOR', () => {
  it('has a colour for every tone', () => {
    expect(Object.keys(ACTIVITY_TONE_COLOR).sort()).toEqual(['busy', 'error', 'info', 'warn']);
  });
});
