'use client';

import React, { useCallback, useDeferredValue, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Save, Download, FileText, Plus, ChevronDown, Loader, Wand2,
  Book, Clock, Users, AlertCircle, FileUp, Settings, HelpCircle, History,
  Maximize, Minimize, LayoutDashboard, Type, List, Target, Play, Pause,
  Tags, Bookmark, MessageSquare, SplitSquareHorizontal, Edit3,
  Search, Replace, X, BarChart3, Lock, ClipboardList, Archive
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { parseScript } from '@/lib/scriptos/parser';
import { saveScript, getAllScripts, getScript, createNewScript, type StoredScript } from '@/lib/scriptos/storage';
import { useScriptImport, useScriptExport } from '@/components/editor/useScriptFiles';
import { toggleDualCaret } from '@/lib/scriptos/dual';
import { scenePositions as positionsOfScenes, reorderScenes as moveScene, filterScenes, sceneWordCounts as countSceneWords, sceneCharacters as speakersByScene, sceneAtCaret, stepScene, actStructure as actsFromWords } from '@/lib/scriptos/sceneviews';
import { insertSnippet, acceptCompletion, wrapInParens, enterInHeading, cycleLine, suggestionsAt } from '@/lib/scriptos/typing';
import { caretCoords } from '@/components/editor/caretCoords';
import { canonicalizeFountain } from '@/lib/scriptos/fountain-export';
import { REVISION_COLORS, getRevisions, createRevision, fetchRevisionsDB, createRevisionDB, type Revision } from '@/lib/scriptos/revisions';
import { analyzeCharacters, type CharacterStats } from '@/lib/scriptos/characters';
import { loadTitlePage, saveTitlePage, getDefaultTitlePage, type TitlePage } from '@/lib/scriptos/titlepage';
import { validateScript, type LintIssue } from '@/lib/scriptos/validator';
import { loadCharacterProfiles, saveCharacterProfiles, mergeProfiles, type CharacterProfile } from '@/lib/scriptos/bible';
import type { ScriptLine, LineType, Scene as ParsedScene } from '@/lib/scriptos/types';
import { useToast } from '@/components/ui/Toast';
import { useScriptStash } from '@/lib/scriptos/stash';
import { useScriptSync } from '@/lib/scriptos/sync';
import { useProject } from '@/lib/os';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { audioRefUrl, listAudioRefs } from '@/lib/supabase/audio';
import { createProjectScript, latestScriptId } from '@/lib/supabase/scripts';
import { useOSGate } from '@/lib/os';
import { logAuditAction } from '@/lib/supabase/audit';
import { defaultScriptFormat, findFormat, loadFormats } from '@/lib/formats/formats';
import { postToSplit, useSplitMessages } from '@/lib/split/pane';
import { timeCharacters, timeScript } from '@/lib/scriptos/timing';
import { useBriefAnswer } from '@/lib/brief';
import { useProjectProgress } from '@/lib/hooks/useProjectProgress';
import { toolState, type ToolId } from '@/lib/os/progress';
import { usePillStage } from '@/lib/os/PillContext';
import { FindReplaceBar, ShortcutsModal, GoToSceneModal } from '@/components/editor/EditorModals';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { BoardView, OutlineView, StatsView } from '@/components/editor/EditorCenterViews';
import { TYPE_COLORS } from '@/components/editor/editorConstants';
import { CARD_COLORS, getSceneType, sceneTypeColor } from '@/lib/scriptos/sceneVisuals';
import { EditorRightPanels, type RightPanelTab } from '@/components/editor/EditorSidePanels';
import { useEditUndo } from '@/components/editor/useEditUndo';
import { useScriptAnnotations } from '@/components/editor/useScriptAnnotations';
import { useScriptCasting } from '@/components/editor/useScriptCasting';
import { useFindReplace } from '@/components/editor/useFindReplace';
import { useTableRead } from '@/components/editor/useTableRead';
import { SceneReferencesPanel } from '@/components/editor/SceneReferencesPanel';
import { useEditorScenes } from '@/components/editor/useEditorScenes';
import { useEditorBreakdown } from '@/components/editor/breakdown/useEditorBreakdown';
import { BreakdownPanel } from '@/components/editor/breakdown/BreakdownPanel';
import { EditorLeftNav } from '@/components/editor/EditorLeftNav';

// The revision diff (and its diff library) loads the first time it's opened.
const DiffModal = dynamic(() => import('@/components/editor/DiffModal').then((m) => m.DiffModal), { ssr: false });
import { EditorErrorBoundary } from '@/components/editor/EditorErrorBoundary';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { WriteView } from '@/components/editor/WriteView';
import { WriteFooter } from '@/components/editor/WriteFooter';
import { SyncStatusChip } from '@/components/editor/SyncStatusChip';
import { PreviewView } from '@/components/editor/PreviewView';
import type { EditorCtx } from '@/components/editor/editorCtx';
import { useLineCutNotes } from '@/components/editor/useLineCutNotes';
import { placeLineNotes } from '@/lib/studio/cutlines';
import { sceneGutter } from '@/lib/film/gutter';
import { contextFromProject } from '@/lib/scriptos/context';
import { NotCharacterButton, RejectedNames } from '@/components/editor/ReadingCorrections';
import { DoubtfulReads } from '@/components/editor/DoubtfulReads';
import { doubtfulReads } from '@/lib/scriptos/review';
import { cueCard } from '@/lib/film/cue';
import { cueName } from '@/lib/film/sides';
import { typedWords, useWritingLoop } from '@/lib/writing';
import { WritingLoopPanel, useSprint } from '@/components/editor/WritingLoop';
import { useCharacters, useReadingCorrections, useSceneStates, useShootDays, type LineCutNote } from '@/lib/studio';

import { awaitOSUser, osState } from '@/lib/os';

import {
  PRINT_COLORS, TEMPLATES, PLACEHOLDER, TRANSITIONS, ELEMENT_STATUS,
  TAB_TYPE_CYCLE, stripLineDecoration, toSentenceCase,
  transformLineForType, LinePreview,
} from '@/components/editor/editorPageParts';

export default function EditorPage() {
  const { user: sessionUser } = useOSGate();
  const { activeProject } = useProject();
  const { playUri } = useSpotify();

  const [projectAudioRefs, setProjectAudioRefs] = useState<any[]>([]);

  useEffect(() => {
    if (activeProject?.id) {
      // The writing-room soundtrack is a nicety: without it the editor works the same.
      listAudioRefs(activeProject.id).then(setProjectAudioRefs, () => setProjectAudioRefs([]));
    }
  }, [activeProject?.id]);

  const playAudioRef = useCallback((ref: any) => {
    if (ref.reference_type === 'spotify') playUri(ref.uri);
    else if (ref.reference_type === 'custom_upload') {
      const url = audioRefUrl(ref.uri);
      new Audio(url).play();
    }
  }, [playUri]);

  const { toast } = useToast();
  // Latest toast for the run-once init effect, without re-running it.
  const toastRef = useRef(toast);
  useLayoutEffect(() => { toastRef.current = toast; });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Tab is a formatting key in the script. Escape hands it back, once, so a keyboard can leave the page.
  const tabLeavesScript = useRef(false);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');
  const [currentScript, setCurrentScript] = useState<StoredScript | null>(null);
  const { noteEdit: noteHistoryEdit, commit: commitHistory, undo, redo } = useEditUndo(currentScript?.id, content, setContent);
  const stash = useScriptStash(currentScript?.id ?? null);
  // Everything the text implies — lines, scenes, character stats, lint — worked
  // out from it. Deferred, so typing stays quick on a long script.
  const parseSource = useDeferredValue(content);
  // The cast people have chosen is what the reader knows about this project (read before the parse).
  const { castings, projectCrew, castCharacter: handleCastCharacter } = useScriptCasting(activeProject?.id);
  const corrections = useReadingCorrections(currentScript?.project_id ?? null);
  const readContext = useMemo(() => contextFromProject(Object.values(castings), corrections.rows), [castings, corrections.rows]);
  const { lines, parsedScenes, charStats, lintIssues } = useMemo(() => {
    if (!parseSource) return { lines: [] as ScriptLine[], parsedScenes: [] as ParsedScene[], charStats: [] as CharacterStats[], lintIssues: [] as LintIssue[] };
    const result = parseScript(parseSource, 'screenplay', undefined, { context: readContext });
    return {
      lines: result.lines,
      parsedScenes: result.scenes,
      charStats: analyzeCharacters(result.lines, result.scenes),
      lintIssues: validateScript(result.lines, result.scenes, result.characters),
    };
  }, [parseSource, readContext]);
  const doubts = useMemo(() => doubtfulReads(lines), [lines]);
  // The scene a line belongs to: the last heading at or above it.
  const sceneAtLine = useCallback((line: number) => {
    let ordinal = -1;
    for (let i = 0; i <= line && i < lines.length; i++) if (lines[i].type === 'slug') ordinal++;
    const heading = ordinal >= 0 ? parsedScenes[ordinal]?.heading : undefined;
    return heading ? { ordinal, heading } : null;
  }, [lines, parsedScenes]);

  const { annotations, annotationDraft, setAnnotationDraft, submitAnnotation, removeAnnotation } = useScriptAnnotations(currentScript?.id, sceneAtLine);

  // The table read follows the parse; each scene it times is stored by the scene index (built below).
  const saveReadRef = useRef<(sceneIdx: number, seconds: number) => void>(() => {});
  const { playing: tableReadPlaying, lineIdx: tableReadLineIdx, start: startTableRead, pause: pauseTableRead, resume: resumeTableRead, stop: stopTableRead } =
    useTableRead({ lines, scriptId: currentScript?.id, saveReadRef, textareaRef });

  const [scripts, setScripts] = useState<StoredScript[]>([]);

  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)');
    const apply = () => { setIsMobile(mq.matches); if (mq.matches) { setShowSidebar(false); setShowRightSidebar(false); } };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  // True while the latest save is only on this device (server unreachable);
  // storage retries it automatically. Drives the status bar + a one-time toast.
  const [syncPending, setSyncPending] = useState(false);
  const warnedUnsyncedRef = useRef(false);
  const [activeView, setActiveView] = useState<'write' | 'preview' | 'board' | 'outline' | 'stats'>('write');
  const [focusMode, setFocusMode] = useState(false);
  const [sceneFilter, setSceneFilter] = useState<'all' | 'int' | 'ext' | 'day' | 'night'>('all');

  const [revisionMode, setRevisionMode] = useState(false);

  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<string[]>([]);
  const [autocompleteIdx, setAutocompleteIdx] = useState(0);

  const [completionRange, setCompletionRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  const { open: showFindReplace, setOpen: setShowFindReplace, findText, setFindText, replaceText, setReplaceText, matchCase, setMatchCase, findCount, replaceAll: handleFindReplace, replaceOne: handleFindReplaceOne } =
    useFindReplace(content, setContent);

  const [rightPanel, setRightPanel] = useState<RightPanelTab>('write');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [showWatermark, setShowWatermark] = useState(false);

  const [titlePage, setTitlePage] = useState<TitlePage>(getDefaultTitlePage());
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [showSceneNumbers, setShowSceneNumbers] = useState(true);
  const [charProfiles, setCharProfiles] = useState<CharacterProfile[]>([]);
  const [selectedCharProfile, setSelectedCharProfile] = useState<string | null>(null);
  const [showCharBible, setShowCharBible] = useState(false);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sessionStartWords, setSessionStartWords] = useState(0);
  const [showGoToScene, setShowGoToScene] = useState(false);
  const [goToSceneNum, setGoToSceneNum] = useState('');
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [nightModePreview, setNightModePreview] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [dragSceneIdx, setDragSceneIdx] = useState<number | null>(null);
  const [dropSceneIdx, setDropSceneIdx] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffRevisionId, setDiffRevisionId] = useState<string | null>(null);
  const [cursorLine, setCursorLine] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isSyncing, lastSyncedAt, collaborators, conflict, broadcastCursor, noteLocalEdit, resolveConflict } = useScriptSync(currentScript?.id || '', content, (newContent) => {

    if (newContent !== content) {
      setContent(newContent);
    }
  });

  const handleLoadScript = useCallback((script: StoredScript) => {
    setCurrentScript(script);
    setContent(script.content || '');
    loadTitlePage(script.id).then(setTitlePage);
    loadCharacterProfiles(script.id).then(setCharProfiles);
    setSessionStartWords((script.content || '').split(/\s+/).filter(Boolean).length);
    setActiveView('write');
  }, [setActiveView]);

  // Which script opens: ?script=<id> (links from the Studio) wins; otherwise
  // the active project's script (the effect below); otherwise the writer's
  // latest. Every path goes through getScript/getAllScripts, which prefer
  // unsynced local edits over the server copy.
  // Read synchronously so the project effect (which runs first) can't race it.
  const linkedScriptId = useRef<string | null>(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('script') : null);
  const projectAtLink = useRef<string | null>(null);
  const currentScriptRef = useRef<StoredScript | null>(null);
  useLayoutEffect(() => { currentScriptRef.current = currentScript; });

  /** Open a project's most recent script (creating one if it has none). */
  const openProjectScript = useCallback(async (project: { id: string; title: string; type?: string; settings?: { defaultScriptFormat?: string } }, isCancelled: () => boolean = () => false) => {
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
  }, [handleLoadScript]);

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
        loadTitlePage(latest.id).then(setTitlePage);
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
  }, []);

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

  useEffect(() => {
    if (!currentScript) return;
    let active = true;
    (async () => {
      const remote = await fetchRevisionsDB(currentScript.id);
      if (!active) return;
      setRevisions(remote.length > 0 ? remote : await getRevisions(currentScript.id));
    })();
    return () => { active = false; };
  }, [currentScript]);

  useEffect(() => {
    if (typewriterMode && activeView === 'write' && textareaRef.current) {
      const textarea = textareaRef.current;
      const { selectionStart } = textarea;

      const lineHeight = 26;
      const linesBefore = textarea.value.substr(0, selectionStart).split('\n').length;
      const targetScroll = (linesBefore * lineHeight) - (window.innerHeight * 0.3);

      textarea.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [content, typewriterMode, activeView]);


  useEffect(() => {
    if (!currentScript) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      const saved = await saveScript({ id: currentScript.id, title: currentScript.title, content });
      setSaving(false);
      const pending = !saved || !!saved.syncPending;
      setSyncPending(pending);
      if (pending && !warnedUnsyncedRef.current) {
        warnedUnsyncedRef.current = true;
        toastRef.current("Can't reach the server — your writing is saved on this device and will sync automatically.", 'error');
      } else if (!pending) {
        warnedUnsyncedRef.current = false;
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, currentScript]);

  // The writing loop: words typed today, the streak, sprints (lib/writing).
  const writing = useWritingLoop(sessionUser?.id ?? null);
  const sprint = useSprint(writing, toast);

  const handleSave = useCallback(async () => {
    if (!currentScript) return;
    setSaving(true);
    const saved = await saveScript({ id: currentScript.id, title: currentScript.title, content });
    if (saved) {
      setCurrentScript(saved);
      setSyncPending(!!saved.syncPending);
      if (saved.syncPending) toast('Saved on this device — it will sync when the server is reachable.', 'error');
      else toast('Screenplay saved to cloud.', 'success');
    } else {
      toast('Could not save — you appear to be signed out.', 'error');
    }
    setSaving(false);
  }, [currentScript, content, toast]);

  const handleExport = useScriptExport({ currentScript, content, titlePage, toast, onDone: () => setShowFormatMenu(false) });

  const handleNormalize = useCallback(() => {
    if (!content.trim()) { toast('Nothing to format yet.', 'info'); return; }
    const normalized = canonicalizeFountain(content);
    if (normalized === content) { toast('Already in canonical Fountain form.', 'info'); return; }
    // Committed history entry so Normalize is a single click away from undo.
    commitHistory(content);
    setContent(normalized);
    toast('Formatting normalized to canonical Fountain.', 'success');
  }, [content, toast, commitHistory]);

  const handleLockRevision = useCallback(async () => {
    if (!currentScript) return;
    const rev = await createRevisionDB(currentScript.id, content, revisions.length);
    if (rev) {
      setRevisions(prev => [...prev, rev]);
      toast(`Locked as ${rev.label}`, 'success');
    } else {

      const { revision } = await createRevision(currentScript.id, content);
      setRevisions(prev => [...prev, revision]);
      toast(`Locked locally as ${revision.label}`, 'info');
    }
  }, [currentScript, content, revisions.length, toast]);

  const toggleDualDialogue = useCallback(() => {
    const editor = textareaRef.current;
    if (!editor) return;
    const toggled = toggleDualCaret(content, editor.selectionStart);
    if (!toggled) { toast('Put the cursor on a character name to toggle dual dialogue', 'info'); return; }
    setContent(toggled.next);
    toast(toggled.added ? 'Marked as dual dialogue (^)' : 'Dual dialogue removed', 'success');
  }, [content, toast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (focusMode) setFocusMode(false);
        if (showFindReplace) setShowFindReplace(false);
        if (showFormatMenu) setShowFormatMenu(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setFocusMode(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setShowGoToScene(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (showGoToScene) setShowGoToScene(false);
        if (showShortcuts) setShowShortcuts(false);
      }

      if (document.activeElement === textareaRef.current && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (document.activeElement === textareaRef.current && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, focusMode, showFindReplace, setShowFindReplace, showFormatMenu, showGoToScene, showShortcuts, undo, redo]);

  const handleImportFile = useScriptImport({ setScripts, setCurrentScript, setContent, toast });

  const handleTitlePageChange = useCallback((field: keyof TitlePage, value: string) => {
    setTitlePage(prev => {
      const updated = { ...prev, [field]: value };
      if (currentScript) saveTitlePage(currentScript.id, updated);
      return updated;
    });
  }, [currentScript]);

  // Where the caret goes after an edit: the textarea is controlled, so set it once React has rendered.
  const placeCaret = (editor: HTMLTextAreaElement, caret: number) => {
    setTimeout(() => { editor.focus(); editor.setSelectionRange(caret, caret); }, 0);
  };

  const insertElement = (type: string) => {
    const editor = textareaRef.current;
    if (!editor) return;
    const edit = insertSnippet(content, editor.selectionStart, editor.selectionEnd, type);
    setContent(edit.next);
    placeCaret(editor, edit.caret);
  };

  const acceptAutocomplete = (item: string) => {
    const editor = textareaRef.current;
    if (!editor) return;
    const edit = acceptCompletion(content, completionRange, item);
    setContent(edit.next);
    setShowAutocomplete(false);
    placeCaret(editor, edit.caret);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && tabLeavesScript.current) { tabLeavesScript.current = false; return; }
    tabLeavesScript.current = e.key === 'Escape' && !showAutocomplete;
    if (showAutocomplete && autocompleteItems.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAutocompleteIdx(i => (i + 1) % autocompleteItems.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setAutocompleteIdx(i => (i - 1 + autocompleteItems.length) % autocompleteItems.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptAutocomplete(autocompleteItems[autocompleteIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setShowAutocomplete(false); return; }
    }

    const editor = textareaRef.current;
    if (e.key === '(' && editor) {
      e.preventDefault();
      const edit = wrapInParens(content, editor.selectionStart, editor.selectionEnd);
      setContent(edit.next);
      placeCaret(editor, edit.caret);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && editor && editor.selectionStart === editor.selectionEnd) {
      const edit = enterInHeading(content, editor.selectionStart);
      if (edit) {
        e.preventDefault();
        setContent(edit.next);
        placeCaret(editor, edit.caret);
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (!editor) return;
      const cursor = editor.selectionStart;
      const lineIdx = content.substring(0, content.lastIndexOf('\n', cursor - 1) + 1).split('\n').length - 1;
      const edit = cycleLine(content, cursor, lines[lineIdx]?.type, e.shiftKey, TAB_TYPE_CYCLE, transformLineForType);
      if (edit === 'empty') { insertElement('scene'); return; }
      setContent(edit.next);
      placeCaret(editor, edit.caret);
    }
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const typed = typedWords(content, val);
    if (typed) { writing.add(typed); sprint.onType(typed); }
    noteHistoryEdit(content);
    setContent(val);
    setCursorLine(val.substring(0, e.target.selectionStart).split('\n').length - 1);
    noteLocalEdit();
    broadcastCursor(e.target.selectionStart);

    const ta = e.target;
    const found = suggestionsAt(val, ta.selectionStart, {
      slugs: lines.filter(l => l.type === 'slug').map(l => l.text),
      characters: chars,
      transitions: TRANSITIONS,
    });
    if (found) {
      setAutocompleteItems(found.items);
      setAutocompleteIdx(0);
      setCompletionRange({ start: found.start, end: found.end });
      setCursorPos(caretCoords(ta, found.end));
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  };

  // Scene index, notes and colours (public.scenes for project scripts; this
  // device for personal ones) — see components/editor/useEditorScenes.
  const sceneIndex = useEditorScenes(currentScript, parsedScenes, (msg) => toastRef.current(msg, 'error'));
  useLayoutEffect(() => { saveReadRef.current = sceneIndex.saveRead; });
  const timing = useMemo(() => timeScript(lines, sceneIndex.reads), [lines, sceneIndex.reads]);
  const targetRuntime = useBriefAnswer(currentScript?.project_id, 'target_runtime');
  const editorProgress = useProjectProgress(currentScript?.project_id ?? null);
  const characterTiming = useMemo(() => timeCharacters(lines), [lines]);

  // Breakdown mode: tag what the shoot needs right in the script.
  const sceneIds = useMemo(() => sceneIndex.rows.map((r) => r?.id ?? null), [sceneIndex.rows]);
  const sceneCharacters = useMemo(() => parsedScenes.map((sc) => sc.characters ?? []), [parsedScenes]);
  const bd = useEditorBreakdown({
    projectId: currentScript?.project_id ?? null,
    lines, sceneIds, characters: sceneCharacters,
    onError: (msg) => toastRef.current(msg, 'error'),
  });
  const [openElementId, setOpenElementId] = useState<string | null>(null);
  const openBreakdown = useCallback((elementId?: string | null) => {
    setShowRightSidebar(true);
    setRightPanel('breakdown');
    if (elementId !== undefined) setOpenElementId(elementId);
  }, []);

  const scenesList = useMemo(() => lines.filter(l => l.type === 'slug'), [lines]);

  const scenePositions = useMemo(() => positionsOfScenes(scenesList, content), [scenesList, content]);

  const jumpToScene = (sceneIndex: number) => {
    setActiveView('write');
    setTimeout(() => {
      const textarea = textareaRef.current;
      const idx = scenePositions[sceneIndex];
      if (!textarea || idx == null || idx < 0) return;
      textarea.focus();
      textarea.setSelectionRange(idx, idx);
      const linesBefore = content.substring(0, idx).split('\n').length;
      setCursorLine(linesBefore);
      const lh = parseFloat(window.getComputedStyle(textarea).lineHeight || '28') || 28;
      textarea.scrollTop = Math.max(0, (linesBefore - 3) * lh);
    }, 60);
  };

  const reorderScenes = (from: number, to: number) => {
    const next = moveScene(content, scenePositions, from, to);
    if (next !== null) setContent(next);
  };
  const filteredScenes = useMemo(() => filterScenes(scenesList, sceneFilter), [scenesList, sceneFilter]);
  const chars = [...new Set(lines.filter(l => l.type === 'character').map(l => l.text.trim()))];
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const pageEst = Math.max(1, Math.round(timing.pages));
  const dialogueLines = lines.filter(l => l.type === 'dialogue').length;
  const actionLines = lines.filter(l => l.type === 'action').length;
  const dialogueRatio = actionLines + dialogueLines > 0 ? Math.round((dialogueLines / (actionLines + dialogueLines)) * 100) : 0;

  const sceneWordCounts = useMemo(() => countSceneWords(lines, scenesList), [lines, scenesList]);

  const sessionWordsWritten = Math.max(0, wordCount - sessionStartWords);

  const sceneCharMap = useMemo(() => speakersByScene(lines, scenesList), [lines, scenesList]);

  const currentSceneIdx = useMemo(() => sceneAtCaret(lines, scenesList, cursorLine), [lines, scenesList, cursorLine]);

  // ── Split screen: the other pane follows the caret's scene; the Studio can
  // send the script to a scene (in a split, or by ?scene=<id> on the URL).
  useEffect(() => {
    const scriptId = currentScript?.id;
    if (!scriptId) return;
    const t = setTimeout(() => postToSplit({ type: 'scene', scriptId, sceneId: sceneIds[currentSceneIdx] ?? null }), 250);
    return () => clearTimeout(t);
  }, [currentScript?.id, currentSceneIdx, sceneIds]);
  const jumpRef = useRef(jumpToScene);
  useLayoutEffect(() => { jumpRef.current = jumpToScene; });

  // Ctrl/⌘ + ↓ / ↑ walks the script scene by scene from wherever the caret is,
  // stopping at the first and last scene (never wrapping). An effect event so
  // the listener is bound once and still reads the current scene.
  const stepToScene = useEffectEvent((direction: -1 | 1) => {
    const next = stepScene(currentSceneIdx, scenesList.length, direction);
    if (next !== null) jumpToScene(next);
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      stepToScene(e.key === 'ArrowDown' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // A cut note to open once its line is placed (?note=, or from the Studio pane).
  const [pendingNote, setPendingNote] = useState<string | null>(() => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('note') : null));
  useSplitMessages((msg) => {
    if (msg.type !== 'open-scene' || msg.scriptId !== currentScript?.id) return;
    const idx = sceneIds.indexOf(msg.sceneId);
    if (idx >= 0) jumpRef.current(idx);
    if (msg.noteId) setPendingNote(msg.noteId);
  });
  const sceneParam = useRef<string | null>(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('scene') : null);
  useEffect(() => {
    const want = sceneParam.current;
    if (!want || !currentScript?.id) return;
    const idx = sceneIds.indexOf(want);
    if (idx < 0) return;
    sceneParam.current = null;
    jumpRef.current(idx);
  }, [currentScript?.id, sceneIds]);

  // Cut notes (Studio › Post) pinned to lines, shown in the margin.
  const lineCutNotes = useLineCutNotes(currentScript?.project_id ?? null);
  const cutNotesByLine = useMemo(
    () => placeLineNotes(lineCutNotes.notes, parsedScenes.map((sc, i) => ({ id: sceneIndex.rows[i]?.id ?? null, start: sc.startIndex })), lines.map((l) => l.text)),
    [lineCutNotes.notes, parsedScenes, sceneIndex.rows, lines],
  );
  // When in the story each scene is, and its shoot day: the left margin.
  const shootDays = useShootDays(currentScript?.project_id ?? null);
  const datedDays = useMemo(() => new Set(shootDays.rows.filter((d) => d.shoot_date).map((d) => d.day_number)), [shootDays.rows]);
  // The character whose cue the caret is on: who plays them, their look in this scene.
  const projectCharacters = useCharacters(currentScript?.project_id ?? null);
  const sceneStates = useSceneStates(currentScript?.project_id ?? null);
  const cue = useMemo(() => {
    const l = lines[cursorLine];
    if (!l || l.type !== 'character') return { card: null, line: cursorLine };
    const name = cueName(l.text);
    return {
      line: cursorLine,
      card: cueCard({
        cue: l.text, sceneId: sceneIndex.rows[currentSceneIdx]?.id ?? null, actor: castings[name]?.username,
        stats: charStats.find((cs) => cs.name.toUpperCase() === name), characters: projectCharacters.rows, states: sceneStates.rows,
      }),
    };
  }, [lines, cursorLine, sceneIndex.rows, currentSceneIdx, castings, charStats, projectCharacters.rows, sceneStates.rows]);
  const gutter = useMemo(() => sceneGutter(parsedScenes, sceneIndex.rows, datedDays), [parsedScenes, sceneIndex.rows, datedDays]);
  const [cutNoteLine, setCutNoteLine] = useState<number | null>(null);
  const { setResolved: setCutNoteResolved } = lineCutNotes;
  const cutNoteUserId = sessionUser?.id;
  const resolveCutNote = useCallback(async (note: LineCutNote, resolved: boolean) => {
    if (!cutNoteUserId) return;
    try { await setCutNoteResolved(note, cutNoteUserId, resolved); }
    catch (e) { toastRef.current(e instanceof Error ? e.message : 'Could not update the note', 'error'); }
  }, [cutNoteUserId, setCutNoteResolved]);
  // "In script" on a cut note (?note=, or from the Studio pane): go to its line and open it.
  const pendingNoteLine = useMemo(() => {
    if (!pendingNote) return null;
    const hit = [...cutNotesByLine.entries()].find(([, placed]) => placed.some((p) => p.note.id === pendingNote));
    return hit ? hit[0] : null;
  }, [pendingNote, cutNotesByLine]);
  const [jumpLine, setJumpLine] = useState<number | null>(null);
  if (pendingNoteLine != null) {
    setPendingNote(null);
    setActiveView('write');
    setJumpLine(pendingNoteLine);
  }
  const jumpToNoteLine = useEffectEvent((line: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const at = content.split('\n').slice(0, line).reduce((n, l) => n + l.length + 1, 0);
    ta.focus();
    ta.setSelectionRange(at, at);
    setCursorLine(line);
    const lh = parseFloat(window.getComputedStyle(ta).lineHeight || '28') || 28;
    ta.scrollTop = Math.max(0, (line - 3) * lh);
    setCutNoteLine(line);
  });
  useEffect(() => {
    if (jumpLine == null) return;
    // Once the write view is on screen.
    const t = window.setTimeout(() => { setJumpLine(null); jumpToNoteLine(jumpLine); }, 120);
    return () => window.clearTimeout(t);
  }, [jumpLine]);

  // ── Publish the editor's live state to the Pill ────────────────────────────

  usePillStage(
    {
      module: 'editor',
      title: currentScript?.title || 'Untitled',
      fields: [
        { label: 'Scene', value: scenesList.length ? `${Math.max(0, currentSceneIdx) + 1} / ${scenesList.length}` : '—', color: 'var(--accent)' },
        { label: 'Words', value: wordCount.toLocaleString(), color: 'var(--violet)' },
        { label: 'Pages', value: `${pageEst}` },
        { label: 'Save', value: saving ? 'Saving…' : syncPending ? 'On device — syncing' : 'Saved', color: saving || syncPending ? 'var(--warn)' : 'var(--ok)' },
      ],
      toggles: [
        { id: 'focus', label: 'Focus', active: focusMode, onToggle: () => setFocusMode(v => !v) },
      ],
      actions: [
        { id: 'find', label: 'Find & replace', onClick: () => setShowFindReplace(true) },
      ],
    }
  );

  const actStructure = useMemo(() => actsFromWords(sceneWordCounts), [sceneWordCounts]);

  const uniqueLocations = useMemo(() => {
    const locs = new Map<string, number>();
    scenesList.forEach(s => {
      const match = s.text.toUpperCase().match(/(?:INT\.|EXT\.|INT\/EXT\.)\s*(.+?)(?:\s*-\s*|$)/);
      const loc = match ? match[1].trim() : s.text.trim();
      locs.set(loc, (locs.get(loc) || 0) + 1);
    });
    return Array.from(locs.entries()).sort((a, b) => b[1] - a[1]);
  }, [scenesList]);

  const cutNotes: EditorCtx['cutNotes'] = { byLine: cutNotesByLine, openLine: cutNoteLine, setOpenLine: setCutNoteLine, resolve: resolveCutNote, canResolve: !!sessionUser?.id };
  // Tools that arrive with the project's phase (a personal script has them all).
  const scriptProjectId = currentScript?.project_id ?? null;
  const toolOpen = (id: ToolId) => !scriptProjectId || !!(editorProgress.progress && toolState(editorProgress.progress, id)?.unlocked);
  const tools = { revisions: toolOpen('revisions'), breakdown: toolOpen('breakdown') };
  const editorCtx: EditorCtx = { tools, cutNotes, gutter, cue, bd, openBreakdown, activeProject, activeView, annotationDraft, annotations, broadcastCursor, content, currentSceneIdx, currentScript, cursorLine, focusMode, handleEditorChange, handleEditorKeyDown, handleExport, handleLockRevision, handleNormalize, handleSave, highlightRef, lines, nightModePreview, pauseTableRead, removeAnnotation, resumeTableRead, revisionMode, saving, sceneWordCounts, scenesList, sessionWordsWritten, setActiveView, setAnnotationDraft, setCurrentScript, setCursorLine, setFocusMode, setRevisionMode, setShowCharBible, setShowFormatMenu, setShowRightSidebar, setShowShortcuts, setShowSidebar, showFormatMenu, showRightSidebar, showSceneNumbers, showSidebar, showWatermark, startTableRead, stopTableRead, submitAnnotation, tableReadLineIdx, tableReadPlaying, textareaRef, titlePage, toggleDualDialogue, typewriterMode };

  return (
    <div style={{ height: '100dvh', boxSizing: 'border-box', overflow: 'hidden', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column' }}>
      <h1 className="sr-only">ScriptOS{currentScript?.title ? ` — ${currentScript.title}` : ''}</h1>

      {!focusMode && (
        <EditorHeader ctx={editorCtx} />
      )}

      <AnimatePresence>
        {showFindReplace && (
          <FindReplaceBar
            findText={findText} setFindText={setFindText}
            replaceText={replaceText} setReplaceText={setReplaceText}
            matchCase={matchCase} setMatchCase={setMatchCase}
            findCount={findCount}
            onReplaceOne={handleFindReplaceOne}
            onReplaceAll={handleFindReplace}
            onClose={() => setShowFindReplace(false)}
          />
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

        {isMobile && (showSidebar || showRightSidebar) && !focusMode && (
          <div onClick={() => { setShowSidebar(false); setShowRightSidebar(false); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55 }} />
        )}

        <AnimatePresence>
          {showSidebar && !focusMode && (
            <motion.div
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: 248,
                background: 'var(--surface)',
                borderRight: '1px solid rgba(var(--ink-rgb), 0.05)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
                ...(isMobile ? { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 60, boxShadow: '20px 0 60px rgba(0,0,0,0.6)' } : {}),
              }}
            >
              <EditorLeftNav
                scripts={scripts} setScripts={setScripts} createNewScript={createNewScript}
                setCurrentScript={setCurrentScript} setContent={setContent} toast={toast}
                fileInputRef={fileInputRef} handleImportFile={handleImportFile}
                showTitleEditor={showTitleEditor} setShowTitleEditor={setShowTitleEditor}
                templates={TEMPLATES}
                scenesList={scenesList} sceneWordCounts={sceneWordCounts} currentSceneIdx={currentSceneIdx}
                sceneTypeColor={sceneTypeColor} getSceneType={getSceneType} sceneCharMap={sceneCharMap}
                actStructure={actStructure}
                jumpToScene={jumpToScene} reorderScenes={reorderScenes}
                dragSceneIdx={dragSceneIdx} setDragSceneIdx={setDragSceneIdx}
                dropSceneIdx={dropSceneIdx} setDropSceneIdx={setDropSceneIdx}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The island floats over the page column alone, so only it makes room; the panels either side run to the foot of the screen. */}
        <div className="mc-editor-center" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box', paddingBottom: 'var(--taskbar-height, 0px)', background: focusMode ? '#000' : '#050505', position: 'relative' }}>

          {focusMode && (
            <button aria-label="Minimize" onClick={() => setFocusMode(false)} style={{
              position: 'absolute', top: 20, right: 20, zIndex: 100,
              background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer'
            }}>
              <Minimize size={20} />
            </button>
          )}

                    {activeView === 'write' && <WriteView ctx={editorCtx} />}

                    {/* The beat timeline hugs the screen's left edge — only when the story map isn't open there already. */}
                    {activeView === 'write' && !focusMode && !showSidebar && <WriteFooter ctx={editorCtx} />}

                    {activeView === 'preview' && <PreviewView ctx={editorCtx} />}

          {activeView === 'board' && (
            <BoardView
              scenesList={scenesList} lines={lines} sceneColors={sceneIndex.colors} sceneNotes={sceneIndex.notes}
              sceneWordCounts={sceneWordCounts} dragSceneIdx={dragSceneIdx} setDragSceneIdx={setDragSceneIdx}
              dropSceneIdx={dropSceneIdx} setDropSceneIdx={setDropSceneIdx} jumpToScene={jumpToScene}
              setSceneNote={sceneIndex.setNote} reorderScenes={reorderScenes}
            />
          )}

          {activeView === 'outline' && (
            <OutlineView
              sceneFilter={sceneFilter} setSceneFilter={setSceneFilter} filteredScenes={filteredScenes}
              scenesList={scenesList} lines={lines} sceneColors={sceneIndex.colors} sceneNotes={sceneIndex.notes}
              jumpToScene={jumpToScene} tagScene={sceneIndex.tag}
            />
          )}

          {activeView === 'stats' && (
            <StatsView
              currentScriptTitle={currentScript?.title} wordCount={wordCount} pageEst={pageEst}
              scenesList={scenesList} uniqueLocations={uniqueLocations} chars={chars} charStats={charStats}
              dialogueRatio={dialogueRatio} sceneWordCounts={sceneWordCounts} actStructure={actStructure}
              sceneCharMap={sceneCharMap} currentSceneIdx={currentSceneIdx} lintIssues={lintIssues}
              timing={timing} characterTiming={characterTiming}
              onJumpToScene={jumpToScene}
              onReadFromScene={(i) => { const at = timing.scenes[i]?.start; if (at != null) { jumpToScene(i); startTableRead(at); } }}
              targetMinutes={typeof targetRuntime === 'number' ? targetRuntime : null}
              briefHref={currentScript?.project_id ? `/projects/${currentScript.project_id}#brief` : undefined}
            />
          )}
        </div>

        <AnimatePresence>
          {showRightSidebar && !focusMode && (
            <motion.div
              initial={{ x: 272, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 272, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: 272, maxWidth: '86vw', background: 'var(--surface)', borderLeft: '1px solid rgba(var(--ink-rgb), 0.05)', display: 'flex', flexDirection: 'column', overflowY: 'hidden', ...(isMobile ? { position: 'absolute', top: 0, bottom: 0, right: 0, zIndex: 60, boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' } : {}) }}
            >
              <EditorErrorBoundary onCrash={() => {
                try { localStorage.setItem(`mc_crash_backup_${currentScript?.id || 'draft'}`, content); } catch {}
              }}>
                <EditorRightPanels
                  showBreakdown={tools.breakdown}
                  currentStory={gutter.find((g) => g.line === parsedScenes[currentSceneIdx]?.startIndex) ?? null}
                  rightPanel={rightPanel} setRightPanel={setRightPanel}
                  activeView={activeView} currentSceneIdx={currentSceneIdx} scenesList={scenesList}
                  getSceneType={getSceneType} sceneTypeColor={sceneTypeColor}
                  sceneWordCounts={sceneWordCounts} sceneCharMap={sceneCharMap}
                  insertElement={insertElement}
                  writingPanel={<WritingLoopPanel loop={writing} sprint={sprint} toast={toast} />}
                  wordCount={wordCount}
                  pageEst={pageEst} dialogueRatio={dialogueRatio}
                  typewriterMode={typewriterMode} setTypewriterMode={setTypewriterMode}
                  nightModePreview={nightModePreview} setNightModePreview={setNightModePreview}
                  chars={chars} charStats={charStats}
                  handleLockRevision={handleLockRevision} revisions={revisions}
                  onViewRevision={(revisionId) => { setDiffRevisionId(revisionId); setShowDiff(true); }}
                  setContent={setContent} toast={toast}
                  showSceneNumbers={showSceneNumbers} setShowSceneNumbers={setShowSceneNumbers}
                  showWatermark={showWatermark} setShowWatermark={setShowWatermark}
                  lintIssues={lintIssues}
                  stash={stash} textareaRef={textareaRef}
                  currentScript={currentScript}
                  projectAudioRefs={projectAudioRefs}
                  playAudioRef={playAudioRef}
                  readingPanel={<DoubtfulReads doubts={doubts} projectId={currentScript?.project_id ?? null} onSaved={corrections.upsertLocal} />}
                  breakdownPanel={
                    <BreakdownPanel
                      bd={bd}
                      projectId={currentScript?.project_id ?? null}
                      sceneIdx={currentSceneIdx}
                      heading={currentSceneIdx >= 0 ? parsedScenes[currentSceneIdx]?.heading ?? null : null}
                      speakingCast={currentSceneIdx >= 0 ? parsedScenes[currentSceneIdx]?.characters ?? [] : []}
                      crew={projectCrew.filter((m) => m.status !== 'declined').map((m) => ({ user_id: m.user_id, username: m.username || 'Crew' }))}
                      openElementId={openElementId}
                      setOpenElementId={setOpenElementId}
                      onJumpToScene={jumpToScene}
                    />
                  }
                  referencesPanel={
                    <SceneReferencesPanel
                      projectId={currentScript?.project_id ?? null}
                      userId={sessionUser?.id ?? null}
                      sceneNumber={currentSceneIdx >= 0 ? currentSceneIdx + 1 : null}
                      heading={currentSceneIdx >= 0 ? parsedScenes[currentSceneIdx]?.heading ?? null : null}
                      row={currentSceneIdx >= 0 ? sceneIndex.rows[currentSceneIdx] ?? null : null}
                      note={currentSceneIdx >= 0 ? sceneIndex.notes[currentSceneIdx] ?? '' : ''}
                      color={currentSceneIdx >= 0 ? sceneIndex.colors[currentSceneIdx] ?? null : null}
                      onNote={(note) => sceneIndex.setNote(currentSceneIdx, note)}
                      onTag={(color) => sceneIndex.tag(currentSceneIdx, color)}
                      syncState={sceneIndex.sync.state}
                    />
                  }
                />
              </EditorErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {showDiff && <DiffModal
        isOpen={showDiff}
        onClose={() => { setShowDiff(false); setDiffRevisionId(null); }}
        originalText={revisions.find(r => r.id === diffRevisionId)?.snapshot ?? ''}
        modifiedText={content}
        label={revisions.find(r => r.id === diffRevisionId)?.label ?? 'Revision'}
      />}

      {showAutocomplete && autocompleteItems.length > 0 && (
        <div style={{
          position: 'fixed', top: cursorPos.top, left: cursorPos.left,
          background: 'var(--bg-3)', border: '1px solid rgba(var(--ink-rgb), 0.12)',
          borderRadius: 8, padding: 4, zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          maxHeight: 200, overflowY: 'auto', minWidth: 160
        }}>
          {autocompleteItems.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => { e.preventDefault(); acceptAutocomplete(item); }}
              onMouseEnter={() => setAutocompleteIdx(idx)}
              style={{ padding: '6px 12px', fontSize: 12, color: idx === autocompleteIdx ? 'var(--fg-strong)' : 'var(--fg-muted)', background: idx === autocompleteIdx ? 'rgba(var(--ink-rgb), 0.08)' : 'transparent', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--script)', letterSpacing: 0.5 }}
            >
              {item}
            </div>
          ))}
          <div style={{ padding: '4px 12px 2px', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)' }}>↑↓ navigate · ⏎/⇥ accept · esc</div>
        </div>
      )}

      <AnimatePresence>
        {showTitleEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowTitleEditor(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', backdropFilter: 'blur(32px)', border: '1px solid rgba(var(--ink-rgb), 0.09)', borderRadius: 20, padding: 32, width: 480, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-strong)', margin: 0 }}>Title Page</h2>
                <button aria-label="Close" onClick={() => setShowTitleEditor(false)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              {(['title', 'credit', 'author', 'source', 'draftDate', 'contact', 'copyright', 'notes'] as const).map(field => (
                <Input
                  key={field}
                  label={field.replace(/([A-Z])/g, ' $1').trim()}
                  value={titlePage[field]}
                  onChange={e => handleTitlePageChange(field, e.target.value)}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCharBible && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowCharBible(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', backdropFilter: 'blur(32px)', border: '1px solid rgba(var(--ink-rgb), 0.09)', borderRadius: 20, padding: 32, width: 680, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-strong)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Character Bible</h2>
                <button aria-label="Close" onClick={() => setShowCharBible(false)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              {chars.length === 0 ? (
                <div style={{ color: 'var(--fg-muted)', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>No characters detected yet. Start writing dialogue!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chars.map((name, i) => {
                    const profile = charProfiles.find(p => p.name.toUpperCase() === name.toUpperCase());
                    const isSelected = selectedCharProfile === name;
                    const stat = charStats.find(cs => cs.name === name);
                    const cast = castings[name.toUpperCase()];
                    return (
                      <div key={name} style={{ background: 'rgba(var(--ink-rgb), 0.02)', border: `1px solid ${isSelected ? 'rgba(var(--ink-rgb), 0.2)' : 'rgba(var(--ink-rgb), 0.06)'}`, borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => setSelectedCharProfile(isSelected ? null : name)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-strong)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CARD_COLORS[i % CARD_COLORS.length] }} />
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                            {cast?.username && (
                              <span style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--ok)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, padding: '1px 6px' }}>
                                Playing: {cast.username}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{stat ? `${stat.dialogueLines} lines · ${stat.scenesIn.length} scenes` : ''}</span>
                        </button>
                        {isSelected && (
                          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', marginBottom: 4 }}>Cast as</label>
                              <select
                                value={cast?.crew_user_id || ''}
                                onChange={e => handleCastCharacter(name, e.target.value)}
                                disabled={projectCrew.length === 0}
                                style={{ width: '100%', background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: '6px 10px', color: 'var(--fg-muted)', fontSize: 12, outline: 'none' }}
                              >
                                <option value="">— Not cast —</option>
                                {projectCrew.map(m => (
                                  <option key={m.user_id} value={m.user_id}>{m.username || m.user_id}</option>
                                ))}
                              </select>
                              {projectCrew.length === 0 && (
                                <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 4, fontStyle: 'italic' }}>No crew on this project yet — hire from the Jobs board or add crew in Studio.</div>
                              )}
                            </div>
                            {(['description', 'backstory', 'motivation', 'arc', 'notes'] as const).map(field => (
                              <Textarea
                                key={field}
                                label={field}
                                value={profile?.[field] || ''}
                                rows={2}
                                onChange={e => {
                                  const updated = mergeProfiles(chars, charProfiles);
                                  const idx = updated.findIndex(p => p.name.toUpperCase() === name.toUpperCase());
                                  if (idx >= 0) updated[idx] = { ...updated[idx], [field]: e.target.value };
                                  setCharProfiles(updated);
                                  if (currentScript) saveCharacterProfiles(currentScript.id, updated);
                                }}
                              />
                            ))}
                            {currentScript?.project_id && <NotCharacterButton projectId={currentScript.project_id} name={name} onSaved={corrections.upsertLocal} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {currentScript?.project_id && <RejectedNames rows={corrections.rows.filter((r) => r.kind === 'not_character')} onRemoved={corrections.removeLocal} />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditorErrorBoundary onCrash={() => {
        try { localStorage.setItem(`mc_crash_backup_${currentScript?.id || 'draft'}`, content); } catch {}
      }}>
        <AnimatePresence>
          {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
        </AnimatePresence>

        <AnimatePresence>
          {showGoToScene && (
            <GoToSceneModal
              sceneCount={scenesList.length}
              headings={scenesList.map((s) => s.text)}
              value={goToSceneNum}
              onChange={setGoToSceneNum}
              onJump={(num) => {
                setShowGoToScene(false);
                setGoToSceneNum('');
                // The dialog says "jump" — put the caret on that scene's heading,
                // scroll to it, and go back to Write if another view was open.
                jumpToScene(num - 1);
              }}
              onClose={() => setShowGoToScene(false)}
            />
          )}
        </AnimatePresence>
      </EditorErrorBoundary>

      <div data-testid="editor-status" style={{
        height: 26,
        overflow: 'hidden',
        background: 'var(--surface)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(var(--ink-rgb), 0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(12px, 4vw, 20px)',
        fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
        color: 'var(--fg-dim)',
        zIndex: 50, flexShrink: 0,
      }}>
        {/* One line at every width: the title gives way (ellipsis), the counts don't wrap. */}
        <div style={{ display: 'flex', gap: 'clamp(8px, 3vw, 20px)', alignItems: 'center', minWidth: 0, flex: 1, whiteSpace: 'nowrap' }}>
          <span title={currentScript?.title || 'Untitled'} style={{ color: 'var(--fg-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentScript?.title || 'Untitled'}</span>
          <span style={{
            flexShrink: 0,
            padding: '1px 7px', borderRadius: 4,
            background: revisionMode ? 'rgba(99,102,241,0.12)' : 'rgba(var(--ink-rgb), 0.04)',
            color: revisionMode ? 'var(--violet)' : 'var(--fg-dim)',
            letterSpacing: 'var(--caps-track)',
          }}>
            {revisionMode ? 'REVISION' : 'DRAFT'}
          </span>
          {(sprint.active || sprint.running) && (
            <span style={{ color: 'var(--violet)', letterSpacing: 'var(--caps-track)' }}>
              ◉ {Math.floor(sprint.left / 60).toString().padStart(2, '0')}:{(sprint.left % 60).toString().padStart(2, '0')} · {sprint.words}w
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'clamp(8px, 3vw, 20px)', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 12 }}>
          <span>{pageEst} pg</span>
          <span className="mc-hide-phone">{scenesList.length} sc</span>
          <span>{wordCount.toLocaleString()} wds</span>
          {collaborators.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={collaborators.map(c => `${c.username}${c.line ? ` · line ${c.line}` : ''}`).join('\n')}>
              <span style={{ display: 'flex' }}>
                {collaborators.slice(0, 4).map((c, i) => (
                  <span key={c.userId} style={{ width: 16, height: 16, borderRadius: '50%', background: c.color, color: '#000', fontSize: 'max(8px, var(--mc-min-font, 0px))', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0a0a0a', marginLeft: i === 0 ? 0 : -5, textTransform: 'var(--caps)' }}>
                    {c.username.charAt(0)}
                  </span>
                ))}
              </span>
              <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>{collaborators.length} editing</span>
            </span>
          )}
          <SyncStatusChip />
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: isSyncing ? 'var(--violet)' : 'var(--ok)',
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: isSyncing ? '#6366f1' : '#10b981',
              animation: isSyncing ? 'pulse 1.5s ease-in-out infinite' : 'none',
              display: 'inline-block',
            }} />
            {isSyncing ? 'Syncing' : 'Synced'}
          </span>
        </div>
      </div>

      {conflict.detected && (
        <div style={{ position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)', zIndex: 400, background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', maxWidth: 'var(--w-form)' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--warn)', textTransform: 'var(--caps)', marginBottom: 3 }}>Edit conflict</div>
            <div style={{ fontSize: 12, color: 'var(--fg)' }}>{conflict.message} ({conflict.remoteLength.toLocaleString()} vs your {conflict.localLength.toLocaleString()} chars)</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => resolveConflict('keep-mine')} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>KEEP MINE</button>
            <button onClick={() => resolveConflict('accept-remote')} style={{ padding: '7px 12px', background: '#f59e0b', border: 'none', borderRadius: 8, color: '#1a1200', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', fontWeight: 700 }}>TAKE THEIRS</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(var(--fg-rgb), 0.15); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(var(--ink-rgb), 0.1); border-radius: 4px; }
      `}</style>
    </div>
  );
}
