// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const requestCapability = vi.fn();
let label: string | null = 'See the budget';
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/roles/capabilities', () => ({ requestCapability: (...a: unknown[]) => requestCapability(...a), useCapabilityLabel: () => label }));

import { NeedsCapability } from './NeedsCapability';

beforeEach(() => { label = 'See the budget'; requestCapability.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('NeedsCapability', () => {
  it('says what is held back and which permission it needs', () => {
    render(<NeedsCapability projectId="p1" capability="budget.read" lead="The budget is held by the people who run the money." />);
    expect(screen.getByRole('note').textContent).toContain('The budget is held by the people who run the money. It needs “See the budget”.');
  });

  it('says nothing about a permission name it cannot read (not loaded), and still offers the button', () => {
    label = null;
    render(<NeedsCapability projectId="p1" capability="budget.read" lead="Held back." />);
    expect(screen.getByRole('note').textContent).toContain('Held back.');
    expect(screen.getByRole('note').textContent).not.toContain('It needs');
    expect(screen.getByRole('button', { name: 'Ask the owner' })).toBeTruthy();
  });

  it('asks the owner for that permission on that project, says so, and does not let it be sent twice', async () => {
    render(<NeedsCapability projectId="p1" capability="budget.read" lead="Held back." />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask the owner' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Asked' })).toBeTruthy());
    expect(requestCapability).toHaveBeenCalledExactlyOnceWith('p1', 'budget.read');
    expect(toast).toHaveBeenCalledWith('Asked the owner', 'success');
    expect((screen.getByRole('button', { name: 'Asked' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('tells the person when it could not be sent, and lets them try again', async () => {
    requestCapability.mockRejectedValueOnce(new Error('offline'));
    render(<NeedsCapability projectId="p1" capability="budget.read" lead="Held back." />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask the owner' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not ask the owner. Try again.', 'error'));
    expect((screen.getByRole('button', { name: 'Ask the owner' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
