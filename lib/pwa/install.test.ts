import { describe, expect, it } from 'vitest';
import { installHint, isIOS, type InstallContext } from './install';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPOD_SAFARI = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1';
const IPHONE_FIREFOX = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15';
const IPHONE_EDGE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/129.0 Mobile/15E148 Safari/605.1.15';
const IPHONE_OPERA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 OPiOS/16.0 Mobile/15E148 Safari/9537.53';
const IPHONE_GOOGLE_APP = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/330.0 Mobile/15E148 Safari/604.1';
// An in-app web view: an iPhone UA with no "Safari" token at all.
const IPHONE_WEBVIEW = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
// iPadOS 13+ in desktop mode reports a Mac user agent; only touch points tell it apart.
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const DESKTOP_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

const ctx = (userAgent: string, more: Partial<Omit<InstallContext, 'userAgent'>> = {}): InstallContext =>
  ({ userAgent, maxTouchPoints: 5, standalone: false, canPrompt: false, ...more });

describe('isIOS', () => {
  it.each([
    ['iPhone', IPHONE_SAFARI],
    ['iPad', IPAD_SAFARI],
    ['iPod', IPOD_SAFARI],
  ])('%s is recognised by its user agent, whatever the touch points', (_name, ua) => {
    expect(isIOS({ userAgent: ua, maxTouchPoints: 0 })).toBe(true);
    expect(isIOS({ userAgent: ua, maxTouchPoints: 5 })).toBe(true);
  });

  it('a Mac user agent is iOS only with more than one touch point (iPadOS desktop mode)', () => {
    expect(isIOS({ userAgent: MAC_UA, maxTouchPoints: 0 })).toBe(false);
    expect(isIOS({ userAgent: MAC_UA, maxTouchPoints: 1 })).toBe(false); // the boundary
    expect(isIOS({ userAgent: MAC_UA, maxTouchPoints: 2 })).toBe(true);
    expect(isIOS({ userAgent: MAC_UA, maxTouchPoints: 5 })).toBe(true);
  });

  it('touch points alone never make a non-Apple device iOS', () => {
    expect(isIOS({ userAgent: ANDROID_CHROME, maxTouchPoints: 10 })).toBe(false);
    expect(isIOS({ userAgent: DESKTOP_CHROME, maxTouchPoints: 10 })).toBe(false);
    expect(isIOS({ userAgent: '', maxTouchPoints: 10 })).toBe(false);
  });
});

describe('installHint', () => {
  describe('already installed', () => {
    it.each([
      ['iPhone Safari', IPHONE_SAFARI],
      ['iPadOS as Mac', MAC_UA],
      ['Android Chrome', ANDROID_CHROME],
    ])('%s: nothing, with or without an install prompt', (_name, ua) => {
      expect(installHint(ctx(ua, { standalone: true }))).toBeNull();
      expect(installHint(ctx(ua, { standalone: true, canPrompt: true }))).toBeNull();
    });
  });

  describe('iOS', () => {
    it.each([
      ['iPhone', IPHONE_SAFARI],
      ['iPad', IPAD_SAFARI],
      ['iPod', IPOD_SAFARI],
      ['iPad that says it is a Mac', MAC_UA],
    ])('%s Safari: Share → Add to Home Screen', (_name, ua) => {
      expect(installHint(ctx(ua))).toBe('ios-share');
    });

    it('an offered install prompt does not change the Safari answer', () => {
      expect(installHint(ctx(IPHONE_SAFARI, { canPrompt: true }))).toBe('ios-share');
    });

    it.each([
      ['Chrome', IPHONE_CHROME],
      ['Firefox', IPHONE_FIREFOX],
      ['Edge', IPHONE_EDGE],
      ['Opera', IPHONE_OPERA],
      ['Google app', IPHONE_GOOGLE_APP],
    ])('%s on iOS: no hint, even with a prompt on offer', (_name, ua) => {
      expect(installHint(ctx(ua))).toBeNull();
      expect(installHint(ctx(ua, { canPrompt: true }))).toBeNull();
    });

    it('an iOS web view with no Safari token: no hint, and it never falls through to the prompt', () => {
      expect(isIOS(ctx(IPHONE_WEBVIEW))).toBe(true);
      expect(installHint(ctx(IPHONE_WEBVIEW))).toBeNull();
      expect(installHint(ctx(IPHONE_WEBVIEW, { canPrompt: true }))).toBeNull();
    });

    it('a Mac with one touch point is a Mac, not an iPad: it follows the prompt path', () => {
      expect(installHint(ctx(MAC_UA, { maxTouchPoints: 1 }))).toBeNull();
      expect(installHint(ctx(MAC_UA, { maxTouchPoints: 1, canPrompt: true }))).toBe('prompt');
    });
  });

  describe('everything else', () => {
    it.each([
      ['Android Chrome', ANDROID_CHROME],
      ['desktop Chrome', DESKTOP_CHROME],
    ])('%s: only when the browser offers its prompt', (_name, ua) => {
      expect(installHint(ctx(ua))).toBeNull();
      expect(installHint(ctx(ua, { canPrompt: true }))).toBe('prompt');
    });
  });
});
