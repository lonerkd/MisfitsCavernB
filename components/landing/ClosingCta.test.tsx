// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// AnimatedSection animates in on view; jsdom has no IntersectionObserver.
vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

import { ClosingCta } from './ClosingCta';

afterEach(cleanup);

describe('ClosingCta', () => {
  it('shows the closing line and the doors in', () => {
    render(<ClosingCta />);
    expect(screen.getByText(/BEGIN YOUR/)).toBeTruthy();
    expect(screen.getByText('FILM')).toBeTruthy();
    const start = screen.getByText('Start Writing').closest('a');
    expect(start?.getAttribute('href')).toBe('/auth');
    const contact = screen.getByText('Contact Crew').closest('a');
    expect(contact?.getAttribute('href')).toBe('https://instagram.com/lonerkid');
  });
});
