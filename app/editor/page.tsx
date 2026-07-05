'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Save, Download, FileText, Plus, ChevronDown, Loader, Wand2, 
  Book, Clock, Users, AlertCircle, FileUp, Settings, HelpCircle, History,
  Maximize, Minimize, LayoutDashboard, Type, List, Target, Play, Pause,
  Tags, Bookmark, MessageSquare, SplitSquareHorizontal, Edit3,
  Search, Replace, X, BarChart3, Lock, ClipboardList, Archive
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { parseScript } from '@/lib/scriptos/parser';
import { saveScript, getAllScripts, createNewScript, importScriptFromText, type StoredScript } from '@/lib/scriptos/storage';
import { exportScriptAsText, exportScriptAsFdx, exportScriptAsPdf } from '@/lib/scriptos/export';
import { REVISION_COLORS, getRevisions, createRevision, fetchRevisionsDB, createRevisionDB, type Revision } from '@/lib/scriptos/revisions';
import { analyzeCharacters, type CharacterStats } from '@/lib/scriptos/characters';
import { loadTitlePage, loadTitlePageCached, saveTitlePage, getDefaultTitlePage, type TitlePage } from '@/lib/scriptos/titlepage';
import { validateScript, type LintIssue } from '@/lib/scriptos/validator';
import { loadCharacterProfiles, loadCharacterProfilesCached, saveCharacterProfiles, mergeProfiles, type CharacterProfile } from '@/lib/scriptos/bible';
import type { ScriptLine, LineType } from '@/types/screenplay';
import { useToast } from '@/components/Toast';
import { useScriptSync } from '@/lib/scriptos/sync';
import { useProject } from '@/lib/context/ProjectContext';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { supabase } from '@/lib/supabase/client';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getCastingsForProject, setCasting, removeCasting, type Casting } from '@/lib/supabase/casting';
import { getProjectCrew, type CrewMember } from '@/lib/supabase/crew-management';
import { getTableReadEngine, isTableReadSupported, type TableReadEngine } from '@/lib/scriptos/tableRead';
import { getDefaultScriptFormat } from '@/lib/projectTypes';
import { usePillStage } from '@/lib/context/PillContext';
import { FindReplaceBar, ShortcutsModal, GoToSceneModal } from '@/components/editor/EditorModals';
import { BoardView, OutlineView, StatsView } from '@/components/editor/EditorCenterViews';
import { TYPE_COLORS } from '@/components/editor/editorConstants';
import { CARD_COLORS, getSceneType, sceneTypeColor } from '@/lib/scriptos/sceneVisuals';
import { EditorRightPanels } from '@/components/editor/EditorSidePanels';
import { EditorLeftNav } from '@/components/editor/EditorLeftNav';
import { EditorErrorBoundary } from '@/components/editor/EditorErrorBoundary';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const PRINT_COLORS: Record<string, string> = {
  slug: '#000',
  character: '#000',
  dialogue: '#000',
  parenthetical: '#000',
  transition: '#000',
  action: '#000',
  note: '#888'
};

const TEMPLATES: Record<string, string> = {
  'blank': '',
  'feature': `FADE IN:

EXT. CITY SKYLINE - DAWN

The sun barely crests the horizon. A new day. A new beginning.

INT. APARTMENT - CONTINUOUS

PROTAGONIST (30s, determined) sits at the edge of a bed.

PROTAGONIST
Today is the day.

CUT TO:

EXT. STREET - DAY

Protagonist walks with purpose. The world moves around them.
`,
  'short': `FADE IN:

INT. ROOM - NIGHT

A single lamp illuminates a desk. Papers everywhere.

CHARACTER sits, staring at something we can't see.

CHARACTER
(whispers)
It was always going to end this way.

FADE OUT.
`,
  'tv-cold-open': `COLD OPEN

FADE IN:

EXT. LOCATION - NIGHT

Establishing shot. Tension in the air.

INT. LOCATION - CONTINUOUS

CHARACTER A enters. Stops dead.

CHARACTER A
What happened here?

CHARACTER B (O.S.)
You don't want to know.

SMASH CUT TO:

MAIN TITLES

END COLD OPEN
`,
};

// Deliberately short and clearly instructional, not a full fake scene — an
// earlier version was a complete multi-paragraph sample screenplay, elaborate
// enough that a writer opening a genuinely-empty new script could mistake the
// faint placeholder text for real saved content, then "lose" it the instant
// they typed a single character (placeholders vanish on any real input).
const PLACEHOLDER = `Start writing — try "FADE IN:" or "INT. LOCATION - DAY"`;

// Standard screenplay transitions offered by the editor's autocomplete.
const TRANSITIONS = ['CUT TO:', 'FADE IN:', 'FADE OUT.', 'FADE TO BLACK.', 'DISSOLVE TO:', 'SMASH CUT TO:', 'MATCH CUT TO:', 'INTERCUT WITH:', 'JUMP CUT TO:', 'TIME CUT:'];

// Undo/redo history depth.
const MAX_HISTORY = 50;

// Tab cycles a line's element type in this order, transforming its text so the
// parser re-classifies it — mirrors the reference editor's Tab-to-cycle-type
// instead of the single "empty line → scene template" heuristic it replaces.
const TAB_TYPE_CYCLE: LineType[] = ['action', 'character', 'parenthetical', 'dialogue', 'transition'];

function stripLineDecoration(text: string): string {
  return text.trim().replace(/^\(/, '').replace(/\)$/, '').replace(/\s+TO:$/i, '').trim();
}

function toSentenceCase(text: string): string {
  const wasAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
  return wasAllCaps ? text.charAt(0) + text.slice(1).toLowerCase() : text;
}

function transformLineForType(text: string, type: LineType): string {
  const bare = stripLineDecoration(text);
  switch (type) {
    case 'character':
      return bare.toUpperCase();
    case 'parenthetical':
      return `(${bare.toLowerCase()})`;
    case 'transition':
      return /\bTO:$/i.test(bare) ? bare.toUpperCase() : `${bare.toUpperCase()} TO:`;
    case 'dialogue':
    case 'action':
    default:
      return toSentenceCase(bare);
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

function LinePreview({ line, index, nightModePreview }: { line: ScriptLine; index: number; nightModePreview: boolean }) {
  const style: React.CSSProperties = {
    fontFamily: 'Courier Prime, Courier, monospace',
    fontSize: 14,
    lineHeight: '1.7',
    color: nightModePreview 
      ? (line.type === 'slug' || line.type === 'character' ? '#fff' : '#ccc') 
      : (PRINT_COLORS[line.type] || '#000'),
    fontWeight: (line.type === 'slug' || line.type === 'character') ? 700 : 400,
    textTransform: (line.type === 'slug' || line.type === 'character' || line.type === 'transition') ? 'uppercase' : 'none',
    marginBottom: 2,
    padding: '2px 0',
    whiteSpace: 'pre-wrap',
  };

  let displayContent = line.text;
  
  // Notes syntax [[Note]]
  if (displayContent.includes('[[') && displayContent.includes(']]')) {
    style.color = TYPE_COLORS.note;
    style.background = 'rgba(234, 179, 8, 0.1)';
    style.padding = '4px 8px';
    style.borderRadius = '4px';
    style.borderLeft = '2px solid #eab308';
  }

  // CONT'D indicator
  const contd = line.meta?.isContinued;
  
  if (line.type === 'slug') {
    return <div style={{ ...style, fontWeight: 700, textTransform: 'uppercase', marginTop: index > 0 ? 24 : 0, marginBottom: 8, background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: 4 }}>{displayContent}</div>;
  }
  if (line.type === 'character') {
    const name = line.meta?.isDualDialogue ? displayContent.replace(/^\^/, '') : displayContent;
    return <div style={{ ...style, marginLeft: '22ch', textTransform: 'uppercase', fontWeight: 600, marginTop: 16, marginBottom: 0 }}>{name}{contd ? " (CONT'D)" : ''}</div>;
  }
  if (line.type === 'dialogue') {
    return <div style={{ ...style, marginLeft: '10ch', marginRight: '15ch', marginBottom: 12 }}>{displayContent}</div>;
  }
  if (line.type === 'parenthetical') {
    return <div style={{ ...style, marginLeft: '16ch', marginRight: '20ch', fontStyle: 'italic', opacity: 0.6, marginBottom: 0 }}>{displayContent}</div>;
  }
  if (line.type === 'transition') {
    return <div style={{ ...style, textAlign: 'right', fontWeight: 700, textTransform: 'uppercase', marginTop: 16, marginBottom: 16 }}>{displayContent}</div>;
  }

  return <div style={style}>{displayContent || <span style={{ opacity: 0.2 }}>—</span>}</div>;
}

// ============================================================================
// MAIN EDITOR
// ============================================================================

export default function EditorPage() {
  useRequireAuth();
  const { activeProject } = useProject();
  const { playUri } = useSpotify();
  
  const [projectAudioRefs, setProjectAudioRefs] = useState<any[]>([]);

  useEffect(() => {
    if (activeProject?.id) {
      supabase.from('project_audio_references')
        .select('*')
        .eq('project_id', activeProject.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setProjectAudioRefs(data || []));
    }
  }, [activeProject?.id]);

  const playAudioRef = useCallback((ref: any) => {
    if (ref.reference_type === 'spotify') playUri(ref.uri);
    else if (ref.reference_type === 'custom_upload') {
      const url = supabase.storage.from('sfx_library').getPublicUrl(ref.uri).data.publicUrl;
      new Audio(url).play();
    }
  }, [playUri]);

  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');
  const [currentScript, setCurrentScript] = useState<StoredScript | null>(null);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [elements, setElements] = useState<Record<string, string[]>>({});
  const [scripts, setScripts] = useState<StoredScript[]>([]);
  
  // UI States
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // On phones the fixed-width side panels would crush the writing area, so
  // collapse them by default and overlay them when opened.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)');
    const apply = () => { setIsMobile(mq.matches); if (mq.matches) { setShowSidebar(false); setShowRightSidebar(false); } };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'write' | 'preview' | 'board' | 'outline' | 'stats'>('write');
  const [focusMode, setFocusMode] = useState(false);
  const [sceneFilter, setSceneFilter] = useState<'all' | 'int' | 'ext' | 'day' | 'night'>('all');
  
  // Tools & Tracking
  const [dailyGoal, setDailyGoal] = useState(1000);
  const [sprintActive, setSprintActive] = useState(false);
  const [sprintTime, setSprintTime] = useState(15 * 60); // 15 mins
  const [revisionMode, setRevisionMode] = useState(false);
  
  // Autocomplete state
  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0 });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<string[]>([]);
  const [autocompleteIdx, setAutocompleteIdx] = useState(0);
  // Range of text (in the full document) the current suggestion will replace.
  const [completionRange, setCompletionRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState(0);

  // Panels
  const [rightPanel, setRightPanel] = useState<'tools' | 'characters' | 'revisions' | 'lint' | 'stash' | 'breakdown'>('tools');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [charStats, setCharStats] = useState<CharacterStats[]>([]);
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const [showWatermark, setShowWatermark] = useState(false);

  // Title Page & Settings
  const [titlePage, setTitlePage] = useState<TitlePage>(getDefaultTitlePage());
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [showSceneNumbers, setShowSceneNumbers] = useState(true);
  const [charProfiles, setCharProfiles] = useState<CharacterProfile[]>([]);
  const [selectedCharProfile, setSelectedCharProfile] = useState<string | null>(null);
  const [showCharBible, setShowCharBible] = useState(false);
  // Casting: links a screenplay character to a real project_crew member, so
  // "who's playing MARA" is a real, queryable fact — not a name in a text box.
  const [castings, setCastings] = useState<Record<string, Casting>>({});
  const [projectCrew, setProjectCrew] = useState<CrewMember[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sessionStartWords, setSessionStartWords] = useState(0);
  const [showGoToScene, setShowGoToScene] = useState(false);
  const [goToSceneNum, setGoToSceneNum] = useState('');
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [nightModePreview, setNightModePreview] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [stashItems, setStashItems] = useState<{id: string, text: string, date: number}[]>([]);
  const [sceneColors, setSceneColors] = useState<Record<string, string>>({});
  const [sceneNotes, setSceneNotes] = useState<Record<string, string>>({});
  const [dragSceneIdx, setDragSceneIdx] = useState<number | null>(null);
  const [dropSceneIdx, setDropSceneIdx] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffRevisionId, setDiffRevisionId] = useState<string | null>(null);
  const [tableReadPlaying, setTableReadPlaying] = useState(false);
  const [tableReadLineIdx, setTableReadLineIdx] = useState<number | null>(null);
  const tableReadEngineRef = useRef<TableReadEngine | null>(null);
  // Real undo/redo history — snapshots of `content` coalesced at typing pauses
  // (not one entry per keystroke), capped at 50 like the reference editor.
  // Replaces reliance on the browser's native, per-keystroke textarea undo.
  const [history, setHistory] = useState<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const historyPushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapshotRef = useRef<string | null>(null);
  const [cursorLine, setCursorLine] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Realtime Sync (live co-editing: content sync + presence + cursors)
  const { isSyncing, lastSyncedAt, collaborators, conflict, broadcastCursor, noteLocalEdit, resolveConflict } = useScriptSync(currentScript?.id || '', content, (newContent) => {
    // Only update if it's different to avoid cursor jumping
    if (newContent !== content) {
      setContent(newContent);
    }
  });

  const handleLoadScript = useCallback((script: StoredScript) => {
    setCurrentScript(script);
    setContent(script.content || '');
    setTitlePage(loadTitlePageCached(script.id));
    setCharProfiles(loadCharacterProfilesCached(script.id));
    loadTitlePage(script.id).then(setTitlePage);
    loadCharacterProfiles(script.id).then(setCharProfiles);
    setSessionStartWords((script.content || '').split(/\s+/).filter(Boolean).length);
    setActiveView('write');
  }, [toast]);

  // Casting is project-scoped (not per-script), so it loads independently of
  // which draft is open — the crew list and who's cast stay stable across
  // script switches within the same project.
  useEffect(() => {
    if (!activeProject?.id) { setCastings({}); setProjectCrew([]); return; }
    getCastingsForProject(activeProject.id).then(setCastings).catch(console.error);
    getProjectCrew(activeProject.id).then(setProjectCrew).catch(console.error);
  }, [activeProject?.id]);

  const handleCastCharacter = useCallback(async (characterName: string, crewUserId: string) => {
    if (!activeProject?.id) return;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      if (!crewUserId) {
        await removeCasting(activeProject.id, characterName);
        setCastings(prev => { const next = { ...prev }; delete next[characterName.toUpperCase()]; return next; });
        return;
      }
      await setCasting(activeProject.id, characterName, crewUserId, auth.user.id);
      const updated = await getCastingsForProject(activeProject.id);
      setCastings(updated);
    } catch (e: any) {
      toast(e.message || 'Could not update casting', 'error');
    }
  }, [activeProject?.id, toast]);

  // Init
  useEffect(() => {
    const init = async () => {
      const all = await getAllScripts();
      setScripts(all);
      if (all.length > 0) {
        const latest = all[0];
        setCurrentScript(latest);
        setContent(latest.content || '');
        setTitlePage(loadTitlePageCached(latest.id));
        setCharProfiles(loadCharacterProfilesCached(latest.id));
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
        }
      }
    };
    init();
  }, []);

  // Load (or create) the ACTIVE PROJECT's screenplay from Supabase, so the
  // editor edits the same script row Studio/Production/Pitch read. Using the
  // real Supabase id means useScriptSync persists edits straight to that row.
  useEffect(() => {
    if (!activeProject?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('scripts')
          .select('id,title,content')
          .eq('project_id', activeProject.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        let row = data?.[0];
        if (!row) {
          const { data: auth } = await supabase.auth.getUser();
          const uid = auth.user?.id;
          const ins = await supabase
            .from('scripts')
            .insert({ project_id: activeProject.id, title: activeProject.title, content: '', format: getDefaultScriptFormat(activeProject.type), status: 'draft', created_by: uid, last_edited_by: uid })
            .select('id,title,content')
            .single();
          row = ins.data || undefined;
        }
        if (cancelled || !row) return;
        if (currentScript?.id === row.id) return;
        const now = new Date().toISOString();
        handleLoadScript({ id: row.id, title: row.title || activeProject.title, content: row.content || '', createdAt: now, updatedAt: now, project_id: activeProject.id });
        toast(`Editing “${activeProject.title}” screenplay`, 'info');
      } catch (e) {
        console.error('Failed to load project script:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Table Read — reads the parsed lines aloud, voicing each character
  // distinctly, and scrolls/highlights the currently-spoken line. Stop on
  // unmount or script switch so it never keeps talking over a page change.
  const startTableRead = useCallback((fromIndex = 0) => {
    if (!isTableReadSupported()) { toast('Table read isn’t supported in this browser', 'error'); return; }
    tableReadEngineRef.current?.stop();
    const engine = getTableReadEngine(lines, {
      onLineStart: setTableReadLineIdx,
      onComplete: () => { setTableReadPlaying(false); setTableReadLineIdx(null); },
      rate: 1,
    });
    tableReadEngineRef.current = engine;
    setTableReadPlaying(true);
    engine.play(fromIndex);
  }, [lines, toast]);

  const pauseTableRead = useCallback(() => {
    tableReadEngineRef.current?.pause();
    setTableReadPlaying(false);
  }, []);

  const resumeTableRead = useCallback(() => {
    tableReadEngineRef.current?.resume();
    setTableReadPlaying(true);
  }, []);

  const stopTableRead = useCallback(() => {
    tableReadEngineRef.current?.stop();
    setTableReadPlaying(false);
    setTableReadLineIdx(null);
  }, []);

  useEffect(() => () => { tableReadEngineRef.current?.stop(); }, []);
  useEffect(() => { stopTableRead(); }, [currentScript?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Note that an edit happened, coalescing rapid keystrokes into one snapshot
  // of what the script looked like right before the burst started — so undo
  // reverts a sentence/edit at a time, not one character at a time.
  const noteHistoryEdit = useCallback((prevContent: string) => {
    if (pendingSnapshotRef.current == null) pendingSnapshotRef.current = prevContent;
    if (historyPushTimer.current) clearTimeout(historyPushTimer.current);
    historyPushTimer.current = setTimeout(() => {
      const snapshot = pendingSnapshotRef.current;
      pendingSnapshotRef.current = null;
      if (snapshot == null) return;
      setHistory(h => ({ past: [...h.past, snapshot].slice(-MAX_HISTORY), future: [] }));
    }, 600);
  }, []);

  const undo = useCallback(() => {
    if (historyPushTimer.current) { clearTimeout(historyPushTimer.current); historyPushTimer.current = null; }
    setHistory(h => {
      const pending = pendingSnapshotRef.current;
      pendingSnapshotRef.current = null;
      const past = pending != null ? [...h.past, pending] : h.past;
      if (!past.length) return h;
      const prev = past[past.length - 1];
      setContent(prev);
      return { past: past.slice(0, -1), future: [content, ...h.future].slice(0, MAX_HISTORY) };
    });
  }, [content]);

  const redo = useCallback(() => {
    setHistory(h => {
      if (!h.future.length) return h;
      const next = h.future[0];
      setContent(next);
      return { past: [...h.past, content].slice(-MAX_HISTORY), future: h.future.slice(1) };
    });
  }, [content]);

  useEffect(() => {
    setHistory({ past: [], future: [] });
    pendingSnapshotRef.current = null;
  }, [currentScript?.id]);

  // Keep the write surface scrolled to whatever line is currently being read.
  useEffect(() => {
    if (tableReadLineIdx == null || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const lineHeight = 26;
    const targetScroll = (tableReadLineIdx * lineHeight) - (window.innerHeight * 0.3);
    textarea.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [tableReadLineIdx]);

  // Parser hook
  useEffect(() => {
    if (content) {
      const result = parseScript(content);
      setLines(result.lines);
      if (result.elements) setElements(result.elements);
      setCharStats(analyzeCharacters(result.lines, result.scenes));
      setLintIssues(validateScript(result.lines, content));
    } else {
      setLines([]);
      setElements({});
      setCharStats([]);
      setLintIssues([]);
    }
  }, [content]);

  // Load revisions when script changes — from Supabase so locked drafts
  // persist across devices, with a localStorage fallback while offline.
  useEffect(() => {
    if (!currentScript) return;
    let active = true;
    (async () => {
      const remote = await fetchRevisionsDB(currentScript.id);
      if (!active) return;
      setRevisions(remote.length > 0 ? remote : getRevisions(currentScript.id));
    })();
    return () => { active = false; };
  }, [currentScript]);

  // Typewriter Centering Effect
  useEffect(() => {
    if (typewriterMode && activeView === 'write' && textareaRef.current) {
      const textarea = textareaRef.current;
      const { selectionStart } = textarea;
      
      // Approximate line height and position
      const lineHeight = 26; 
      const linesBefore = textarea.value.substr(0, selectionStart).split('\n').length;
      const targetScroll = (linesBefore * lineHeight) - (window.innerHeight * 0.3);
      
      textarea.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  }, [content, typewriterMode, activeView]);

  // Find count
  useEffect(() => {
    if (findText && content) {
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = content.match(regex);
      setFindCount(matches ? matches.length : 0);
    } else {
      setFindCount(0);
    }
  }, [findText, content]);


  // Auto-save
  useEffect(() => {
    if (!currentScript) return;
    const timer = setTimeout(async () => {
      await saveScript({ id: currentScript.id, title: currentScript.title, content });
    }, 2000);
    return () => clearTimeout(timer);
  }, [content, currentScript]);

  // Sprint Timer Hook
  useEffect(() => {
    let interval: any = null;
    if (sprintActive && sprintTime > 0) {
      interval = setInterval(() => setSprintTime(t => t - 1), 1000);
    } else if (sprintTime === 0 && sprintActive) {
      setSprintActive(false);
      toast('Sprint completed!', 'success');
    }
    return () => clearInterval(interval);
  }, [sprintActive, sprintTime, toast]);

  // Actions
  const handleSave = useCallback(async () => {
    if (!currentScript) return;
    setSaving(true);
    const saved = await saveScript({ id: currentScript.id, title: currentScript.title, content });
    if (saved) {
      setCurrentScript(saved);
      toast('Screenplay saved to cloud.', 'success');
    }
    setSaving(false);
  }, [currentScript, content, toast]);

  const handleExport = useCallback((format: string) => {
    if (!currentScript) return;
    if (format === 'txt' || format === 'fountain') {
      exportScriptAsText({ ...currentScript, content }, format as 'txt' | 'fountain');
      toast(`Exported as .${format}`, 'success');
    } else if (format === 'fdx') {
      exportScriptAsFdx({ ...currentScript, content });
      toast('Exported as .fdx (Final Draft)', 'success');
    } else if (format === 'pdf') {
      exportScriptAsPdf({ ...currentScript, content }, titlePage);
      toast('Generating PDF...', 'success');
    } else {
      // Defensive: the export menu only offers the handled formats above, so
      // this is unreachable in practice. Fall back to plain-text rather than
      // silently doing nothing if a new format is added to the menu.
      exportScriptAsText({ ...currentScript, content }, 'txt');
      toast(`Exported as .txt`, 'success');
    }
    setShowFormatMenu(false);
  }, [currentScript, content, toast]);

  const handleFindReplace = useCallback(() => {
    if (!findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    setContent(prev => prev.replace(regex, replaceText));
    toast(`Replaced ${findCount} occurrences`, 'success');
  }, [findText, replaceText, findCount, toast]);

  const handleFindReplaceOne = useCallback(() => {
    if (!findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    setContent(prev => prev.replace(regex, replaceText));
    toast('Replaced 1 occurrence', 'success');
  }, [findText, replaceText, toast]);

  const handleLockRevision = useCallback(async () => {
    if (!currentScript) return;
    const rev = await createRevisionDB(currentScript.id, content, revisions.length);
    if (rev) {
      setRevisions(prev => [...prev, rev]);
      toast(`Locked as ${rev.label}`, 'success');
    } else {
      // Offline / no access — fall back to a local snapshot so work isn't lost.
      const { revision } = createRevision(currentScript.id, content);
      setRevisions(prev => [...prev, revision]);
      toast(`Locked locally as ${revision.label}`, 'info');
    }
  }, [currentScript, content, revisions.length, toast]);

  // Toggle dual dialogue (Fountain '^') on the character cue under the cursor —
  // the parser + preview already render side-by-side dialogue when marked.
  const toggleDualDialogue = useCallback(() => {
    const editor = textareaRef.current;
    if (!editor) return;
    const cursor = editor.selectionStart;
    const lineStart = content.lastIndexOf('\n', cursor - 1) + 1;
    const le = content.indexOf('\n', cursor);
    const lineEnd = le === -1 ? content.length : le;
    const line = content.substring(lineStart, lineEnd);
    const leading = line.length - line.trimStart().length;
    const rest = line.slice(leading);
    const core = rest.replace(/^\^/, '').trim();
    const isChar = core.length > 1 && core === core.toUpperCase() && /[A-Z]/.test(core) && !/^(INT|EXT|EST|I\/E)[.\s]/.test(core) && !core.endsWith(':');
    if (!isChar) { toast('Put the cursor on a character name to toggle dual dialogue', 'info'); return; }
    const has = rest.startsWith('^');
    const newRest = has ? rest.slice(1) : '^' + rest;
    const next = content.substring(0, lineStart) + line.slice(0, leading) + newRest + content.substring(lineEnd);
    setContent(next);
    toast(has ? 'Dual dialogue removed' : 'Marked as dual dialogue (^)', 'success');
  }, [content, toast]);

  // Keyboard shortcuts (Ctrl+S, Ctrl+F, Ctrl+E, Escape)
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
      // Undo/redo the script content specifically (our own history stack, not
      // the browser's native per-keystroke textarea undo) while the write
      // surface is focused.
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
  }, [handleSave, focusMode, showFindReplace, showFormatMenu, showGoToScene, showShortcuts, undo, redo]);

  // Import .fountain / .txt / .fdx / .pdf file
  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input immediately so re-picking the same file fires

    const title = file.name.replace(/\.(fountain|txt|fdx|pdf)$/i, '');

    const finish = async (text: string) => {
      const imported = await importScriptFromText(text, title);
      if (imported) {
        setScripts(prev => [...prev, imported]);
        setCurrentScript(imported);
        setContent(text);
        toast(`Imported "${title}"`, 'success');
      }
    };

    // PDFs need text extraction with reading-order reconstruction, then the
    // smart normalizer to repair extraction artifacts (stray page numbers,
    // smart quotes, action mis-joined into dialogue) before they parse cleanly.
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      toast('Extracting PDF…', 'success');
      Promise.all([
        import('@/lib/scriptos/pdfImport'),
        import('@/lib/scriptos/normalize'),
      ])
        .then(([{ extractTextFromPdf }, { normalizeScreenplay }]) =>
          extractTextFromPdf(file).then(raw => normalizeScreenplay(raw) || raw))
        .then(finish)
        .catch(err => {
          console.error(err);
          toast('Could not read that PDF.', 'error');
        });
      return;
    }

    // .fdx (Final Draft XML) carries an explicit element type per paragraph,
    // so it's parsed losslessly instead of being dumped in as raw XML text;
    // .fountain gets its forced-element markers (., !, @, >) translated
    // before the normalizer sees it.
    if (/\.(fdx|fountain)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const raw = ev.target?.result as string;
        import('@/lib/scriptos/import')
          .then(({ importToContent }) => importToContent(raw, file.name))
          .then(({ content }) => finish(content))
          .catch(err => {
            console.error(err);
            toast(`Could not read that ${file.name.split('.').pop()} file.`, 'error');
          });
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => { finish(ev.target?.result as string); };
    reader.readAsText(file);
  }, [toast]);

  // Title page save
  const handleTitlePageChange = useCallback((field: keyof TitlePage, value: string) => {
    setTitlePage(prev => {
      const updated = { ...prev, [field]: value };
      if (currentScript) saveTitlePage(currentScript.id, updated);
      return updated;
    });
  }, [currentScript]);

  // Tab key cycling (in the textarea: Tab inserts element type based on context)
  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Autocomplete navigation takes priority while the popup is open.
    if (showAutocomplete && autocompleteItems.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAutocompleteIdx(i => (i + 1) % autocompleteItems.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setAutocompleteIdx(i => (i - 1 + autocompleteItems.length) % autocompleteItems.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptAutocomplete(autocompleteItems[autocompleteIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setShowAutocomplete(false); return; }
    }
    // Auto-close a parenthetical: typing "(" inserts "()" and drops the caret
    // inside, so wrylies like "(beat)" are one keystroke instead of two.
    if (e.key === '(') {
      const editor = textareaRef.current;
      if (editor) {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const sel = content.substring(start, end);
        const next = content.substring(0, start) + '(' + sel + ')' + content.substring(end);
        setContent(next);
        const caret = start + 1 + sel.length;
        setTimeout(() => { editor.focus(); editor.setSelectionRange(caret, caret); }, 0);
        return;
      }
    }
    // On Enter, auto-uppercase a scene heading so slugs are always formatted
    // like Final Draft/WriterDuet — "int. kitchen - day" → "INT. KITCHEN - DAY".
    if (e.key === 'Enter' && !e.shiftKey) {
      const editor = textareaRef.current;
      if (editor && editor.selectionStart === editor.selectionEnd) {
        const cursor = editor.selectionStart;
        const lineStart = content.lastIndexOf('\n', cursor - 1) + 1;
        const lineEnd = content.indexOf('\n', cursor) === -1 ? content.length : content.indexOf('\n', cursor);
        const line = content.substring(lineStart, lineEnd);
        if (/^\s*(int|ext|int\.\/ext|i\/e)\b/i.test(line) && line !== line.toUpperCase()) {
          e.preventDefault();
          const upper = line.toUpperCase();
          const col = cursor - lineStart;
          // Uppercase the whole slug, then split it at the caret like Enter would.
          const next = content.substring(0, lineStart) + upper.substring(0, col) + '\n' + upper.substring(col) + content.substring(lineEnd);
          setContent(next);
          const caret = cursor + 1; // toUpperCase preserves length
          setTimeout(() => { editor.focus(); editor.setSelectionRange(caret, caret); }, 0);
          return;
        }
      }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const editor = textareaRef.current;
      if (!editor) return;
      const cursor = editor.selectionStart;
      const lineStart = content.lastIndexOf('\n', cursor - 1) + 1;
      const lineEnd = content.indexOf('\n', cursor) === -1 ? content.length : content.indexOf('\n', cursor);
      const currentLine = content.substring(lineStart, lineEnd);
      const trimmed = currentLine.trim();

      // Empty line: no type to cycle, so start a scene heading template.
      if (!trimmed) {
        insertElement('scene');
        return;
      }

      // Cycle the line's element type — action → character → parenthetical →
      // dialogue → transition → action — by transforming its text so the
      // parser reclassifies it as the next (or, with Shift, previous) type.
      const lineIdx = content.substring(0, lineStart).split('\n').length - 1;
      const currentType = lines[lineIdx]?.type;
      const cycleIdx = currentType ? TAB_TYPE_CYCLE.indexOf(currentType) : -1;
      const base = cycleIdx === -1 ? 0 : cycleIdx;
      const step = e.shiftKey ? -1 : 1;
      const nextType = TAB_TYPE_CYCLE[(base + step + TAB_TYPE_CYCLE.length) % TAB_TYPE_CYCLE.length];
      const transformed = transformLineForType(currentLine, nextType);
      const next = content.substring(0, lineStart) + transformed + content.substring(lineEnd);
      setContent(next);
      const caret = lineStart + transformed.length;
      setTimeout(() => { editor.focus(); editor.setSelectionRange(caret, caret); }, 0);
    }
  }, [content, lines, showAutocomplete, autocompleteItems, autocompleteIdx, completionRange]);

  const insertElement = (type: string) => {
    const editor = textareaRef.current;
    if (!editor) return;

    const snippets: Record<string, string> = {
      'scene': '\n\nINT. LOCATION - DAY\n\n',
      'action': '\n\nAction description here.\n\n',
      'character': '\n\nCHARACTER NAME\n',
      'dialogue': '(parenthetical)\nDialogue goes here.\n\n',
      'transition': '\n\nCUT TO:\n\n',
      'note': '\n\n[[Note: ]]'
    };

    const snippet = snippets[type] || '';
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);

    setContent(before + snippet + after);
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start + snippet.length - 1, start + snippet.length - 1);
    }, 0);
  };

  // Compute the caret's viewport pixel position by mirroring the textarea into
  // an off-screen div, so the autocomplete popup can sit right under the caret
  // instead of a fixed corner.
  const caretCoords = (ta: HTMLTextAreaElement, pos: number): { top: number; left: number } => {
    const rect = ta.getBoundingClientRect();
    const style = window.getComputedStyle(ta);
    const mirror = document.createElement('div');
    const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderLeftWidth', 'boxSizing'] as const;
    props.forEach(p => { (mirror.style as any)[p] = style[p as any]; });
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.width = `${ta.clientWidth}px`;
    mirror.textContent = ta.value.substring(0, pos);
    const marker = document.createElement('span');
    marker.textContent = '​';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const top = rect.top - ta.scrollTop + marker.offsetTop + parseFloat(style.lineHeight || '18');
    const left = rect.left + marker.offsetLeft;
    document.body.removeChild(mirror);
    return { top, left };
  };

  const openAutocomplete = (items: string[], start: number, end: number, ta: HTMLTextAreaElement) => {
    setAutocompleteItems(items);
    setAutocompleteIdx(0);
    setCompletionRange({ start, end });
    setCursorPos(caretCoords(ta, end));
    setShowAutocomplete(true);
  };

  // Replace the in-progress token with the chosen suggestion and drop the caret
  // right after it, keeping the writer in flow.
  const acceptAutocomplete = (item: string) => {
    const editor = textareaRef.current;
    if (!editor) return;
    const { start, end } = completionRange;
    const next = content.substring(0, start) + item + content.substring(end);
    setContent(next);
    setShowAutocomplete(false);
    const caret = start + item.length;
    setTimeout(() => { editor.focus(); editor.setSelectionRange(caret, caret); }, 0);
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    noteHistoryEdit(content);
    setContent(val);
    setCursorLine(val.substring(0, e.target.selectionStart).split('\n').length - 1);
    noteLocalEdit();
    broadcastCursor(e.target.selectionStart);

    const ta = e.target;
    const cursor = ta.selectionStart;
    const lineStart = val.lastIndexOf('\n', cursor - 1) + 1;
    const currentLine = val.substring(lineStart, cursor);
    const trimmed = currentLine.trim();

    if (currentLine.match(/^(INT\.|EXT\.)\s/)) {
      // Location autocomplete — complete the text after the INT./EXT. prefix.
      const afterPrefix = currentLine.replace(/^(INT\.|EXT\.)\s*/, '');
      const typed = afterPrefix.trim().toUpperCase();
      const locations = [...new Set(lines.filter(l => l.type === 'slug').map(l => l.text.split('-')[0].replace(/^(INT\.|EXT\.)\s/, '').trim()).filter(Boolean))];
      const matches = locations.filter(l => l.toUpperCase().startsWith(typed) && l.toUpperCase() !== typed);
      if (matches.length > 0) {
        openAutocomplete(matches, lineStart + (currentLine.length - afterPrefix.length), cursor, ta);
      } else {
        setShowAutocomplete(false);
      }
    } else if (trimmed.length >= 2 && trimmed === trimmed.toUpperCase() && !trimmed.includes('.') && !trimmed.includes(':')) {
      // Character-cue / transition autocomplete — suggest known characters and
      // standard transitions matching what's typed.
      const matchingChars = chars.filter(c => c.toUpperCase().startsWith(trimmed) && c.toUpperCase() !== trimmed);
      const matchingTrans = TRANSITIONS.filter(t => t.startsWith(trimmed) && t !== trimmed);
      const items = [...matchingChars, ...matchingTrans];
      if (items.length > 0) {
        const tokenStart = lineStart + (currentLine.length - currentLine.trimStart().length);
        openAutocomplete(items, tokenStart, cursor, ta);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  // Jump from a plot card / outline row straight to that scene in the writing
  // view (Arc Studio Pro-style board↔script navigation).
  const jumpToScene = (sceneText: string) => {
    setActiveView('write');
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const idx = content.toUpperCase().indexOf(sceneText.toUpperCase());
      if (idx < 0) return;
      textarea.focus();
      textarea.setSelectionRange(idx, idx);
      const linesBefore = content.substring(0, idx).split('\n').length;
      setCursorLine(linesBefore);
      const lh = parseFloat(window.getComputedStyle(textarea).lineHeight || '28') || 28;
      textarea.scrollTop = Math.max(0, (linesBefore - 3) * lh);
    }, 60);
  };

  // Scene colour tags — persisted per script, keyed by slug text so they
  // survive re-parsing. Powers the outline's colour-coding (Arc-style).
  useEffect(() => {
    if (!currentScript?.id) { setSceneColors({}); setSceneNotes({}); return; }
    try { const raw = localStorage.getItem(`mc_scene_colors_${currentScript.id}`); setSceneColors(raw ? JSON.parse(raw) : {}); } catch { setSceneColors({}); }
    try { const raw = localStorage.getItem(`mc_scene_notes_${currentScript.id}`); setSceneNotes(raw ? JSON.parse(raw) : {}); } catch { setSceneNotes({}); }
  }, [currentScript?.id]);

  // Per-scene beat/summary — a one-line intent the writer sets on the board,
  // persisted per script and keyed by slug.
  const setSceneNote = (sceneText: string, note: string) => {
    const key = sceneText.trim().toUpperCase();
    setSceneNotes(prev => {
      const next = { ...prev };
      if (note.trim()) next[key] = note; else delete next[key];
      if (currentScript?.id) { try { localStorage.setItem(`mc_scene_notes_${currentScript.id}`, JSON.stringify(next)); } catch {} }
      return next;
    });
  };

  const tagScene = (sceneText: string, color: string) => {
    const key = sceneText.trim().toUpperCase();
    setSceneColors(prev => {
      const next = { ...prev };
      if (next[key] === color) delete next[key]; else next[key] = color;
      if (currentScript?.id) { try { localStorage.setItem(`mc_scene_colors_${currentScript.id}`, JSON.stringify(next)); } catch {} }
      return next;
    });
  };

  // Stats
  const scenesList = useMemo(() => lines.filter(l => l.type === 'slug'), [lines]);

  // Reorder whole scenes by rewriting the script text — dragging a card on the
  // board physically moves that scene (heading + body) to the new position.
  const reorderScenes = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    let cursor = 0;
    const positions: number[] = [];
    for (const s of scenesList) {
      const idx = content.toUpperCase().indexOf(s.text.toUpperCase(), cursor);
      if (idx < 0) return; // bail if we can't locate a scene cleanly
      positions.push(idx);
      cursor = idx + s.text.length;
    }
    const preamble = content.substring(0, positions[0]);
    const blocks = positions.map((p, k) => content.substring(p, k + 1 < positions.length ? positions[k + 1] : content.length));
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    setContent(preamble + blocks.join(''));
  };
  const filteredScenes = useMemo(() => {
    if (sceneFilter === 'all') return scenesList;
    return scenesList.filter(s => {
      const upper = s.text.toUpperCase();
      if (sceneFilter === 'int') return upper.includes('INT');
      if (sceneFilter === 'ext') return upper.includes('EXT');
      if (sceneFilter === 'day') return upper.includes('DAY');
      if (sceneFilter === 'night') return upper.includes('NIGHT');
      return true;
    });
  }, [scenesList, sceneFilter]);
  const chars = [...new Set(lines.filter(l => l.type === 'character').map(l => l.text.trim()))];
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const pageEst = Math.max(1, Math.round(wordCount / 185));
  const goalProgress = Math.min(100, Math.round((wordCount / dailyGoal) * 100));
  const dialogueLines = lines.filter(l => l.type === 'dialogue').length;
  const actionLines = lines.filter(l => l.type === 'action').length;
  const dialogueRatio = actionLines + dialogueLines > 0 ? Math.round((dialogueLines / (actionLines + dialogueLines)) * 100) : 0;

  // Scene word counts (for board cards)
  const sceneWordCounts = useMemo(() => {
    const counts: number[] = [];
    for (let s = 0; s < scenesList.length; s++) {
      const startIdx = lines.findIndex(l => l.id === scenesList[s].id);
      const endIdx = s + 1 < scenesList.length ? lines.findIndex(l => l.id === scenesList[s + 1].id) : lines.length;
      const sceneLines = lines.slice(startIdx, endIdx);
      const wc = sceneLines.reduce((sum, l) => sum + l.text.split(/\s+/).filter(Boolean).length, 0);
      counts.push(wc);
    }
    return counts;
  }, [lines, scenesList]);

  const sessionWordsWritten = Math.max(0, wordCount - sessionStartWords);

  // Per-scene character presence map
  const sceneCharMap = useMemo(() => {
    return scenesList.map((scene, i) => {
      const startIdx = lines.findIndex(l => l.id === scene.id);
      const endIdx = i + 1 < scenesList.length
        ? lines.findIndex(l => l.id === scenesList[i + 1].id)
        : lines.length;
      return [...new Set(lines.slice(startIdx, endIdx).filter(l => l.type === 'character').map(l => l.text.trim()))];
    });
  }, [lines, scenesList]);

  // Which scene index is the cursor currently inside
  const currentSceneIdx = useMemo(() => {
    let lineCount = 0;
    let lastScene = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].type === 'slug') {
        const sIdx = scenesList.indexOf(lines[i]);
        if (sIdx !== -1) lastScene = sIdx;
      }
      if (lineCount >= cursorLine) break;
      lineCount++;
    }
    return lastScene;
  }, [lines, scenesList, cursorLine]);

  // ── Publish the editor's live state to the Pill ────────────────────────────
  // The taskbar's context capsule morphs to surface these read-outs and the
  // Focus toggle — every value is live page state, the toggle flips it for real.
  usePillStage(
    {
      module: 'editor',
      title: currentScript?.title || 'Untitled',
      fields: [
        { label: 'Scene', value: scenesList.length ? `${Math.max(0, currentSceneIdx) + 1} / ${scenesList.length}` : '—', color: '#d7340b' },
        { label: 'Words', value: wordCount.toLocaleString(), color: '#6366f1' },
        { label: 'Pages', value: `${pageEst}` },
        { label: 'Save', value: saving ? 'Saving…' : 'Saved', color: saving ? '#f59e0b' : '#10b981' },
      ],
      toggles: [
        { id: 'focus', label: 'Focus', active: focusMode, onToggle: () => setFocusMode(v => !v) },
      ],
    },
    [currentScript?.title, currentSceneIdx, scenesList.length, wordCount, pageEst, saving, focusMode],
  );

  // Act structure — properly clamped so it never produces "Sc 4-3" nonsense
  const actStructure = useMemo(() => {
    const n = scenesList.length;
    if (n === 0) return { act1End: 0, act2End: 0, act2Start: 1, act3Start: 1 };
    const totalWc = sceneWordCounts.reduce((a, b) => a + b, 0) || 1;
    let running = 0;
    let act1End = Math.max(1, Math.ceil(n * 0.25));
    let act2End = Math.max(act1End + 1, Math.ceil(n * 0.75));
    for (let i = 0; i < sceneWordCounts.length; i++) {
      running += sceneWordCounts[i];
      const pct = running / totalWc;
      if (pct >= 0.25 && act1End === Math.ceil(n * 0.25)) act1End = i + 1;
      if (pct >= 0.75 && act2End === Math.ceil(n * 0.75)) act2End = i + 1;
    }
    act1End = Math.min(act1End, n - 2);
    act2End = Math.min(act2End, n - 1);
    act2End = Math.max(act2End, act1End + 1);
    return { act1End, act2End, act2Start: act1End + 1, act3Start: act2End + 1 };
  }, [sceneWordCounts, scenesList.length]);

  // Unique locations for location manager
  const uniqueLocations = useMemo(() => {
    const locs = new Map<string, number>();
    scenesList.forEach(s => {
      const match = s.text.toUpperCase().match(/(?:INT\.|EXT\.|INT\/EXT\.)\s*(.+?)(?:\s*-\s*|$)/);
      const loc = match ? match[1].trim() : s.text.trim();
      locs.set(loc, (locs.get(loc) || 0) + 1);
    });
    return Array.from(locs.entries()).sort((a, b) => b[1] - a[1]);
  }, [scenesList]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column' }}>

      {/* TOOLBAR */}
      {!focusMode && (
        <header className="mc-editor-header" style={{
          position: 'sticky', top: 0,
          background: 'rgba(6,6,6,0.94)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '0 20px',
          height: 58,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          flexShrink: 0,
        }}>
          {/* Left: Branding & Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/" style={{ color: 'var(--fg-muted)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}>
              <ArrowLeft size={18} />
            </Link>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="link-btn"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}
              >
                <List size={14} className="text-indigo-400" /> 
                <input 
                  value={currentScript?.title || ''} 
                  onChange={async (e) => {
                    if (currentScript) {
                      const updated = { ...currentScript, title: e.target.value };
                      setCurrentScript(updated);
                      await saveScript(updated);
                    }
                  }}
                  placeholder="Untitled Script"
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: 14, 
                    fontWeight: 700, 
                    outline: 'none',
                    padding: '2px 4px',
                    borderRadius: 4,
                    width: 'auto',
                    minWidth: 120
                  }}
                  onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                  onBlur={(e) => e.target.style.background = 'transparent'}
                />
              </button>
              
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: revisionMode ? 'rgba(0,153,255,0.1)' : 'rgba(255,255,255,0.05)', color: revisionMode ? '#0099ff' : 'var(--fg-subtle)', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }} onClick={() => setRevisionMode(!revisionMode)}>
                {revisionMode ? 'Blue Revision' : 'Draft Mode'}
              </span>
            </div>
          </div>

          {/* Center: View Switcher — pill nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '3px 4px' }}>
            {([
              { id: 'write',   icon: Type,            label: 'Write'   },
              { id: 'board',   icon: LayoutDashboard, label: 'Board'   },
              { id: 'outline', icon: List,            label: 'Outline' },
              { id: 'preview', icon: FileText,        label: 'Preview' },
              { id: 'stats',   icon: BarChart3,       label: 'Stats'   },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 13px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600,
                  letterSpacing: 0.5, border: 'none', cursor: 'pointer',
                  background: activeView === id ? 'rgba(255,255,255,0.10)' : 'transparent',
                  color: activeView === id ? 'var(--fg)' : 'var(--fg-dim)',
                  fontFamily: 'var(--mono)',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <Icon size={11} style={{ verticalAlign: -1 }} /> {label}
              </button>
            ))}
          </div>

          {/* Right: Tools & Export */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            
            {/* Session word count */}
            {sessionWordsWritten > 0 && (
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#00cc66', padding: '4px 8px', background: 'rgba(0,204,102,0.1)', borderRadius: 4 }}>
                +{sessionWordsWritten}w
              </span>
            )}

            {[
              { icon: HelpCircle, title: 'Shortcuts', onClick: () => setShowShortcuts(true) },
              { icon: SplitSquareHorizontal, title: 'Dual Dialogue', onClick: toggleDualDialogue },
              { icon: Users,      title: 'Character Bible', onClick: () => setShowCharBible(true) },
              { icon: Maximize,   title: 'Focus Mode', onClick: () => setFocusMode(true) },
              { icon: Settings,   title: 'Tools Panel', onClick: () => setShowRightSidebar(!showRightSidebar) },
              { icon: Lock,       title: 'Lock Revision', onClick: handleLockRevision },
            ].map(({ icon: Icon, title, onClick }) => (
              <button
                key={title}
                onClick={onClick}
                title={title}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 9,
                  color: 'var(--fg-dim)',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-dim)'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <Icon size={14} />
              </button>
            ))}

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFormatMenu(!showFormatMenu)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 18px',
                  background: 'var(--accent)', color: 'var(--bg)',
                  borderRadius: 9999, fontWeight: 700, fontSize: 10,
                  fontFamily: 'var(--mono)', letterSpacing: 2, textTransform: 'uppercase',
                  border: 'none', cursor: 'pointer',
                  transition: 'box-shadow 0.25s, transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(215, 52, 11,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = ''; }}
              >
                <Download size={12} /> Export <ChevronDown size={11} />
              </button>

              {showFormatMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 12, padding: 6, minWidth: 164, zIndex: 200,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)'
                }}>
                  {['fountain', 'fdx', 'pdf', 'txt'].map(fmt => (
                    <button key={fmt} onClick={() => handleExport(fmt)} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left', padding: '9px 14px',
                      background: 'transparent', border: 'none', color: 'var(--fg-muted)',
                      fontSize: 10, cursor: 'pointer', borderRadius: 7,
                      textTransform: 'uppercase', letterSpacing: 2,
                      fontFamily: 'var(--mono)', fontWeight: 500,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--fg)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}>
                      .{fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, color: saving ? 'var(--fg-dim)' : 'var(--fg-muted)',
                cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'var(--fg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
            >
              {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            </button>
          </div>
        </header>
      )}

      {/* FIND & REPLACE BAR */}
      <AnimatePresence>
        {showFindReplace && (
          <FindReplaceBar
            findText={findText} setFindText={setFindText}
            replaceText={replaceText} setReplaceText={setReplaceText}
            findCount={findCount}
            onReplaceOne={handleFindReplaceOne}
            onReplaceAll={handleFindReplace}
            onClose={() => setShowFindReplace(false)}
          />
        )}
      </AnimatePresence>

      {/* WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Mobile scrim behind an open panel */}
        {isMobile && (showSidebar || showRightSidebar) && !focusMode && (
          <div onClick={() => { setShowSidebar(false); setShowRightSidebar(false); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55 }} />
        )}

        {/* LEFT NAVIGATOR (Scenes & Documents) */}
        <AnimatePresence>
          {showSidebar && !focusMode && (
            <motion.div
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: 248,
                background: 'rgba(8,8,8,0.98)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
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
                actStructure={actStructure} textareaRef={textareaRef} content={content} setCursorLine={setCursorLine}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER STAGE */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: focusMode ? '#000' : '#050505', position: 'relative' }}>
          
          {/* Focus Exit */}
          {focusMode && (
            <button onClick={() => setFocusMode(false)} style={{
              position: 'absolute', top: 20, right: 20, zIndex: 100,
              background: 'transparent', border: 'none', color: '#666', cursor: 'pointer'
            }}>
              <Minimize size={20} />
            </button>
          )}

          {activeView === 'write' && (
            <div style={{ flex: 1, position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto' }}>
              {/* Highlight layer — mirrors the textarea's text per-line, colored
                  by parsed screenplay type (slug/character/dialogue/etc.), so the
                  live writing surface isn't just undifferentiated monospace text.
                  Kept pixel-identical (same font/line-height/padding, no per-line
                  indentation) to the textarea beneath it so the invisible caret
                  always lands where the colored text appears. */}
              <div
                ref={highlightRef}
                aria-hidden
                style={{
                  position: 'absolute', inset: 0, overflow: 'hidden',
                  padding: focusMode ? '100px 10%' : '60px 80px', paddingBottom: typewriterMode ? '60vh' : '60px',
                  fontFamily: 'Courier Prime, Courier, monospace', fontSize: 16, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', pointerEvents: 'none',
                }}
              >
                {content.split('\n').map((lineText, i) => {
                  const type = lines[i]?.type;
                  const color = (type && TYPE_COLORS[type]) || (revisionMode ? '#0099ff' : '#e0e0e0');
                  const bold = type === 'slug' || type === 'character' || type === 'transition';
                  const isReadingLine = tableReadLineIdx === i;
                  return (
                    <div key={i} style={{
                      color, fontWeight: bold ? 700 : 400,
                      background: isReadingLine ? 'rgba(215, 52, 11,0.14)' : undefined,
                      boxShadow: isReadingLine ? 'inset 3px 0 0 var(--accent)' : undefined,
                    }}>
                      {lineText.length ? lineText : ' '}
                    </div>
                  );
                })}
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleEditorChange}
                onKeyDown={handleEditorKeyDown}
                onSelect={e => broadcastCursor((e.target as HTMLTextAreaElement).selectionStart)}
                onScroll={e => { if (highlightRef.current) highlightRef.current.scrollTop = e.currentTarget.scrollTop; }}
                placeholder={PLACEHOLDER}
                spellCheck={false}
                style={{
                  position: 'absolute', inset: 0,
                  padding: focusMode ? '100px 10%' : '60px 80px', paddingBottom: typewriterMode ? '60vh' : '60px', width: '100%',
                  background: 'transparent', border: 'none', color: 'transparent', caretColor: revisionMode ? '#0099ff' : '#e0e0e0',
                  fontFamily: 'Courier Prime, Courier, monospace', fontSize: 16, lineHeight: 1.6,
                  resize: 'none', outline: 'none',
                }}
              />

              {/* Table Read control — plays the script aloud, voicing each
                  character distinctly, and scrolls/highlights the live line. */}
              {!focusMode && (
                <div style={{
                  position: 'absolute', top: 16, right: 16, zIndex: 5,
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(8,8,8,0.85)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20, padding: '6px 10px', backdropFilter: 'blur(12px)',
                }}>
                  <button
                    onClick={() => (tableReadPlaying ? pauseTableRead() : (tableReadLineIdx != null ? resumeTableRead() : startTableRead(0)))}
                    title={tableReadPlaying ? 'Pause table read' : 'Play table read'}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {tableReadPlaying ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  {tableReadLineIdx != null && (
                    <button
                      onClick={stopTableRead}
                      title="Stop table read"
                      style={{ background: 'transparent', border: 'none', color: 'rgba(224, 221, 174,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'rgba(224, 221, 174,0.4)', textTransform: 'uppercase' }}>
                    Table Read
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Structure Lines (Visual Act Markers) */}
          {activeView === 'write' && !focusMode && (
            <div style={{ position: 'fixed', left: 40, top: 120, bottom: 80, width: 2, background: 'rgba(255,255,255,0.03)', zIndex: 0 }}>
              {scenesList.map((s, idx) => {
                const pos = (idx / scenesList.length) * 100;
                const isActBreak = s.text.includes('ACT');
                return (
                  <div 
                    key={s.id} 
                    style={{ 
                      position: 'absolute', 
                      top: `${pos}%`, 
                      left: -4, 
                      width: 10, 
                      height: 2, 
                      background: isActBreak ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    }} 
                    title={s.text}
                  />
                );
              })}
            </div>
          )}

          {activeView === 'preview' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '60px 80px', width: '100%', maxWidth: 850, margin: '20px auto', background: nightModePreview ? '#111' : '#fff', color: nightModePreview ? '#ddd' : '#000', boxShadow: '0 0 40px rgba(0,0,0,0.5)', borderRadius: 4, position: 'relative' }}>
              {/* Page number */}
              <div style={{ position: 'absolute', top: 24, right: 40, fontSize: 10, color: '#999', fontFamily: 'Courier Prime, monospace' }}>Page 1</div>
              {/* Watermark */}
              {showWatermark && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: 80, fontWeight: 900, color: 'rgba(0,0,0,0.04)', textTransform: 'uppercase', fontFamily: 'Courier Prime, monospace', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 0 }}>DRAFT</div>
              )}
              {/* Title block */}
              {titlePage.title && (
                <div style={{ textAlign: 'center', marginBottom: 48, paddingTop: 40 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Courier Prime, monospace', marginBottom: 24 }}>{titlePage.title}</div>
                  {titlePage.credit && <div style={{ fontSize: 12, fontFamily: 'Courier Prime, monospace', marginBottom: 4 }}>{titlePage.credit}</div>}
                  {titlePage.author && <div style={{ fontSize: 12, fontFamily: 'Courier Prime, monospace', marginBottom: 16 }}>{titlePage.author}</div>}
                  {titlePage.draftDate && <div style={{ fontSize: 10, fontFamily: 'Courier Prime, monospace', color: '#888' }}>{titlePage.draftDate}</div>}
                  <hr style={{ margin: '32px auto', width: 120, border: 'none', borderTop: '1px solid #ccc' }} />
                </div>
              )}
              {lines.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', marginTop: 100, fontStyle: 'italic' }}>Start writing to see preview</div>
              ) : (
                lines.map((line, i) => {
                  // Add page numbers every ~55 lines (approx 1 page)
                  const pageBreak = i > 0 && i % 55 === 0;
                  return (
                    <React.Fragment key={i}>
                      {pageBreak && (
                        <div style={{ borderTop: '1px dashed #ccc', margin: '24px 0', position: 'relative' }}>
                          <span style={{ position: 'absolute', right: 0, top: -10, fontSize: 10, color: '#999', fontFamily: 'Courier Prime, monospace', background: '#fff', padding: '0 8px' }}>Page {Math.floor(i / 55) + 1}</span>
                        </div>
                      )}
                      <LinePreview line={line} index={i} nightModePreview={nightModePreview} />
                    </React.Fragment>
                  );
                })
              )}
            </div>
          )}

          {activeView === 'board' && (
            <BoardView
              scenesList={scenesList} lines={lines} sceneColors={sceneColors} sceneNotes={sceneNotes}
              sceneWordCounts={sceneWordCounts} dragSceneIdx={dragSceneIdx} setDragSceneIdx={setDragSceneIdx}
              dropSceneIdx={dropSceneIdx} setDropSceneIdx={setDropSceneIdx} jumpToScene={jumpToScene}
              setSceneNote={setSceneNote} reorderScenes={reorderScenes}
            />
          )}

          {activeView === 'outline' && (
            <OutlineView
              sceneFilter={sceneFilter} setSceneFilter={setSceneFilter} filteredScenes={filteredScenes}
              scenesList={scenesList} lines={lines} sceneColors={sceneColors} sceneNotes={sceneNotes}
              jumpToScene={jumpToScene} tagScene={tagScene}
            />
          )}

          {activeView === 'stats' && (
            <StatsView
              currentScriptTitle={currentScript?.title} wordCount={wordCount} pageEst={pageEst}
              scenesList={scenesList} uniqueLocations={uniqueLocations} chars={chars} charStats={charStats}
              dialogueRatio={dialogueRatio} sceneWordCounts={sceneWordCounts} actStructure={actStructure}
              sceneCharMap={sceneCharMap} currentSceneIdx={currentSceneIdx} lintIssues={lintIssues}
            />
          )}
        </div>

        {/* RIGHT SIDEBAR (Tabbed Panels) */}
        <AnimatePresence>
          {showRightSidebar && !focusMode && (
            <motion.div
              initial={{ x: 272, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 272, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: 272, maxWidth: '86vw', background: 'rgba(8,8,8,0.98)', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflowY: 'hidden', ...(isMobile ? { position: 'absolute', top: 0, bottom: 0, right: 0, zIndex: 60, boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' } : {}) }}
            >
              {/* Scoped tightly around just this panel: if a runaway effect in
                  one of its many tabs (sprint timer, revisions, stats) throws,
                  only the sidebar unmounts — the write surface and content
                  state are untouched and the writer never loses a draft. */}
              <EditorErrorBoundary onCrash={() => {
                try { localStorage.setItem(`mc_crash_backup_${currentScript?.id || 'draft'}`, content); } catch {}
              }}>
                <EditorRightPanels
                  rightPanel={rightPanel} setRightPanel={setRightPanel}
                  activeView={activeView} currentSceneIdx={currentSceneIdx} scenesList={scenesList}
                  getSceneType={getSceneType} sceneTypeColor={sceneTypeColor}
                  sceneWordCounts={sceneWordCounts} sceneCharMap={sceneCharMap}
                  insertElement={insertElement}
                  sprintActive={sprintActive} setSprintActive={setSprintActive} sprintTime={sprintTime}
                  wordCount={wordCount} dailyGoal={dailyGoal} goalProgress={goalProgress}
                  pageEst={pageEst} dialogueRatio={dialogueRatio}
                  typewriterMode={typewriterMode} setTypewriterMode={setTypewriterMode}
                  nightModePreview={nightModePreview} setNightModePreview={setNightModePreview}
                  elements={elements} chars={chars} charStats={charStats}
                  handleLockRevision={handleLockRevision} revisions={revisions}
                  setContent={setContent} toast={toast}
                  showSceneNumbers={showSceneNumbers} setShowSceneNumbers={setShowSceneNumbers}
                  showWatermark={showWatermark} setShowWatermark={setShowWatermark}
                  lintIssues={lintIssues}
                  stashItems={stashItems} setStashItems={setStashItems} textareaRef={textareaRef}
                  currentScript={currentScript}
                  projectAudioRefs={projectAudioRefs}
                  playAudioRef={playAudioRef}
                />
              </EditorErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Autocomplete Popover (Basic implementation) */}
      {showAutocomplete && autocompleteItems.length > 0 && (
        <div style={{
          position: 'fixed', top: cursorPos.top, left: cursorPos.left,
          background: '#111', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6, padding: 4, zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          maxHeight: 200, overflowY: 'auto', minWidth: 160
        }}>
          {autocompleteItems.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => { e.preventDefault(); acceptAutocomplete(item); }}
              onMouseEnter={() => setAutocompleteIdx(idx)}
              style={{ padding: '6px 12px', fontSize: 12, color: idx === autocompleteIdx ? '#fff' : 'var(--fg-muted)', background: idx === autocompleteIdx ? 'rgba(255,255,255,0.08)' : 'transparent', borderRadius: 4, cursor: 'pointer', fontFamily: 'Courier Prime, monospace', letterSpacing: 0.5 }}
            >
              {item}
            </div>
          ))}
          <div style={{ padding: '4px 12px 2px', fontSize: 8.5, color: 'var(--fg-dim)', letterSpacing: 0.5 }}>↑↓ navigate · ⏎/⇥ accept · esc</div>
        </div>
      )}

      {/* TITLE PAGE EDITOR MODAL */}
      <AnimatePresence>
        {showTitleEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTitleEditor(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 32, width: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Title Page</h2>
                <button onClick={() => setShowTitleEditor(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              {(['title', 'credit', 'author', 'source', 'draftDate', 'contact', 'copyright', 'notes'] as const).map(field => (
                <div key={field} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input value={titlePage[field]} onChange={e => handleTitlePageChange(field, e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Courier Prime, monospace' }} />
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHARACTER BIBLE MODAL */}
      <AnimatePresence>
        {showCharBible && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCharBible(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 32, width: 680, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Character Bible</h2>
                <button onClick={() => setShowCharBible(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
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
                      <div key={name} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => setSelectedCharProfile(isSelected ? null : name)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CARD_COLORS[i % CARD_COLORS.length] }} />
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                            {cast?.username && (
                              <span style={{ fontSize: 9, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, padding: '1px 6px' }}>
                                Playing: {cast.username}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{stat ? `${stat.dialogueLines} lines · ${stat.scenesIn.length} scenes` : ''}</span>
                        </button>
                        {isSelected && (
                          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                              <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Cast as</label>
                              <select
                                value={cast?.crew_user_id || ''}
                                onChange={e => handleCastCharacter(name, e.target.value)}
                                disabled={projectCrew.length === 0}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 10px', color: '#ccc', fontSize: 12, outline: 'none' }}
                              >
                                <option value="">— Not cast —</option>
                                {projectCrew.map(m => (
                                  <option key={m.user_id} value={m.user_id}>{m.username || m.user_id}</option>
                                ))}
                              </select>
                              {projectCrew.length === 0 && (
                                <div style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 4, fontStyle: 'italic' }}>No crew on this project yet — hire from the Jobs board or add crew in Studio.</div>
                              )}
                            </div>
                            {(['description', 'backstory', 'motivation', 'arc', 'notes'] as const).map(field => (
                              <div key={field}>
                                <label style={{ display: 'block', fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{field}</label>
                                <textarea value={profile?.[field] || ''} onChange={e => {
                                  const updated = mergeProfiles(chars, charProfiles);
                                  const idx = updated.findIndex(p => p.name.toUpperCase() === name.toUpperCase());
                                  if (idx >= 0) updated[idx] = { ...updated[idx], [field]: e.target.value };
                                  setCharProfiles(updated);
                                  if (currentScript) saveCharacterProfiles(currentScript.id, updated);
                                }} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '6px 10px', color: '#ccc', fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 40, fontFamily: 'inherit' }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditorErrorBoundary onCrash={() => {
        try { localStorage.setItem(`mc_crash_backup_${currentScript?.id || 'draft'}`, content); } catch {}
      }}>
        {/* KEYBOARD SHORTCUTS MODAL */}
        <AnimatePresence>
          {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
        </AnimatePresence>

        {/* GO TO SCENE DIALOG */}
        <AnimatePresence>
          {showGoToScene && (
            <GoToSceneModal
              sceneCount={scenesList.length}
              value={goToSceneNum}
              onChange={setGoToSceneNum}
              onJump={(num) => {
                setActiveView('write');
                setShowGoToScene(false);
                setGoToSceneNum('');
                toast(`Jumped to Scene ${num}`, 'success');
              }}
              onClose={() => setShowGoToScene(false)}
            />
          )}
        </AnimatePresence>
      </EditorErrorBoundary>

      {/* STATUS BAR */}
      <div style={{
        height: 26,
        background: 'rgba(4,4,4,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5,
        color: 'var(--fg-dim)',
        zIndex: 50, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ color: 'var(--fg-muted)' }}>{currentScript?.title || 'Untitled'}</span>
          <span style={{
            padding: '1px 7px', borderRadius: 4,
            background: revisionMode ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
            color: revisionMode ? '#6366f1' : 'var(--fg-dim)',
            letterSpacing: 2,
          }}>
            {revisionMode ? 'REVISION' : 'DRAFT'}
          </span>
          {sprintActive && (
            <span style={{ color: '#6366f1', letterSpacing: 2 }}>
              ◉ {Math.floor(sprintTime / 60).toString().padStart(2, '0')}:{(sprintTime % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span>{pageEst} pg</span>
          <span>{scenesList.length} sc</span>
          <span>{wordCount.toLocaleString()} wds</span>
          {collaborators.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={collaborators.map(c => `${c.username}${c.line ? ` · line ${c.line}` : ''}`).join('\n')}>
              <span style={{ display: 'flex' }}>
                {collaborators.slice(0, 4).map((c, i) => (
                  <span key={c.userId} style={{ width: 16, height: 16, borderRadius: '50%', background: c.color, color: '#000', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0a0a0a', marginLeft: i === 0 ? 0 : -5, textTransform: 'uppercase' }}>
                    {c.username.charAt(0)}
                  </span>
                ))}
              </span>
              <span style={{ color: 'var(--fg-muted)', fontSize: 10 }}>{collaborators.length} editing</span>
            </span>
          )}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: isSyncing ? '#6366f1' : '#10b981',
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
        <div style={{ position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)', zIndex: 400, background: 'rgba(17,17,17,0.97)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', maxWidth: 520 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 3 }}>Edit conflict</div>
            <div style={{ fontSize: 12, color: 'var(--fg)' }}>{conflict.message} ({conflict.remoteLength.toLocaleString()} vs your {conflict.localLength.toLocaleString()} chars)</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => resolveConflict('keep-mine')} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 7, color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1 }}>KEEP MINE</button>
            <button onClick={() => resolveConflict('accept-remote')} style={{ padding: '7px 12px', background: '#f59e0b', border: 'none', borderRadius: 7, color: '#1a1200', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, fontWeight: 700 }}>TAKE THEIRS</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(224, 221, 174,0.15); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  );
}
