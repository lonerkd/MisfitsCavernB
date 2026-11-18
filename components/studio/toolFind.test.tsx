// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const online: Array<{ userId: string; email: string; color: string; sceneIdx: null; tool: string | null; lastActive: string }> = [];
vi.mock('@/lib/os/PresenceContext', () => ({ usePresence: () => ({ onlineUsers: online, updateScenePresence: () => {}, updateToolPresence: () => {} }) }));
vi.mock('@/lib/os', () => ({ useCurrentUser: () => ({ user: { id: 'me' } }) }));

import { ToolHeader } from './ToolHeader';
import { ToolFindProvider, ToolHereContext, useRecordFind } from './toolFind';

const rows = [{ id: '1', hazard: 'Stunt fall', owner: 'Dev' }, { id: '2', hazard: 'Pyro', owner: 'Maya' }];

function Tool({ items = rows }: { items?: typeof rows }) {
  const { shown } = useRecordFind(items);
  return (
    <>
      <ToolHeader title="Safety" />
      <ul>{shown.map((r) => <li key={r.id}>{r.hazard}</li>)}</ul>
    </>
  );
}

afterEach(() => { cleanup(); online.length = 0; });

describe('the tool header search', () => {
  it('appears once the tool has a list, narrows it as you type and counts', () => {
    render(<ToolFindProvider><Tool /></ToolFindProvider>);
    const box = screen.getByRole('searchbox', { name: 'Search this tool' });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    fireEvent.change(box, { target: { value: 'maya' } });
    expect(screen.getAllByRole('listitem').map((l) => l.textContent)).toEqual(['Pyro']);
    expect(screen.getByRole('status').textContent).toBe('1 of 2');
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('status').textContent).toBe('0 of 2');
  });

  it('is not there for a tool with no list yet, or outside a Production tool', () => {
    render(<ToolFindProvider><Tool items={[]} /></ToolFindProvider>);
    expect(screen.queryByRole('searchbox')).toBeNull();
    cleanup();
    render(<Tool />);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('who else is in the tool', () => {
  it('names the others who have this tool open, not me and not another tool', () => {
    online.push(
      { userId: 'u1', email: 'dev@x.com', color: 'red', sceneIdx: null, tool: 'production:safety', lastActive: '' },
      { userId: 'u2', email: 'maya@x.com', color: 'green', sceneIdx: null, tool: 'production:money', lastActive: '' },
      { userId: 'me', email: 'me@x.com', color: 'blue', sceneIdx: null, tool: 'production:safety', lastActive: '' },
    );
    render(<ToolHereContext.Provider value="production:safety"><ToolHeader title="Safety" /></ToolHereContext.Provider>);
    expect(screen.getByRole('status').textContent).toBe('Dev is here too');
    act(() => { online.push({ userId: 'u3', email: 'ben@x.com', color: 'gold', sceneIdx: null, tool: 'production:safety', lastActive: '' }); });
    cleanup();
    render(<ToolHereContext.Provider value="production:safety"><ToolHeader title="Safety" /></ToolHereContext.Provider>);
    expect(screen.getByRole('status').textContent).toBe('Ben and Dev are here too');
  });

  it('says nothing when nobody is', () => {
    render(<ToolHereContext.Provider value="production:safety"><ToolHeader title="Safety" /></ToolHereContext.Provider>);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
