export type AuthMode = 'signin' | 'signup' | 'forgot';

/**
 * The auth page's h1 follows the mode, so each of its three views has its own
 * title. Sign-up's is the owner's call (Nov 26, 2026): he crossed out JOIN THE
 * and wrote WELCOME beside it — the lower line, CAVERN, stays.
 */
export function authHeading(mode: AuthMode): [string, string] {
  return mode === 'signin' ? ['WELCOME', 'BACK'] : mode === 'signup' ? ['WELCOME', 'CAVERN'] : ['RESET', 'PASSWORD'];
}
