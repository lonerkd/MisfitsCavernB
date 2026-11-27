// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// framer-motion's whileInView needs an IntersectionObserver; jsdom has none.
vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

import { StatsSection } from './StatsSection';

afterEach(cleanup);

describe('StatsSection', () => {
  it('shows the labelled skeleton while the totals load', () => {
    render(<StatsSection stats={null} />);
    expect(screen.getByText('Creators')).toBeTruthy();
    expect(screen.getByText('Screenplays')).toBeTruthy();
    expect(screen.getByText('Productions')).toBeTruthy();
    expect(screen.getByText('Concept Assets')).toBeTruthy();
  });

  it('renders the real totals once loaded', () => {
    render(<StatsSection stats={{ creators: 100000, scripts: 42, projects: 7, concepts: 9 }} />);
    expect(screen.getByText('100,000')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('References & Media')).toBeTruthy();
  });

  it('hides the Creators tile while the people total is small', () => {
    render(<StatsSection stats={{ creators: 0, scripts: 42, projects: 7, concepts: 9 }} />);
    expect(screen.queryByText('Creators')).toBeNull();
    expect(screen.getByText('Screenplays')).toBeTruthy();
  });

  it('renders nothing when every total is zero', () => {
    const { container } = render(<StatsSection stats={{ creators: 0, scripts: 0, projects: 0, concepts: 0 }} />);
    expect(container.firstChild).toBeNull();
  });
});
