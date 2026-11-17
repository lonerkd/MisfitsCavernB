// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  addBudgetItem: vi.fn(async () => ({ id: 'new' })),
  deleteBudgetItem: vi.fn(async () => undefined),
  createJob: vi.fn(async () => undefined),
  getBudgetItemIdsWithJobs: vi.fn(async () => new Set<string>(['b2'])),
  announceProgressChange: vi.fn(),
  confirm: vi.fn(async () => true),
  toast: vi.fn(),
}));
vi.mock('@/lib/supabase/project-hub', () => ({ addBudgetItem: api.addBudgetItem, deleteBudgetItem: api.deleteBudgetItem }));
vi.mock('@/lib/supabase/jobs', () => ({ createJob: api.createJob, getBudgetItemIdsWithJobs: api.getBudgetItemIdsWithJobs }));
vi.mock('@/lib/supabase/progress', () => ({ announceProgressChange: api.announceProgressChange }));
vi.mock('@/lib/crafts/crafts', () => ({ loadCrafts: async () => [], suggestCraft: () => 'Producer' }));
vi.mock('@/lib/breakdown', () => ({ breakdown: {}, costByCategory: () => [] }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => api.confirm }));

import { BudgetLines } from './BudgetLines';

const line = (id: string, category: string, amount: number) => ({ id, category, amount, project_id: 'p1' }) as never;

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

describe('BudgetLines (the one budget, in Studio › Money)', () => {
  it('adds a line with its planned amount, tells the phase milestones, and refreshes', async () => {
    const onChange = vi.fn();
    render(<BudgetLines projectId="p1" userId="u1" lines={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Catering' } });
    fireEvent.change(screen.getByLabelText('Planned amount'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: /Add line/ }));
    await waitFor(() => expect(api.addBudgetItem).toHaveBeenCalledWith('p1', 'u1', 'Catering', 450));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(api.announceProgressChange).toHaveBeenCalledWith('p1');
  });

  it('asks before deleting a line, and does nothing when the answer is no', async () => {
    api.confirm.mockResolvedValueOnce(false);
    const onChange = vi.fn();
    render(<BudgetLines projectId="p1" userId="u1" lines={[line('b1', 'Camera', 1000)]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Camera' }));
    await waitFor(() => expect(api.confirm).toHaveBeenCalled());
    expect(api.deleteBudgetItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Camera' }));
    await waitFor(() => expect(api.deleteBudgetItem).toHaveBeenCalledWith('b1'));
  });

  it('posts a line as a job once, and a line already posted cannot be posted again', async () => {
    render(<BudgetLines projectId="p1" userId="u1" lines={[line('b1', 'Camera', 1000), line('b2', 'Sound', 500)]} onChange={() => {}} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sound is already on the Jobs board' })).toHaveProperty('disabled', true));
    fireEvent.click(screen.getByRole('button', { name: 'Post Camera as a job' }));
    await waitFor(() => expect(api.createJob).toHaveBeenCalledWith('p1', 'u1', 'Camera', 'Producer', '', 1000, 'b1'));
  });
});
