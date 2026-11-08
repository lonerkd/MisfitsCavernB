import { describe, expect, it } from 'vitest';
import { compareToBaseline, metrics, normRoute } from '../../scripts/mobile-audit-ratchet.mjs';

const view = { wide: 0, small: 1, tiny: 0, underBar: 2, sideways: 0, keyboardHidesField: 0, keyboardHidesAction: 0, error: 0 };

describe('the phone audit ratchet', () => {
  it('passes when nothing is worse, and counts the views that got better', () => {
    expect(compareToBaseline({ 'portrait /a': view }, { 'portrait /a': view })).toEqual({ worse: [], better: 0 });
    expect(compareToBaseline({ 'portrait /a': { ...view, small: 0 } }, { 'portrait /a': view })).toEqual({ worse: [], better: 1 });
  });
  it('fails on a number above its baseline, naming the view and the number', () => {
    const { worse } = compareToBaseline({ 'portrait /a': { ...view, small: 3 } }, { 'portrait /a': view });
    expect(worse).toEqual(['portrait /a: small 3 (allowed 1)']);
  });
  it('allows a new view nothing, so a page that arrives broken fails', () => {
    expect(compareToBaseline({ 'portrait /new': { ...view, sideways: 1 } }, {}).worse).toEqual(['portrait /new: small 1 (allowed 0)', 'portrait /new: underBar 2 (allowed 0)', 'portrait /new: sideways 1 (allowed 0)']);
  });
  it('turns a measured route into the numbers it holds', () => {
    expect(metrics({ counts: { wide: 1, small: 2, tiny: 3, hiddenUnderBar: 4 }, scrollsSideways: true, keyboard: { focused: true, inView: false, actionInView: false } }))
      .toEqual({ wide: 1, small: 2, tiny: 3, underBar: 4, sideways: 1, keyboardHidesField: 1, keyboardHidesAction: 1, error: 0 });
    expect(metrics({ error: 'timeout' }).error).toBe(1);
  });
  it('keys a route by its shape, not by the ids a run happens to create', () => {
    expect(normRoute('/studio?project=31f9de9a-af18-43aa-b1cb-142d4396a2f2&tab=scenes')).toBe('/studio?project=<id>&tab=scenes');
  });
});
