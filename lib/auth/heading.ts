export type AuthMode = 'signin' | 'signup' | 'forgot';

/** The auth page's h1 follows the mode, so each of its three views has its own title. */
export function authHeading(mode: AuthMode): [string, string] {
  return mode === 'signin' ? ['WELCOME', 'BACK'] : mode === 'signup' ? ['JOIN THE', 'CAVERN'] : ['RESET', 'PASSWORD'];
}
