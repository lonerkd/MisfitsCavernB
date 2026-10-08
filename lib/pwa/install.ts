// Whether, and how, to suggest installing The Cavern on this device.
// iOS has no install prompt: in Safari it's Share → Add to Home Screen
// (installed web apps get no browser chrome, the launch screens and, from
// iOS 16.4, push). Chrome and Edge offer a prompt (beforeinstallprompt).

export type InstallHint = 'ios-share' | 'prompt' | null;

export interface InstallContext {
  userAgent: string;
  /** navigator.maxTouchPoints — iPadOS reports a Mac user agent. */
  maxTouchPoints: number;
  /** Already running as the installed app (display-mode standalone, or navigator.standalone on iOS). */
  standalone: boolean;
  /** The browser handed us an install prompt to show. */
  canPrompt: boolean;
}

export function isIOS(c: Pick<InstallContext, 'userAgent' | 'maxTouchPoints'>): boolean {
  return /iPhone|iPad|iPod/.test(c.userAgent) || (/Macintosh/.test(c.userAgent) && c.maxTouchPoints > 1);
}

/** On iOS only Safari can add to the Home Screen (and, from iOS 16.4, the share sheet of other browsers — Safari is the sure route). */
function isIOSSafari(ua: string): boolean {
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
}

export function installHint(c: InstallContext): InstallHint {
  if (c.standalone) return null;
  if (isIOS(c)) return isIOSSafari(c.userAgent) ? 'ios-share' : null;
  return c.canPrompt ? 'prompt' : null;
}
