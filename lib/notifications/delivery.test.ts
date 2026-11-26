import { describe, it, expect } from 'vitest';
import { deliveryNote } from './delivery';

describe('deliveryNote', () => {
  it('says a notification was held for quiet hours', () => {
    expect(deliveryNote({ push_skipped: 'quiet-hours' })).toMatch(/quiet hours/);
  });
  it('says when the phone could not be reached', () => {
    expect(deliveryNote({ push_skipped: 'failed' })).toMatch(/could not be reached/);
  });
  it('is silent for a push that went out, one switched off, no devices, or nothing recorded', () => {
    expect(deliveryNote({ pushed_at: '2026-11-22T10:00:00Z' })).toBeNull();
    expect(deliveryNote({ push_skipped: 'switched-off' })).toBeNull();
    expect(deliveryNote({ push_skipped: 'no-devices' })).toBeNull();
    expect(deliveryNote({})).toBeNull();
  });
});
