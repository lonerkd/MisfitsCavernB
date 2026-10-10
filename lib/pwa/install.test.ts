import { describe, expect, it } from 'vitest';
import { installHint, isIOS } from './install';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1';
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';

const ctx = (userAgent: string, more: Partial<{ maxTouchPoints: number; standalone: boolean; canPrompt: boolean }> = {}) =>
  ({ userAgent, maxTouchPoints: 5, standalone: false, canPrompt: false, ...more });

describe('installHint', () => {
  it('iPhone Safari: Share → Add to Home Screen', () => {
    expect(installHint(ctx(IPHONE_SAFARI))).toBe('ios-share');
  });
  it('an iPad that says it is a Mac is still iOS', () => {
    expect(isIOS(ctx(IPAD_AS_MAC))).toBe(true);
    expect(isIOS(ctx(IPAD_AS_MAC, { maxTouchPoints: 0 }))).toBe(false); // a real Mac
    expect(installHint(ctx(IPAD_AS_MAC))).toBe('ios-share');
  });
  it('other iOS browsers: no hint (Safari is the sure route)', () => {
    expect(installHint(ctx(IPHONE_CHROME))).toBeNull();
  });
  it('Chrome on Android: only when the browser offers its prompt', () => {
    expect(installHint(ctx(ANDROID_CHROME))).toBeNull();
    expect(installHint(ctx(ANDROID_CHROME, { canPrompt: true }))).toBe('prompt');
  });
  it('already installed: nothing', () => {
    expect(installHint(ctx(IPHONE_SAFARI, { standalone: true }))).toBeNull();
    expect(installHint(ctx(ANDROID_CHROME, { standalone: true, canPrompt: true }))).toBeNull();
  });
});
