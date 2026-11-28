// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock('@/lib/crafts/crafts', () => ({ useCrafts: () => ({ byName: new Map() }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/supabase/reports', () => ({
  REASON_MAX: 300,
  reportItem: vi.fn(async () => ({ error: null, again: false })),
}));

import { JobCard } from './JobCards';
import { type JobWithRelations } from '@/lib/supabase/jobs';

const job = (over: Partial<JobWithRelations> = {}): JobWithRelations => ({
  id: 'j1',
  project_id: 'p1',
  title: 'Composer: Cinder Court soundtrack',
  role: 'Composer',
  description: 'Score the burn and the ledger scene — strings, low brass, and a clock that will not stop ticking under either of them.',
  rate: 2800,
  status: 'open',
  created_by: 'u1',
  created_at: new Date(Date.now() - Math.floor(11.5 * 86400000)).toISOString(),
  updated_at: '',
  projects: { title: 'Cinder Court' },
  profiles: { username: 'loner' },
  ...over,
});

const renderCard = (over: Partial<JobWithRelations> = {}, props: { applied?: string } = {}) => {
  const onApply = vi.fn(async () => true);
  const utils = render(<JobCard job={job(over)} onApply={onApply} applied={props.applied} index={0} />);
  return { onApply, ...utils };
};

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('JobCard (J1: the rebuilt card)', () => {
  it('the title leads, full width, and links to the posting', () => {
    renderCard();
    const link = screen.getByRole('link', { name: 'Composer: Cinder Court soundtrack' });
    expect(link.getAttribute('href')).toBe('/jobs/j1');
    // The title sits above the meta line, not inside a column beside the actions.
    const meta = screen.getByText('Composer').parentElement as HTMLElement;
    expect(link.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(meta.contains(link)).toBe(false);
  });

  it('role, project, poster and age read as one quiet meta line', () => {
    renderCard();
    const meta = screen.getByText('Composer').parentElement as HTMLElement;
    expect(meta.textContent).toContain('Cinder Court');
    expect(meta.textContent).toContain('loner');
    expect(meta.textContent).toContain('11d ago');
  });

  it('there is no report flag standing on the card face — it lives in the overflow', () => {
    renderCard();
    // The hidden dialog host is display:none, so nothing report-shaped is offered on the card itself.
    expect(screen.queryByRole('button', { name: 'Report this job' })).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: /More actions/ })).toBeTruthy();
  });

  it('the overflow menu opens the report dialog', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /More actions/ }));
    const item = screen.getByRole('menuitem', { name: /Report/ });
    fireEvent.click(item);
    expect(screen.getByRole('dialog', { name: 'Report this job' })).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
    // Opening the report must not also open the posting.
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('the overflow closes on Escape', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /More actions/ }));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('tapping the card body opens the posting', () => {
    const { container } = renderCard();
    fireEvent.click(container.querySelector('[data-testid="job-card"]') as Element);
    expect(nav.push).toHaveBeenCalledWith('/jobs/j1');
  });

  it('tapping the description opens the posting too', () => {
    renderCard();
    fireEvent.click(screen.getByText(/Score the burn/));
    expect(nav.push).toHaveBeenCalledWith('/jobs/j1');
  });

  it('Apply acts for itself: it opens the composer instead of navigating', async () => {
    const { onApply } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Apply/ }));
    expect(nav.push).not.toHaveBeenCalled();
    // The shared Textarea only shows its placeholder once focused; the note field is the one textbox.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'I scored two shorts.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send application' }));
    expect(onApply).toHaveBeenCalledWith('j1', 'I scored two shorts.');
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('the description gets three lines, serif kept', () => {
    renderCard();
    const desc = screen.getByText(/Score the burn/);
    expect(desc.style.cssText).toContain('line-clamp: 3');
    expect(desc.style.fontFamily).toContain('serif');
  });

  it('an applied card reads as a status in place of the Apply button', () => {
    renderCard({}, { applied: 'Nov 20' });
    expect(screen.getByRole('status').textContent).toContain('Applied · Nov 20');
    expect(screen.queryByRole('button', { name: /Apply/ })).toBeNull();
  });

  it('the rate still renders as posted (the unit fix is J2, not this slice)', () => {
    renderCard();
    expect(screen.getByText(/2800\/hr/)).toBeTruthy();
  });
});
