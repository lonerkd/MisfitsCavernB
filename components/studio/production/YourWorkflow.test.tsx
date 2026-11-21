// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { EMPTY_SIGNALS } from '@/lib/os/progress';

const listRecords = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/productionRecords', () => ({ listRecords }));
vi.mock('@/lib/roles/workflows', async (orig) => ({
  ...(await orig<typeof import('@/lib/roles/workflows')>()),
  workflowFor: () => ({
    stages: { Prep: [{ text: 'Break it down.', tool: 'breakdown' }, { text: 'Scout places.', tool: 'scout' }, { text: 'Get the paperwork.', tool: 'paperwork' }, { text: 'Think.' }] },
    receives: ['a'], hands: ['b'],
  }),
}));

import { YourWorkflow } from './YourWorkflow';

afterEach(cleanup);

describe('YourWorkflow readiness', () => {
  it('ticks the steps whose tools hold data, leaves empty ones open, and shows nothing for steps without evidence', async () => {
    listRecords.mockResolvedValue([]);
    render(<YourWorkflow craft="Director" department={null} openable={['breakdown']} onView={() => {}} projectId="p1" signals={{ ...EMPTY_SIGNALS, breakdown_elements: 3 }} />);
    await waitFor(() => expect(screen.getByText(/Prep: 1 of 2 ready/)).toBeTruthy());
    expect(screen.getAllByLabelText('Ready')).toHaveLength(1);
    expect(screen.getAllByLabelText('Not started')).toHaveLength(1);
    expect(listRecords).toHaveBeenCalledWith('p1', 'scouts');
    expect(listRecords).toHaveBeenCalledTimes(1);
  });
  it('shows no ticks when nothing could be loaded', () => {
    listRecords.mockRejectedValue(new Error('no'));
    render(<YourWorkflow craft="Director" department={null} openable={[]} onView={() => {}} />);
    expect(screen.queryByLabelText('Ready')).toBeNull();
    expect(screen.queryByLabelText('Not started')).toBeNull();
  });
});
