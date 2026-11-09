// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ToolHeader, ToolActionsContext } from './ToolHeader';
import { SectionHeader } from './ui';

afterEach(cleanup);

describe('ToolHeader', () => {
  it('names the tool, says what it is for, and shows where it stands and what is next', () => {
    render(<ToolHeader icon={<i />} eyebrow="Pre-production" title="Locations" purpose="Every place the script uses."
      progress={{ value: 2, of: 5, label: 'locked down' }} stats={[{ label: 'with permits', value: 1 }]}
      next={{ text: 'Lock down the Pier.', action: <button>Open</button> }} actions={<button>Print</button>} />);
    expect(screen.getByRole('heading', { name: 'Locations' })).toBeTruthy();
    for (const t of ['Pre-production', 'Every place the script uses.', '2 of 5', 'locked down', 'with permits', 'Lock down the Pier.', 'Next']) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Locations progress' }).getAttribute('aria-valuenow')).toBe('2');
    expect(screen.getByRole('button', { name: 'Print' })).toBeTruthy();
  });
  it('shows no bar, stats or next step when it has none', () => {
    render(<ToolHeader icon={<i />} title="Crew" />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('Next')).toBeNull();
  });
  it('shows the actions a parent supplies beside its own, so a tool need not know about them', () => {
    render(<ToolActionsContext.Provider value={<button>Print / PDF</button>}><ToolHeader icon={<i />} title="Props" actions={<button>Add</button>} /></ToolActionsContext.Provider>);
    expect(screen.getByRole('button', { name: 'Print / PDF' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });
  it('opens a Studio tab with the same header as an h2 the section can label itself by, and keeps the plain header for the editor', () => {
    const { container, rerender } = render(<SectionHeader id="post-title" title="Post" subtitle="Review cuts." tool={{ icon: <i />, eyebrow: 'Studio' }} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Post' }).id).toBe('post-title');
    expect(screen.getByText('Studio')).toBeTruthy();
    expect(container.querySelector('header')).not.toBeNull();
    rerender(<SectionHeader id="x" title="Notes" />);
    expect(container.querySelector('header')).toBeNull();
  });
});
