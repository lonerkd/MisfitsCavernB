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
  listBudgetTemplates: vi.fn(),
  applyBudgetTemplate: vi.fn(async () => 2),
  setBudgetAboveTheLine: vi.fn(async () => undefined),
}));
const tpl = (id: string, name: string, amount: number) => ({ id, name, description: `${name} blurb`, sort_order: 0, lines: [{ category: 'Cast', name: 'Lead', amount, above_the_line: true }, { category: 'Crew', name: 'DP', amount: 50, above_the_line: false }] });
vi.mock('@/lib/supabase/project-hub', () => ({ addBudgetItem: api.addBudgetItem, deleteBudgetItem: api.deleteBudgetItem }));
vi.mock('@/lib/supabase/budget-templates', () => ({ listBudgetTemplates: api.listBudgetTemplates, applyBudgetTemplate: api.applyBudgetTemplate, setBudgetAboveTheLine: api.setBudgetAboveTheLine }));
vi.mock('@/lib/supabase/jobs', () => ({ createJob: api.createJob, getBudgetItemIdsWithJobs: api.getBudgetItemIdsWithJobs }));
vi.mock('@/lib/supabase/progress', () => ({ announceProgressChange: api.announceProgressChange }));
vi.mock('@/lib/crafts/crafts', () => ({ loadCrafts: async () => [], suggestCraft: () => 'Producer' }));
vi.mock('@/lib/breakdown', () => ({ breakdown: {}, costByCategory: () => [] }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => api.confirm }));

import { BudgetLines } from './BudgetLines';

const line = (id: string, category: string, amount: number) => ({ id, category, amount, project_id: 'p1' }) as never;

beforeEach(() => { vi.clearAllMocks(); api.listBudgetTemplates.mockResolvedValue([tpl('t1', 'Indie', 100), tpl('t2', 'Micro', 10)]); });
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

  it('offers the templates on an empty budget, with their totals, and starts from the one chosen', async () => {
    const onChange = vi.fn();
    render(<BudgetLines projectId="p1" userId="u1" lines={[]} onChange={onChange} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start from Indie, $150' }));
    await waitFor(() => expect(api.applyBudgetTemplate).toHaveBeenCalledWith('p1', 'u1', expect.objectContaining({ name: 'Indie' })));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(api.toast).toHaveBeenCalledWith(expect.stringContaining('Indie'), 'success');
    expect(api.announceProgressChange).toHaveBeenCalledWith('p1');
  });

  it('says so when the template cannot be applied, and changes nothing', async () => {
    api.applyBudgetTemplate.mockRejectedValueOnce(new Error('new row violates row-level security policy'));
    const onChange = vi.fn();
    render(<BudgetLines projectId="p1" userId="u1" lines={[]} onChange={onChange} />);
    fireEvent.click(await screen.findByRole('button', { name: /Start from Micro/ }));
    await waitFor(() => expect(api.toast).toHaveBeenCalledWith('new row violates row-level security policy', 'error'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not offer templates once there are lines, and a line can move above the line', async () => {
    render(<BudgetLines projectId="p1" userId="u1" lines={[{ ...(line('b1', 'Camera', 1000) as object), above_the_line: false } as never]} onChange={() => {}} />);
    expect(screen.queryByRole('group', { name: 'Start from a template' })).toBeNull();
    expect(api.listBudgetTemplates).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Camera is above the line' }));
    await waitFor(() => expect(api.setBudgetAboveTheLine).toHaveBeenCalledWith('b1', true));
  });
});
