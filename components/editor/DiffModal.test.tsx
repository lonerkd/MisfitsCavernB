// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/changeReviews', () => ({
  listChangeReviews: vi.fn(async () => []),
  setChangeReview: vi.fn(async () => undefined),
  clearChangeReview: vi.fn(async () => undefined),
}));

import { DiffModal } from './DiffModal';

afterEach(cleanup);

const texts = { originalText: 'INT. DINER - NIGHT\n\nJUNIE\nHi.\n', modifiedText: 'INT. DINER - NIGHT\n\nJUNIE\nHi.\n\nELI\nHello.\n', label: 'White Revision' };

describe('DiffModal review mode', () => {
  it('offers the Review switch when it knows the project, script and person (the editor passes them)', () => {
    render(<DiffModal isOpen onClose={() => {}} {...texts} projectId="p1" scriptId="s1" userId="u1" />);
    const sw = screen.getByRole('switch', { name: /Review/ });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    expect(sw.getAttribute('aria-checked')).toBe('true');
  });
  it('has no Review switch without them: there is nowhere to keep the decisions', () => {
    render(<DiffModal isOpen onClose={() => {}} {...texts} />);
    expect(screen.queryByRole('switch', { name: /Review/ })).toBeNull();
  });
});
