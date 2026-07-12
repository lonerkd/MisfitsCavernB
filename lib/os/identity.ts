import { useOSStore, osState } from './store';
import type { OSIdentity } from './types';

export function osUserId(): string | null {
  return osState().session.userId;
}

export function osUser(): OSIdentity | null {
  const s = osState().session;
  return s.userId ? { id: s.userId, email: s.email } : null;
}

export function requireUserId(): string {
  const id = osState().session.userId;
  if (!id) throw new Error('Not signed in');
  return id;
}

export function awaitOSUser(): Promise<OSIdentity | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const s = osState().session;
  if (s.status !== 'resolving') {
    return Promise.resolve(s.userId ? { id: s.userId, email: s.email } : null);
  }
  return new Promise((resolve) => {
    const unsub = useOSStore.subscribe((st) => {
      if (st.session.status !== 'resolving') {
        unsub();
        resolve(st.session.userId ? { id: st.session.userId, email: st.session.email } : null);
      }
    });
  });
}
