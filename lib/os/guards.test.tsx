// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useOSStore } from './store';
import { ProtectedPage } from './guards';
import type { OSSession } from './types';

afterEach(cleanup);

const session = (patch: Partial<OSSession>): OSSession => ({
  status: 'authed', user: null, userId: 'u1', email: null, isAdmin: false, error: null, ...patch,
});
const show = (s: OSSession, require: 'signed-in' | 'admin') => {
  useOSStore.setState({ session: s });
  render(<ProtectedPage require={require}><p>secret</p></ProtectedPage>);
};

describe('ProtectedPage', () => {
  it('waits while the session resolves', () => {
    show(session({ status: 'resolving' }), 'admin');
    expect(screen.getByText('LOADING...')).toBeTruthy();
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('admin pages: admins only', () => {
    show(session({ isAdmin: true }), 'admin');
    expect(screen.getByText('secret')).toBeTruthy();
    cleanup();
    show(session({ isAdmin: false }), 'admin');
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText('This page is for admins.')).toBeTruthy();
  });

  it('an admin flag left over from a signed-out session opens nothing', () => {
    show(session({ status: 'anon', userId: null, isAdmin: true }), 'admin');
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('signed-in pages: anyone signed in, nobody signed out', () => {
    show(session({}), 'signed-in');
    expect(screen.getByText('secret')).toBeTruthy();
    cleanup();
    show(session({ status: 'anon', userId: null }), 'signed-in');
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText('Sign in to see this page.')).toBeTruthy();
  });

  it('a fallback replaces the default message', () => {
    useOSStore.setState({ session: session({}) });
    render(<ProtectedPage require="admin" fallback={<p>ask an admin</p>}><p>secret</p></ProtectedPage>);
    expect(screen.getByText('ask an admin')).toBeTruthy();
  });
});
