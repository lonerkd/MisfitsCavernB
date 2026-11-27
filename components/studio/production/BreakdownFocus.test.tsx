// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BreakdownFocus as Focus } from '@/lib/studio/breakdown-focus';
import { BreakdownFocus } from './BreakdownFocus';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const focus: Focus = {
  state: 'blocked',
  headline: '2 things blocking Pre-Production',
  context: 'Pre-Production · 2 of 5',
  blockers: 2,
  more: 0,
  items: [
    {
      id: 'casting-complete', kind: 'blocker', title: 'Cast every role in the film',
      detail: '0 of 2 characters in a scene cast.',
      to: { place: { kind: 'studio', tab: 'production', view: 'crew' } }, actionLabel: 'Open Cast & crew',
    },
    {
      id: 'elements', kind: 'blocker', title: '3 elements not ready',
      detail: '2 still needed, 1 being sourced, 0 ready.',
      to: { action: 'needed' }, actionLabel: 'Show what is missing',
    },
  ],
};

describe('BreakdownFocus rows', () => {
  it('one line per item: kind, title and the fix — the numbers stay behind a tap', () => {
    render(<BreakdownFocus focus={focus} projectId="p1" onAction={() => {}} />);
    expect(screen.getByText('Cast every role in the film')).toBeTruthy();
    expect(screen.getByText('3 elements not ready')).toBeTruthy();
    expect(screen.getAllByText('Blocking')).toHaveLength(2);
    expect(screen.queryByText('0 of 2 characters in a scene cast.')).toBeNull();
    expect(screen.queryByText('2 still needed, 1 being sourced, 0 ready.')).toBeNull();
    expect(screen.getByRole('link', { name: /Open Cast & crew/ })).toBeTruthy();
  });

  it('tapping a row opens its numbers, tapping again closes them', () => {
    render(<BreakdownFocus focus={focus} projectId="p1" onAction={() => {}} />);
    const toggle = screen.getByRole('button', { name: /Cast every role in the film/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('0 of 2 characters in a scene cast.')).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByText('0 of 2 characters in a scene cast.')).toBeNull();
  });

  it('an in-tab action still fires from its own button', () => {
    const onAction = vi.fn();
    render(<BreakdownFocus focus={focus} projectId="p1" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: /Show what is missing/ }));
    expect(onAction).toHaveBeenCalledWith('needed');
  });
});
