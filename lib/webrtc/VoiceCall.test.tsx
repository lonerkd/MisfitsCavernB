// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const toast = vi.fn();
let signedInAs: string | null = 'u1';
const room = { peers: [] as unknown[], muted: false, live: true, speaking: false, micError: null as string | null, toggleMute: vi.fn() };
const hookCalls: Array<{ channelId: string; me: { id: string } | null; joined: boolean }> = [];
let onFull: (() => void) | undefined;

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/os/hooks', () => ({ useCurrentUser: () => ({ user: signedInAs ? { id: signedInAs } : null }) }));
vi.mock('./voice', () => ({
  useVoiceRoom: (channelId: string, me: { id: string } | null, joined: boolean, full?: () => void) => {
    hookCalls.push({ channelId, me, joined });
    onFull = full;
    return room;
  },
}));

import { VoiceCallProvider, useVoiceCall, type VoiceCall } from './VoiceCall';

// What the provider offers right now, recorded after each render (never assigned during one).
const seen = {} as { call: VoiceCall };
const call = new Proxy({} as VoiceCall, { get: (_, key) => seen.call[key as keyof VoiceCall] });
function Probe() {
  const current = useVoiceCall();
  useEffect(() => { seen.call = current; });
  return null;
}
const mount = () => render(<VoiceCallProvider><Probe /></VoiceCallProvider>);
const me = { id: 'u1', name: 'Sam' };
const writers = { id: 'c1', name: 'Writers room' };
const crew = { id: 'c2', name: 'Crew' };
const lastCall = () => hookCalls[hookCalls.length - 1];

beforeEach(() => { hookCalls.length = 0; toast.mockClear(); room.toggleMute.mockClear(); signedInAs = 'u1'; });
afterEach(cleanup);

describe('VoiceCallProvider', () => {
  it('is not in a call until asked, and the room hook sits idle', () => {
    mount();
    expect(call.channel).toBeNull();
    expect(lastCall()).toMatchObject({ channelId: '', joined: false });
  });

  it('joining holds the call above the page: the room is joined as this person', () => {
    mount();
    act(() => call.join(writers, me));
    expect(call.channel).toEqual(writers);
    expect(lastCall()).toMatchObject({ channelId: 'c1', joined: true, me });
  });

  it('the call outlives the view that started it: unmounting a child does not end it', () => {
    function Page() { const c = useVoiceCall(); return <button onClick={() => c.join(writers, me)}>join</button>; }
    const view = render(<VoiceCallProvider><Probe /><Page /></VoiceCallProvider>);
    act(() => view.getByText('join').click());
    view.rerender(<VoiceCallProvider><Probe /></VoiceCallProvider>); // navigated away: the page is gone, the provider is not
    expect(call.channel).toEqual(writers);
    expect(lastCall().joined).toBe(true);
  });

  it('joining another room moves the call there (one call at a time)', () => {
    mount();
    act(() => call.join(writers, me));
    act(() => call.join(crew, me));
    expect(call.channel).toEqual(crew);
    expect(lastCall()).toMatchObject({ channelId: 'c2', joined: true });
  });

  it('leaving ends it', () => {
    mount();
    act(() => call.join(writers, me));
    act(() => call.leave());
    expect(call.channel).toBeNull();
    expect(lastCall().joined).toBe(false);
  });

  it('mute is the room\'s own', () => {
    mount();
    act(() => call.join(writers, me));
    call.toggleMute();
    expect(room.toggleMute).toHaveBeenCalledOnce();
  });

  it('signing out ends the call, and so does another person signing in', () => {
    const view = mount();
    act(() => call.join(writers, me));
    signedInAs = null;
    view.rerender(<VoiceCallProvider><Probe /></VoiceCallProvider>);
    expect(call.channel).toBeNull();
    act(() => call.join(writers, me));
    signedInAs = 'u2';
    view.rerender(<VoiceCallProvider><Probe /></VoiceCallProvider>);
    expect(call.channel).toBeNull();
  });

  it('a full room turns us away: the call ends, the room is remembered as full, and the person is told', () => {
    mount();
    act(() => call.join(writers, me));
    act(() => onFull?.());
    expect(call.channel).toBeNull();
    expect(call.fullFor).toBe('c1');
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('full'), 'error');
    act(() => call.join(writers, me)); // trying again clears it
    expect(call.fullFor).toBeNull();
  });

  it('outside the provider there is simply no call', () => {
    render(<Probe />);
    expect(call.channel).toBeNull();
    expect(() => { call.join(writers, me); call.leave(); call.toggleMute(); }).not.toThrow();
  });
});
