// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TimelinePreview } from './DeptWindow';
import type { MilestoneRow } from '@/lib/supabase/project-hub';

afterEach(() => { cleanup(); });

const past = new Date(Date.now() - 16 * 86400000).toISOString();
const item: MilestoneRow = { id: 'm1', title: 'Lock the cut', end_date: past, status: null };

describe('TimelinePreview — the Schedule window', () => {
  it('an empty timeline never headlines a bare past-deadline countdown over itself', () => {
    render(<TimelinePreview deadline={past} milestones={[]} />);
    expect(screen.getByText('No schedule dates yet')).toBeTruthy();
    expect(screen.queryByText(/days past the end date/)).toBeNull();
    expect(screen.getByText(/No timeline items yet/)).toBeTruthy();
  });

  it('with a timeline, the countdown from the project end date still speaks', () => {
    render(<TimelinePreview deadline={past} milestones={[item]} />);
    expect(screen.getByText(/days past the end date/)).toBeTruthy();
    expect(screen.getByText('Lock the cut')).toBeTruthy();
  });

  it('a timeline with no end date says so, without inventing a countdown', () => {
    render(<TimelinePreview deadline="" milestones={[item]} />);
    expect(screen.getByText('No end date set')).toBeTruthy();
  });
});

describe('the hub page stats', () => {
  it('the Schedule window stat counts timeline items and is labelled Timeline, not Milestones', () => {
    const page = readFileSync(join(process.cwd(), 'app', '(suite)', 'projects', '[id]', 'page.tsx'), 'utf8');
    expect(page).toContain("{ label: 'Timeline', value: counts.timeline }");
  });
});
