// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ToolHeader } from './ToolHeader';

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
});
