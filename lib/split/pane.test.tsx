// @vitest-environment jsdom
import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useInPane } from './pane';

function Probe() { return <p>{useInPane() ? 'in a pane' : 'a full page'}</p>; }

function pretendFramedBySameSite() {
  vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window);
  vi.spyOn(window, 'parent', 'get').mockReturnValue({ location: { origin: window.location.origin } } as unknown as Window);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('useInPane', () => {
  it('says a full page when it is drawn for hydration, even inside a pane (a different answer is a hydration mismatch)', () => {
    pretendFramedBySameSite();
    expect(renderToString(<Probe />)).toContain('a full page');
  });
  it('then says in a pane once it is on the client', async () => {
    pretendFramedBySameSite();
    await act(async () => { render(<Probe />); });
    expect(screen.getByText('in a pane')).toBeTruthy();
  });
  it('stays a full page outside a frame', async () => {
    await act(async () => { render(<Probe />); });
    expect(screen.getByText('a full page')).toBeTruthy();
  });
});
