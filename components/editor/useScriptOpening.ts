import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { getAllScripts, getScript, createNewScript, type StoredScript } from '@/lib/scriptos/storage';
import { createProjectScript, latestScriptId } from '@/lib/supabase/scripts';
import { loadTitlePage, withScriptTitle, type TitlePage } from '@/lib/scriptos/titlepage';
import { loadCharacterProfiles, type CharacterProfile } from '@/lib/scriptos/bible';
import { awaitOSUser, osState } from '@/lib/os';
import { defaultScriptFormat, findFormat, loadFormats } from '@/lib/formats/formats';
import { logAuditAction } from '@/lib/supabase/audit';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;
type ProjectLike = { id: string; title: string; type?: string; settings?: { defaultScriptFormat?: string } };
type EditorView = 'write' | 'preview' | 'board' | 'outline';

// Which script the editor opens, and keeping it following the session's
// project (restructure phase 7 — moved out of the editor page unchanged).
// A script opened by link (?script=<id>) wins; otherwise the active
// project's script; otherwise the writer's latest, or a fresh one. Every
// path goes through getScript/getAllScripts, which prefer unsynced local
// edits over the server copy.
export function useScriptOpening({ currentScript, activeProject, setCurrentScript, setContent, setScripts, setTitlePage, setCharProfiles, setSessionStartWords, setActiveView, toast, toastRef }: {
  currentScript: StoredScript | null;
  activeProject: ProjectLike | null | undefined;
  setCurrentScript: Dispatch<SetStateAction<StoredScript | null>>;
  setContent: Dispatch<SetStateAction<string>>;
  setScripts: Dispatch<SetStateAction<StoredScript[]>>;
  setTitlePage: Dispatch<SetStateAction<TitlePage>>;
  setCharProfiles: Dispatch<SetStateAction<CharacterProfile[]>>;
  setSessionStartWords: Dispatch<SetStateAction<number>>;
  setActiveView: Dispatch<SetStateAction<EditorView>>;
  toast: ToastFn;
  toastRef: { current: ToastFn };
}) {
  const handleLoadScript = useCallback((script: StoredScript) => {
    setCurrentScript(script);
    setContent(script.content || '');
    loadTitlePage(script.id).then((tp) => setTitlePage(withScriptTitle(tp, script.title)));
    loadCharacterProfiles(script.id).then(setCharProfiles);
    setSessionStartWords((script.content || '').split(/\s+/).filter(Boolean).length);
    setActiveView('write');
  }, [setActiveView, setContent, setCurrentScript, setTitlePage, setCharProfiles, setSessionStartWords]);

  // Read synchronously so the project effect (which runs first) can't race it.
  const linkedScriptId = useRef<string | null>(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('script') : null);
  const projectAtLink = useRef<string | null>(null);
  const currentScriptRef = useRef<StoredScript | null>(null);
  useLayoutEffect(() => { currentScriptRef.current = currentScript; });

  /** Open a project's most recent script (creating one if it has none). */
  const openProjectScript = useCallback(async (project: ProjectLike, isCancelled: () => boolean = () => false) => {
    // A failed lookup is not "this project has no script": creating one then
    // would give the project a second, empty screenplay.
    let id: string | null;
    try { id = await latestScriptId(project.id); }
    catch (e) {
      console.error('Could not look up the project’s script:', e);
      toastRef.current('Couldn’t open this project’s script — check your connection and try again.', 'error');
      return false;
    }
    if (!id) {
      const uid = (await awaitOSUser())?.id ?? null;
      const format = findFormat(await loadFormats().catch(() => []), project.type);
      const created = await createProjectScript({ projectId: project.id, title: project.title, format: defaultScriptFormat(format, project.settings?.defaultScriptFormat), userId: uid })
        .catch((e) => { console.error('Could not start the project’s script:', e); return null; });
      id = created?.id ?? null;
      if (created && uid) logAuditAction(uid, 'script_created', 'script', created.id, { title: created.title, project_id: project.id });
    }
    if (isCancelled() || !id || currentScriptRef.current?.id === id) return false;
    // getScript prefers unsynced local edits — never open a stale server copy.
    const script = await getScript(id);
    if (isCancelled() || !script) return false;
    handleLoadScript(script);
    return true;
  }, [handleLoadScript, toastRef]);

  // Runs once: open the linked script, else the latest, else a fresh one.
  const loadScript = useEffectEvent((s: StoredScript) => handleLoadScript(s));
  const openScriptFor = useEffectEvent((p: Parameters<typeof openProjectScript>[0]) => openProjectScript(p));
  useEffect(() => {
    const init = async () => {
      const all = await getAllScripts();
      setScripts(all);
      const wanted = linkedScriptId.current;
      if (wanted) {
        const linked = await getScript(wanted);
        if (linked) { loadScript(linked); return; }
        linkedScriptId.current = null;
        toastRef.current('That script couldn’t be opened — it may have been deleted, or it isn’t shared with you.', 'error');
        const project = osState().project.active;
        if (project && (await openScriptFor(project))) return;
      }
      if (osState().project.active?.id) return; // the project effect below opens its script
      if (currentScriptRef.current) return;
      if (all.length > 0) {
        const latest = all[0];
        setCurrentScript(latest);
        setContent(latest.content || '');
        loadTitlePage(latest.id).then((tp) => setTitlePage(withScriptTitle(tp, latest.title)));
        loadCharacterProfiles(latest.id).then(setCharProfiles);
        setSessionStartWords((latest.content || '').split(/\s+/).filter(Boolean).length);
      } else {
        const fresh = await createNewScript('My First Screenplay');
        if (fresh) {
          setCurrentScript(fresh);
          setScripts([fresh]);
          setContent('');
          setSessionStartWords(0);
        } else {
          // Without a script, autosave has nothing to write to — say so rather
          // than letting the writer type into a buffer that is never saved.
          toastRef.current('Could not open a script — your writing will not be saved. Reload to try again.', 'error');
        }
      }
    };
    void init();
  }, [setScripts, setContent, setCurrentScript, setTitlePage, setCharProfiles, setSessionStartWords, toastRef]);

  // A script opened by link stays open while the session's project loads;
  // switching to a different project afterwards opens that project's script.
  const followProject = useEffectEvent(() => {
    if (!activeProject?.id) return;
    if (linkedScriptId.current) {
      if (projectAtLink.current === null || projectAtLink.current === activeProject.id) { projectAtLink.current = activeProject.id; return; }
      linkedScriptId.current = null;
    }
    if (currentScriptRef.current?.project_id === activeProject.id) return;
    let cancelled = false;
    openProjectScript(activeProject, () => cancelled)
      .then((opened) => { if (opened) toast(`Editing “${activeProject.title}” screenplay`, 'info'); })
      .catch((e) => console.error('Failed to load project script:', e));
    return () => { cancelled = true; };
  });
  useEffect(() => followProject(), [activeProject?.id]);
}
