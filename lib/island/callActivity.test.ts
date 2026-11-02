import { describe, expect, it, vi } from 'vitest';
import { callActivity } from './callActivity';

const peer = (id: string, connected = true) => ({ id, name: id, speaking: false, connected });
const base = () => ({ channel: { id: 'c1', name: 'Writers room' }, peers: [] as ReturnType<typeof peer>[], muted: false, live: true, micError: null as string | null, toggleMute: vi.fn(), leave: vi.fn() });

describe('callActivity', () => {
  it('is nothing when there is no call', () => {
    expect(callActivity({ ...base(), channel: null })).toBeNull();
  });

  it('says what is being joined while the seat is not yet held, with only Leave', () => {
    const a = callActivity({ ...base(), live: false })!;
    expect(a).toMatchObject({ id: 'call', kind: 'call', tone: 'busy', title: 'Joining Writers room…' });
    expect(a.controls?.map((c) => c.id)).toEqual(['leave']);
  });

  it('holds a live call: the room, how many are in it, Mute and Leave', () => {
    const a = callActivity({ ...base(), peers: [peer('a'), peer('b')] })!;
    expect(a).toMatchObject({ tone: 'info', title: 'In voice · Writers room', detail: '3 people' });
    expect(a.controls?.map((c) => [c.id, c.label])).toEqual([['mute', 'Mute'], ['leave', 'Leave']]);
  });

  it('says "1 person" when alone, and "connecting…" while someone is still being reached', () => {
    expect(callActivity(base())!.detail).toBe('1 person');
    expect(callActivity({ ...base(), peers: [peer('a', false)] })!.detail).toBe('2 people · connecting…');
  });

  it('shows muted: the button turns into Unmute and the tone to a warning', () => {
    const a = callActivity({ ...base(), muted: true, peers: [peer('a')] })!;
    expect(a).toMatchObject({ tone: 'warn', detail: '2 people · muted' });
    expect(a.controls?.[0]).toMatchObject({ id: 'mute', label: 'Unmute' });
  });

  it('the buttons are the call\'s own actions', () => {
    const call = base();
    const a = callActivity(call)!;
    a.controls?.find((c) => c.id === 'mute')?.run();
    a.controls?.find((c) => c.id === 'leave')?.run();
    expect(call.toggleMute).toHaveBeenCalledOnce();
    expect(call.leave).toHaveBeenCalledOnce();
  });

  it('reports a microphone problem as an error and still lets you leave', () => {
    const a = callActivity({ ...base(), live: false, micError: 'Microphone access denied' })!;
    expect(a).toMatchObject({ tone: 'error', detail: 'Microphone access denied' });
    expect(a.controls?.map((c) => c.id)).toEqual(['leave']);
  });
});
