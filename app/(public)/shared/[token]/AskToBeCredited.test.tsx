// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toast = vi.fn();
const getSession = vi.fn();
const rpc = vi.fn();
const ask = vi.fn();
const mine = vi.fn();
const withdraw = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: { getSession: () => getSession() }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) } }));
vi.mock('@/lib/supabase/credit-requests', () => ({
  askToBeCredited: (...a: unknown[]) => ask(...a),
  myCreditRequest: (...a: unknown[]) => mine(...a),
  withdrawCreditRequest: (...a: unknown[]) => withdraw(...a),
  sharedProjectId: (...a: unknown[]) => rpc(...a),
  isOnTheFilm: async () => false,
}));
import AskToBeCredited from './AskToBeCredited';

const signedIn = () => { getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }); rpc.mockResolvedValue('p1'); };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('AskToBeCredited', () => {
  it('links signed-out visitors to sign in', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<AskToBeCredited token="tok" />);
    const a = await screen.findByRole('link', { name: 'Sign in to ask to be credited' });
    expect(a.getAttribute('href')).toMatch(/^\/auth\?redirect=/);
  });
  it('sends the trimmed ask', async () => {
    signedIn(); mine.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'r1', craft: 'Gaffer', status: 'pending' });
    ask.mockResolvedValue(undefined);
    render(<AskToBeCredited token="tok" />);
    fireEvent.click(await screen.findByRole('button', { name: /Ask to be added/ }));
    fireEvent.change(screen.getByLabelText(/What did you do/), { target: { value: '  Gaffer ' } });
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: ' hi ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(ask).toHaveBeenCalledWith('p1', 'u1', 'Gaffer', 'hi'));
    expect(rpc).toHaveBeenCalledWith('tok');
    expect(await screen.findByRole('button', { name: 'Withdraw' })).toBeTruthy();
  });
  it('shows Withdraw while pending, and withdraws', async () => {
    signedIn(); mine.mockResolvedValue({ id: 'r1', craft: 'Gaffer', status: 'pending' }); withdraw.mockResolvedValue(undefined);
    render(<AskToBeCredited token="tok" />);
    expect(await screen.findByText(/Asked: Gaffer\. The owner has not answered yet\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }));
    await waitFor(() => expect(withdraw).toHaveBeenCalledWith('r1'));
  });
});
