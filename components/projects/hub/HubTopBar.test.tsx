// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { HubTopBar } from './HubTopBar';

afterEach(cleanup);

const base = {
  onlineCount: 0,
  tasks: 0,
  tasksDone: 0,
};

describe('HubTopBar', () => {
  it('shows the online count and task tally only when they are non-zero', () => {
    const { rerender } = render(<HubTopBar {...base} />);
    expect(screen.queryByText(/online/)).toBeNull();
    expect(screen.queryByText(/tasks done/)).toBeNull();

    rerender(<HubTopBar {...base} onlineCount={2} tasks={5} tasksDone={3} />);
    expect(screen.getByText('2 online')).toBeTruthy();
    expect(screen.getByText('3/5 tasks done')).toBeTruthy();
  });

  it('carries no owner controls — the visibility picker lives in the office section now', () => {
    render(<HubTopBar {...base} onlineCount={1} tasks={2} tasksDone={1} />);
    expect(screen.queryByLabelText('Project visibility')).toBeNull();
    expect(screen.queryByText('Copy link')).toBeNull();
  });
});
