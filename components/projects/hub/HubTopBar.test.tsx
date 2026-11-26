// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('@/lib/supabase/projects', () => ({
  PROJECT_VISIBILITY: [
    { id: 'private', label: 'Private', hint: '' },
    { id: 'team', label: 'Team', hint: '' },
    { id: 'link', label: 'Anyone with the link', hint: '' },
    { id: 'public', label: 'Public', hint: '' },
  ],
}));

import { HubTopBar } from './HubTopBar';

afterEach(cleanup);

const base = {
  onlineCount: 0,
  tasks: 0,
  tasksDone: 0,
  ownerView: false,
  visibility: 'team' as const,
  onVisibilityChange: vi.fn(),
  onCopyShareLink: vi.fn(),
};

describe('HubTopBar', () => {
  it('shows the online count and task tally only when they are non-zero', () => {
    const { rerender } = render(<HubTopBar {...base} />);
    expect(screen.queryByText(/online/)).toBeNull();
    expect(screen.queryByText(/tasks done/)).toBeNull();

    rerender(<HubTopBar {...base} onlineCount={2} tasks={5} tasksDone={3} />);
    expect(screen.getByText('2 online')).toBeTruthy();
    expect(screen.getByText('3/5 tasks done')).toBeTruthy();
  });

  it('gives the owner the visibility picker and fires changes', () => {
    const onVisibilityChange = vi.fn();
    render(<HubTopBar {...base} ownerView visibility="team" onVisibilityChange={onVisibilityChange} />);
    const select = screen.getByLabelText('Project visibility') as HTMLSelectElement;
    expect(select.value).toBe('team');
    fireEvent.change(select, { target: { value: 'link' } });
    expect(onVisibilityChange).toHaveBeenCalledWith('link');
  });

  it('shows the copy-link button only for link visibility, and it fires', () => {
    const onCopyShareLink = vi.fn();
    const { rerender } = render(<HubTopBar {...base} ownerView visibility="team" onCopyShareLink={onCopyShareLink} />);
    expect(screen.queryByText('Copy link')).toBeNull();

    rerender(<HubTopBar {...base} ownerView visibility="link" onCopyShareLink={onCopyShareLink} />);
    fireEvent.click(screen.getByText('Copy link'));
    expect(onCopyShareLink).toHaveBeenCalledTimes(1);
  });

  it('hides the picker from non-owners', () => {
    render(<HubTopBar {...base} ownerView={false} visibility="link" />);
    expect(screen.queryByLabelText('Project visibility')).toBeNull();
    expect(screen.queryByText('Copy link')).toBeNull();
  });
});
