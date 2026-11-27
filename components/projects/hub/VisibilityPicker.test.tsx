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

import { VisibilityPicker } from './VisibilityPicker';

afterEach(cleanup);

describe('VisibilityPicker', () => {
  it('shows the current visibility and fires changes', () => {
    const onVisibilityChange = vi.fn();
    render(<VisibilityPicker visibility="team" onVisibilityChange={onVisibilityChange} onCopyShareLink={vi.fn()} />);
    const select = screen.getByLabelText('Project visibility') as HTMLSelectElement;
    expect(select.value).toBe('team');
    fireEvent.change(select, { target: { value: 'link' } });
    expect(onVisibilityChange).toHaveBeenCalledWith('link');
  });

  it('shows the copy-link button only for link visibility, and it fires', () => {
    const onCopyShareLink = vi.fn();
    const { rerender } = render(<VisibilityPicker visibility="team" onVisibilityChange={vi.fn()} onCopyShareLink={onCopyShareLink} />);
    expect(screen.queryByText('Copy link')).toBeNull();

    rerender(<VisibilityPicker visibility="link" onVisibilityChange={vi.fn()} onCopyShareLink={onCopyShareLink} />);
    fireEvent.click(screen.getByText('Copy link'));
    expect(onCopyShareLink).toHaveBeenCalledTimes(1);
  });
});
