// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
const list = vi.fn();
const answer = vi.fn();
vi.mock('@/lib/supabase/credit-requests', () => ({
  listCreditRequests: (...a: unknown[]) => list(...a),
  answerCreditRequest: (...a: unknown[]) => answer(...a),
}));
import { CreditRequests } from './CreditRequests';

const req = { id: 'r1', project_id: 'p1', requester_id: 'u2', craft: 'Gaffer', note: 'Lit the night scenes', status: 'pending', created_at: '', decided_at: null, username: 'Maya' };

beforeEach(() => { toast.mockReset(); list.mockReset(); answer.mockReset(); list.mockResolvedValue([req]); answer.mockResolvedValue(undefined); });
afterEach(cleanup);

describe('CreditRequests', () => {
  it('renders nothing with no requests', async () => {
    list.mockResolvedValue([]);
    const { container } = render(<CreditRequests projectId="p1" ownerId="o1" />);
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
  });

  it('shows username, craft and note', async () => {
    render(<CreditRequests projectId="p1" ownerId="o1" />);
    expect(await screen.findByText('Maya')).toBeTruthy();
    expect(screen.getByText('Gaffer')).toBeTruthy();
    expect(screen.getByText('Lit the night scenes')).toBeTruthy();
  });

  it('Approve answers true, toasts, reloads and tells the crew list', async () => {
    const onChanged = vi.fn();
    render(<CreditRequests projectId="p1" ownerId="o1" onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(answer).toHaveBeenCalledWith(req, true, 'o1'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Credited Maya as Gaffer', 'success');
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('Decline answers false', async () => {
    render(<CreditRequests projectId="p1" ownerId="o1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(answer).toHaveBeenCalledWith(req, false, 'o1'));
  });

  it('disables both buttons while a request is in flight', async () => {
    let finish: () => void = () => {};
    answer.mockReturnValue(new Promise<void>((r) => { finish = r; }));
    render(<CreditRequests projectId="p1" ownerId="o1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole('button', { name: 'Decline' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(answer).toHaveBeenCalledTimes(1);
    finish();
  });

  it('toasts the error when answering fails', async () => {
    answer.mockRejectedValue(new Error('nope'));
    render(<CreditRequests projectId="p1" ownerId="o1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('nope', 'error'));
  });
});
