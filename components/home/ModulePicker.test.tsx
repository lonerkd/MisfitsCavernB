// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ModulePicker } from './ModulePicker';

const data = { scriptLines: ['INT. HARBOUR - DAY', 'Rain.'], assets: [{ label: 'Pier reference', color: 'red' }], messages: [{ from: 'Maya', text: 'Call time moved', mine: false }], works: [] };

afterEach(cleanup);

describe('the phone picker for the parts of the suite', () => {
  it('opens on ScriptOS with the way in, and switches part by tab', () => {
    render(<ModulePicker data={data} loggedIn={false} />);
    expect(screen.getByRole('tab', { name: 'ScriptOS' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('link').getAttribute('href')).toBe('/editor');
    fireEvent.click(screen.getByRole('tab', { name: 'Lounge' }));
    expect(screen.getByRole('link').getAttribute('href')).toBe('/lounge');
    fireEvent.click(screen.getByRole('tab', { name: 'Studio' }));
    expect(screen.getByRole('link').getAttribute('href')).toBe('/studio');
  });
  it('shows a demo when there is no work yet, and your own work when there is', () => {
    const empty = { scriptLines: [], assets: [], messages: [], works: [] };
    const out = render(<ModulePicker data={empty} loggedIn={false} />);
    expect(out.container.textContent).toContain('Screenplay formatting as you type');
    out.unmount();
    const mine = render(<ModulePicker data={data} loggedIn />);
    expect(mine.container.textContent).toContain('INT. HARBOUR - DAY');
    fireEvent.click(screen.getByRole('tab', { name: 'Lounge' }));
    expect(mine.container.textContent).toContain('Call time moved');
    fireEvent.click(screen.getByRole('tab', { name: 'Studio' }));
    expect(mine.container.textContent).toContain('Pier reference');
  });
});
