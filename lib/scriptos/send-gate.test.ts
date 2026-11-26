import { describe, expect, it } from 'vitest';
import { BroadcastGate } from './send-gate';

describe('BroadcastGate (BACKLOG 3.33 leftover (i): sends follow connection health)', () => {
  it('holds every send until the channel has subscribed', () => {
    const gate = new BroadcastGate();
    expect(gate.healthy).toBe(false);
    expect(gate.allowSend()).toBe(false);
    expect(gate.setSubscribed(true)).toBe(true);
    expect(gate.allowSend()).toBe(true);
  });

  it('holds sends while the browser reports offline, and owes a resync when it returns', () => {
    const gate = new BroadcastGate();
    gate.setSubscribed(true);
    expect(gate.setOnline(false)).toBe(false);
    expect(gate.allowSend()).toBe(false);
    expect(gate.allowSend()).toBe(false);
    expect(gate.setOnline(true)).toBe(true);
    expect(gate.consumeResync()).toBe(true);
    expect(gate.consumeResync()).toBe(false);
  });

  it('a failed save marks the connection unhealthy until a save lands again', () => {
    const gate = new BroadcastGate();
    gate.setSubscribed(true);
    expect(gate.recordSave(false)).toBe(false);
    expect(gate.allowSend()).toBe(false);
    expect(gate.recordSave(true)).toBe(true);
    expect(gate.consumeResync()).toBe(true);
    expect(gate.allowSend()).toBe(true);
  });

  it('losing the subscription holds sends again', () => {
    const gate = new BroadcastGate();
    gate.setSubscribed(true);
    expect(gate.allowSend()).toBe(true);
    gate.setSubscribed(false);
    expect(gate.allowSend()).toBe(false);
    expect(gate.setSubscribed(true)).toBe(true);
    expect(gate.consumeResync()).toBe(true);
  });

  it('owes no resync when nothing was held', () => {
    const gate = new BroadcastGate();
    gate.setSubscribed(true);
    expect(gate.allowSend()).toBe(true);
    gate.setOnline(false);
    expect(gate.setOnline(true)).toBe(true);
    expect(gate.consumeResync()).toBe(false);
  });

  it('starts unhealthy when the browser is already offline', () => {
    const gate = new BroadcastGate(false);
    gate.setSubscribed(true);
    expect(gate.healthy).toBe(false);
    expect(gate.allowSend()).toBe(false);
  });

  it('does not spend the owed resync while still unhealthy', () => {
    const gate = new BroadcastGate();
    gate.setSubscribed(true);
    gate.setOnline(false);
    expect(gate.allowSend()).toBe(false);
    expect(gate.consumeResync()).toBe(false);
    gate.setOnline(true);
    expect(gate.consumeResync()).toBe(true);
  });
});
