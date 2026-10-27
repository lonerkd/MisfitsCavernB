import { describe, it, expect } from 'vitest';
import { useOSStore, osState } from './store';

describe('useOSStore initial state', () => {
  it('starts resolving with an anonymous session and an empty ready-to-resolve project', () => {
    const { session, project } = useOSStore.getState();
    expect(session).toMatchObject({
      status: 'resolving',
      user: null,
      userId: null,
      email: null,
      isAdmin: false,
      error: null,
    });
    expect(project).toMatchObject({ status: 'resolving', active: null, list: [] });
  });

  it('osState() returns the current store state', () => {
    expect(osState()).toBe(useOSStore.getState());
    expect(osState().session.status).toBe('resolving');
  });
});

describe('setSession', () => {
  it('patches the session while preserving untouched fields', () => {
    useOSStore.getState().setSession({ status: 'authed', userId: 'u-1', isAdmin: true });
    const { session } = useOSStore.getState();
    expect(session.status).toBe('authed');
    expect(session.userId).toBe('u-1');
    expect(session.isAdmin).toBe(true);
    // Untouched fields carry over from the previous state rather than resetting.
    expect(session.email).toBeNull();
    expect(session.error).toBeNull();
  });
});

describe('setProject', () => {
  it('patches the project while preserving untouched fields', () => {
    const fakeProject = { id: 'p-1', title: 'My Project', status: 'active' } as never;
    useOSStore.getState().setProject({ status: 'ready', active: fakeProject, list: [fakeProject] });
    const { project } = useOSStore.getState();
    expect(project.status).toBe('ready');
    expect(project.active).toBe(fakeProject);
    expect(project.list).toEqual([fakeProject]);
  });
});
