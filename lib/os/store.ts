import { create } from 'zustand';
import { getPermissionsForRole } from './permissions';
import type { OSState, OSSession, OSProjectState } from './types';

interface OSStore extends OSState {
  setSession: (patch: Partial<OSSession>) => void;
  setProject: (patch: Partial<OSProjectState>) => void;
  resetToAnon: () => void;
}

const anonSession = (): OSSession => ({
  status: 'anon',
  user: null,
  userId: null,
  email: null,
  userRole: 'guest',
  permissions: getPermissionsForRole('guest'),
  projectAccess: {},
  error: null,
});

export const useOSStore = create<OSStore>((set) => ({
  session: { ...anonSession(), status: 'resolving' },
  project: { status: 'resolving', active: null, list: [] },
  setSession: (patch) => set((s) => ({ session: { ...s.session, ...patch } })),
  setProject: (patch) => set((s) => ({ project: { ...s.project, ...patch } })),
  resetToAnon: () =>
    set({
      session: anonSession(),
      project: { status: 'ready', active: null, list: [] },
    }),
}));

export const osState = () => useOSStore.getState();
