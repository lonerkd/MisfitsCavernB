// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const guestSign = vi.fn();
const guestDecline = vi.fn();
vi.mock('@/lib/supabase/signing', () => ({ guestSign: (...a: unknown[]) => guestSign(...a), guestDecline: (...a: unknown[]) => guestDecline(...a) }));

import { SignClient, type SigningView } from './SignClient';

const view: SigningView = { title: 'Appearance release', body: 'I agree to appear.', project_title: 'Harbour', signer_label: 'Maya Ortiz', status: 'pending', expires_at: '2026-12-20T00:00:00Z', signed_name: null, signed_at: null };

afterEach(() => { cleanup(); guestSign.mockReset(); guestDecline.mockReset(); });

describe('the signing page', () => {
  it('shows the whole text and will not sign without a name and the agreement', async () => {
    render(<SignClient token="t" view={view} />);
    expect(screen.getByText('I agree to appear.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    expect(screen.getByRole('alert').textContent).toMatch(/full name/);
    fireEvent.change(screen.getByLabelText('Your full name'), { target: { value: 'Maya Ortiz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Tick the box/);
    expect(guestSign).not.toHaveBeenCalled();
  });
  it('signs with the typed name and the agreement, then says it is signed', async () => {
    guestSign.mockResolvedValue(true);
    render(<SignClient token="tok" view={view} />);
    fireEvent.change(screen.getByLabelText('Your full name'), { target: { value: '  Maya Ortiz ' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Signed by Maya Ortiz/));
    expect(guestSign).toHaveBeenCalledWith('tok', 'Maya Ortiz', true);
    expect(screen.queryByRole('button', { name: 'Sign' })).toBeNull();
  });
  it('says so plainly when the request has closed under them', async () => {
    guestSign.mockResolvedValue(false);
    render(<SignClient token="tok" view={view} />);
    fireEvent.change(screen.getByLabelText('Your full name'), { target: { value: 'Maya Ortiz' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no longer open/));
  });
  it('lets them decline with a reason, and offers nothing on a signed or expired one', async () => {
    guestDecline.mockResolvedValue(true);
    render(<SignClient token="tok" view={view} />);
    fireEvent.click(screen.getByRole('button', { name: 'I don’t agree' }));
    fireEvent.change(screen.getByLabelText(/Tell the production why/), { target: { value: 'Not at this rate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/declined/));
    expect(guestDecline).toHaveBeenCalledWith('tok', 'Not at this rate');
    cleanup();
    render(<SignClient token="t" view={{ ...view, status: 'expired' }} />);
    expect(screen.queryByRole('button', { name: 'Sign' })).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/expired/);
  });
});
