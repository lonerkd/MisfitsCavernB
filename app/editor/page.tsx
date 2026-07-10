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
import { saveTitlePage, getDefaultTitlePage, type TitlePage, getTitlePage } from '@/lib/scriptos/titlepage';
import { validateScript, type LintIssue } from '@/lib/scriptos/validator';
import { saveCharacterProfiles, mergeProfiles, type CharacterProfile, getCharacterProfiles } from '@/lib/scriptos/bible';
import type { ScriptLine, LineType, StashItem } from '@/types/screenplay';
import { useToast } from '@/components/Toast';
import { useScriptSync } from '@/lib/scriptos/sync';
import { useProject } from '@/lib/context/ProjectContext';
import { usePresence } from '@/lib/context/PresenceContext';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { supabase } from '@/lib/supabase/client';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getCastingsForProject, setCasting, removeCasting, type Casting } from '@/lib/supabase/casting';
import { listAnnotations, addAnnotation, deleteAnnotation, ANNOTATION_META, ANNOTATION_TYPES, type ScriptAnnotation, type AnnotationType } from '@/lib/supabase/annotations';
import { resolveLineToSceneId } from '@/lib/supabase/breakdown';
import { getProjectBeats, createProjectBeat } from '@/lib/supabase/studio';
import { logAuditAction } from '@/lib/supabase/audit';
import { logActivity } from '@/lib/supabase/activity';
import { getProjectCrew, type CrewMember } from '@/lib/supabase/crew-management';
import { getTableReadEngine, isTableReadSupported, type TableReadEngine } from '@/lib/scriptos/tableRead';
import { getDefaultScriptFormat } from '@/lib/projectTypes';
import { usePillStage } from '@/lib/context/PillContext';
import { FindReplaceBar, ShortcutsModal, GoToSceneModal } from '@/components/editor/EditorModals';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { BoardView, OutlineView, StatsView } from '@/components/editor/EditorCenterViews';
import { TYPE_COLORS } from '@/components/editor/editorConstants';
import { CARD_COLORS, getSceneType, sceneTypeColor } from '@/lib/scriptos/sceneVisuals';
import { EditorRightPanels, type RightPanelTab } from '@/components/editor/EditorSidePanels';
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

// Status bar copy: names the current line's element and hints at the
// conventional next keystroke, the way Highland/Fountain-style editors do.
const ELEMENT_STATUS: Record<string, { label: string; hint: string }> = {
  slug: { label: 'Scene Heading', hint: 'Enter → Action' },
  action: { label: 'Action', hint: 'Enter → Action · Tab → Character' },
  character: { label: 'Character', hint: 'Enter → Dialogue' },
  dialogue: { label: 'Dialogue', hint: 'Enter → Character · Tab → Parenthetical' },
  parenthetical: { label: 'Parenthetical', hint: 'Enter → Dialogue' },
  transition: { label: 'Transition', hint: 'Enter → Scene Heading' },
  shot: { label: 'Shot', hint: 'Enter → Action' },
  empty: { label: 'New Line', hint: 'Tab → cycle element type' },
};

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

function LinePreview({ line, index, nightModePreview, sceneNumber, showSceneNumbers }: { line: ScriptLine; index: number; nightModePreview: boolean; sceneNumber?: number; showSceneNumbers?: boolean }) {
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
    return (
      <div style={{ ...style, position: 'relative', fontWeight: 700, textTransform: 'uppercase', marginTop: index > 0 ? 24 : 0, marginBottom: 8, background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: 4 }}>
        {/* Scene numbers in both margins — real screenplay convention */}
        {showSceneNumbers && sceneNumber != null && (
          <>
            <span style={{ position: 'absolute', left: -44, fontSize: 12, fontWeight: 400, color: nightModePreview ? '#888' : '#999' }}>{sceneNumber}</span>
            <span style={{ position: 'absolute', right: -44, fontSize: 12, fontWeight: 400, color: nightModePreview ? '#888' : '#999' }}>{sceneNumber}</span>
          </>
        )}
        {displayContent}
      </div>
    );
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
  const { isLoading } = useRequireAuth();
  const { activeProject } = useProject();
  if (isLoading) return null;
  const { updateScenePresence } = usePresence();
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

  // Margin gutter: typed, line-anchored annotations (shot/beat/note/revision/
  // reference/todo) tied to the current script, each conceptually routing to
  // its owning department elsewhere in the suite.
  const [annotations, setAnnotations] = useState<ScriptAnnotation[]>([]);
  const [annotationDraft, setAnnotationDraft] = useState<{ line: number; type: AnnotationType; text: string } | null>(null);
  const reloadAnnotations = useCallback((scriptId: string) => {
    listAnnotations(scriptId).then(setAnnotations).catch(() => setAnnotations([]));
  }, []);

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
  useEffect(() => {
    if (currentScript?.id) reloadAnnotations(currentScript.id);
    else setAnnotations([]);
  }, [currentScript?.id, reloadAnnotations]);

  const submitAnnotation = useCallback(async () => {
    if (!annotationDraft || !currentScript?.id || !activeProject?.id || !annotationDraft.text.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    try {
      await addAnnotation({ scriptId: currentScript.id, projectId: activeProject.id, lineIndex: annotationDraft.line, type: annotationDraft.type, text: annotationDraft.text.trim(), createdBy: auth.user.id });

      // shot/todo annotations claim (via ANNOTATION_META.routesTo) to reach a
      // real Shot List / Call Sheet elsewhere in the suite — this is what
      // actually makes that true, instead of the annotation being the only
      // place the note ever lives. Best-effort: if the scene can't be
      // resolved (script/schedule drifted, or the scene isn't imported into
      // the schedule yet), the margin annotation itself still saved above,
      // so this never blocks or fails the user's actual action.
      const scenes = (activeProject.scenes || []) as { id: string; scene_number: number; shoot_day?: number }[];
      if ((annotationDraft.type === 'shot' || annotationDraft.type === 'todo') && scenes.length > 0) {
        const sceneId = await resolveLineToSceneId(activeProject.id, annotationDraft.line, scenes);
        if (sceneId) {
          if (annotationDraft.type === 'shot') {
            const { count } = await supabase.from('shots').select('id', { count: 'exact', head: true }).eq('scene_id', sceneId);
            await supabase.from('shots').insert({
              project_id: activeProject.id, scene_id: sceneId, shot_number: String((count || 0) + 1),
              description: annotationDraft.text.trim(), order_index: count || 0, created_by: auth.user.id,
            });
            toast('Shot added to the Shot List', 'success');
          } else {
            const scene = scenes.find(s => s.id === sceneId);
            const day = scene?.shoot_day || 1;
            const { data: existingSheet } = await supabase.from('call_sheets').select('id,notes').eq('project_id', activeProject.id).eq('shoot_day', day).maybeSingle();
            const combinedNotes = existingSheet?.notes ? `${existingSheet.notes}\n${annotationDraft.text.trim()}` : annotationDraft.text.trim();
            await supabase.from('call_sheets').upsert(
              { project_id: activeProject.id, shoot_day: day, notes: combinedNotes, updated_by: auth.user.id, updated_at: new Date().toISOString() },
              { onConflict: 'project_id,shoot_day' }
            );
            toast(`Added to Day ${day}'s call sheet notes`, 'success');
          }
        }
      }

      // beat annotations claim to route to Studio's Beat Board
      // (project_beats) — unlike shot/todo, beats aren't scene-scoped, so
      // this doesn't need resolveLineToSceneId at all; it just creates the
      // beat directly. Title is a short lead-in from the note text so the
      // Beat Board card has something to show in its title row.
      if (annotationDraft.type === 'beat') {
        const text = annotationDraft.text.trim();
        const existing = await getProjectBeats(activeProject.id);
        await createProjectBeat({
          project_id: activeProject.id,
          title: text.length > 40 ? `${text.slice(0, 40)}…` : text,
          content: text,
          order_index: (existing || []).length,
        });
        toast('Beat added to the Beat Board', 'success');
      }

      reloadAnnotations(currentScript.id);
      setAnnotationDraft(null);
    } catch (e: any) {
      console.error('Failed to add annotation:', e);
    }
  }, [annotationDraft, currentScript?.id, activeProject, reloadAnnotations, toast]);

  const removeAnnotation = useCallback(async (id: string) => {
    if (!currentScript?.id) return;
    setAnnotations(prev => prev.filter(a => a.id !== id));
    try { await deleteAnnotation(id); } catch (e) { console.error('Failed to delete annotation:', e); reloadAnnotations(currentScript.id); }
  }, [currentScript?.id, reloadAnnotations]);

  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [elements, setElements] = useState<Record<string, string[]>>({});
  const [scripts, setScripts] = useState<StoredScript[]>([]);
  
  // UI States
  // Workspace Layout State
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSidebar = localStorage.getItem('mc_editor_show_sidebar');
      const storedRightSidebar = localStorage.getItem('mc_editor_show_right_sidebar');
      if (storedSidebar !== null) setShowSidebar(storedSidebar === '1');
      if (storedRightSidebar !== null) setShowRightSidebar(storedRightSidebar === '1');
    }
  }, []);

  const toggleSidebar = () => {
    setShowSidebar(prev => {
      const next = !prev;
      localStorage.setItem('mc_editor_show_sidebar', next ? '1' : '0');
      return next;
    });
  };

  const toggleRightSidebar = () => {
    setShowRightSidebar(prev => {
      const next = !prev;
      localStorage.setItem('mc_editor_show_right_sidebar', next ? '1' : '0');
      return next;
    });
  };
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
  const [rightPanel, setRightPanel] = useState<RightPanelTab>('write');
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
  const [stashItems, setStashItems] = useState<StashItem[]>([]);
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
    getTitlePage(script.id).then(setTitlePage);
    getCharacterProfiles(script.id).then(setCharProfiles);
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

  const handleCreateNewScript = useCallback(async (title: string, initialContent: string = '') => {
    try {
      const s = await saveScript({ title, content: initialContent, project_id: activeProject?.id });
      if (s) {
        try {
          await logActivity(`created screenplay "${title}"`, 'script', s.id);
        } catch (e) {
          console.error('Failed to log activity for new script', e);
        }
      }
      return s;
    } catch (e) {
      console.error('Failed to create script:', e);
      return null;
    }
  }, [activeProject?.id]);

  // Unified initialization and project sync
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const projectId = activeProject?.id;
      const all = await getAllScripts(projectId);
      if (cancelled) return;
      setScripts(all);

      if (projectId) {
        // We have an active project — ensure a script exists for it and load it
        let row = all.find(s => s.project_id === projectId);
        if (!row) {
          const { data: auth } = await supabase.auth.getUser();
          const uid = auth.user?.id;
          const ins = await supabase
            .from('scripts')
            .insert({ project_id: projectId, title: activeProject.title, content: '', format: activeProject.settings?.defaultScriptFormat || 'feature', status: 'draft', created_by: uid, last_edited_by: uid })
            .select('*')
            .single();
          if (ins.data) {
            row = {
              id: ins.data.id, title: ins.data.title, content: ins.data.content,
              createdAt: ins.data.created_at, updatedAt: ins.data.updated_at, project_id: ins.data.project_id
            };
            setScripts(prev => [row!, ...prev]);
            if (uid) console.log('Script created for project');
          }
        }
        
        if (cancelled || !row) return;
        if (currentScript?.id === row.id) return; // already loaded
        
        handleLoadScript(row);
        toast(`Editing “${activeProject.title}” screenplay`, 'info');
      } else {
        // No active project (rare but possible) — just load latest or create empty
        if (all.length > 0) {
          const latest = all[0];
          if (currentScript?.id !== latest.id) {
             handleLoadScript(latest);
          }
        } else {
          const fresh = await createNewScript('My First Screenplay');
          if (fresh) {
            setCurrentScript(fresh);
            setScripts([fresh]);
            setContent('');
            setSessionStartWords(0);
          }
        }
      }
    };
    init();
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

  // Web Worker Parser Hook
  const workerRef = useRef<Worker | null>(null);
  
  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('@/lib/scriptos/parser.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      if (e.data.success) {
        const result = e.data.result;
        setLines(result.lines);
        
        if (result.elements) {
          setElements(result.elements);
        }
        
        if (result.charStats) {
          // charStats is already computed in the worker if we move it there, 
          // or we can compute it here. Currently it's computed here.
          setCharStats(analyzeCharacters(result.lines, result.scenes));
        }
        
        setLintIssues(validateScript(result.lines, content));
      } else {
        console.error("Parser worker error:", e.data.error);
      }
    };
    
    return () => {
      workerRef.current?.terminate();
    };
  }, [content]); // need content for lintIssues, though it's better to pass it to state

  // Debounced sending of content to worker
  useEffect(() => {
    if (content) {
      const timeoutId = setTimeout(() => {
        workerRef.current?.postMessage({ text: content, format: 'screenplay' });
      }, 400); // 400ms debounce
      return () => clearTimeout(timeoutId);
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
      const local = await getRevisions(currentScript.id);
      setRevisions(remote.length > 0 ? remote : local);
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
      const { revision } = await createRevision(currentScript.id, content);
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

  // Each scene slug's real character offset in `content`, found once via a
  // single forward pass (cursor only ever advances) — the single source of
  // truth both jumpToScene and reorderScenes key off, so a repeated slug
  // (a flashback returning to "INT. COFFEE SHOP - DAY") always resolves to
  // its own occurrence instead of whichever one text search happens to hit.
  const scenePositions = useMemo(() => {
    let cursor = 0;
    const positions: number[] = [];
    for (const s of scenesList) {
      const idx = content.toUpperCase().indexOf(s.text.toUpperCase(), cursor);
      if (idx < 0) { positions.push(-1); continue; }
      positions.push(idx);
      cursor = idx + s.text.length;
    }
    return positions;
  }, [scenesList, content]);

  // Jump from a plot card / outline row / Story Map rail straight to that
  // scene in the writing view (Arc Studio Pro-style board↔script navigation).
  // Keyed by scene index (via scenePositions), not by re-searching for the
  // slug's text, so a repeated scene heading always opens its own occurrence.
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

  // Reorder whole scenes by rewriting the script text — dragging a card on the
  // board (or the always-visible Story Map rail) physically moves that scene
  // (heading + body) to the new position.
  const reorderScenes = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    if (scenePositions.some(p => p < 0)) return; // bail if any scene couldn't be located cleanly
    const positions = scenePositions;
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
    let lastMatchedIdx = -1;
    for (let i = 0; i <= cursorLine && i < lines.length; i++) {
      if (lines[i].type === 'slug') lastMatchedIdx = i;
    }
    return lastMatchedIdx;
  }, [cursorLine, lines]);

  useEffect(() => {
    updateScenePresence(currentSceneIdx);
  }, [currentSceneIdx, updateScenePresence]);


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

            {/* Persistent active-project indicator — a direct nav to /editor
                (bookmark, new tab) has no route param of its own, so without
                this there's no always-visible confirmation of which
                project's script is loaded (only a transient toast on
                switch). Click jumps to that project's hub, where the
                taskbar's own project switcher lives if you need to change it. */}
            {activeProject && (
              <Link
                href={`/projects/${activeProject.id}`}
                title="Open this project's hub"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
                  color: activeProject.accent_color || '#d7340b',
                  background: `${activeProject.accent_color || '#d7340b'}14`,
                  border: `1px solid ${activeProject.accent_color || '#d7340b'}30`,
                  padding: '4px 10px', borderRadius: 9999, textDecoration: 'none',
                  maxWidth: 160, overflow: 'hidden',
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: activeProject.accent_color || '#d7340b', flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeProject.title}</span>
              </Link>
            )}

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={toggleSidebar}
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
              { icon: Settings,   title: 'Tools Panel', onClick: toggleRightSidebar },
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
                scripts={scripts} setScripts={setScripts} createNewScript={handleCreateNewScript}
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
                  const isCurrentLine = i === cursorLine;
                  const lineAnnotations = annotations.filter(a => a.line_index === i);
                  return (
                    <div key={i} style={{
                      position: 'relative',
                      color, fontWeight: bold ? 700 : 400,
                      background: isReadingLine ? 'rgba(215, 52, 11,0.14)' : isCurrentLine ? 'rgba(255,255,255,0.035)' : undefined,
                      boxShadow: isReadingLine ? 'inset 3px 0 0 var(--accent)' : isCurrentLine ? 'inset 2px 0 0 rgba(255,255,255,0.25)' : undefined,
                    }}>
                      {lineText.length ? lineText : ' '}
                      {lineAnnotations.map((a, ai) => {
                        const meta = ANNOTATION_META[a.type];
                        return (
                          <span
                            key={a.id}
                            title={`${meta.label}: ${a.text}\nRoutes to: ${meta.routesTo}\n(click to remove)`}
                            onClick={() => removeAnnotation(a.id)}
                            style={{
                              position: 'absolute', left: -22 - ai * 14, top: 3, width: 9, height: 9, borderRadius: '50%',
                              background: meta.color, boxShadow: `0 0 6px ${meta.color}99`, cursor: 'pointer', pointerEvents: 'auto',
                            }}
                          />
                        );
                      })}
                      {isCurrentLine && !annotationDraft && (
                        <span
                          onClick={() => setAnnotationDraft({ line: i, type: 'note', text: '' })}
                          title="Add margin note"
                          style={{
                            position: 'absolute', left: -22, top: 2, width: 11, height: 11, borderRadius: '50%',
                            border: '1px dashed rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.5)',
                            fontSize: 9, lineHeight: '10px', textAlign: 'center', cursor: 'pointer', pointerEvents: 'auto',
                          }}
                        >+</span>
                      )}
                      {isCurrentLine && annotationDraft?.line === i && (
                        <div
                          style={{
                            position: 'absolute', left: -22, top: 18, zIndex: 30, width: 220,
                            background: 'rgba(10,10,10,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                            padding: 10, pointerEvents: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                            {ANNOTATION_TYPES.map(t => (
                              <button
                                key={t}
                                onClick={() => setAnnotationDraft(d => d ? { ...d, type: t } : d)}
                                style={{
                                  fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 0.5, textTransform: 'uppercase',
                                  padding: '3px 7px', borderRadius: 99, cursor: 'pointer',
                                  background: annotationDraft.type === t ? `${ANNOTATION_META[t].color}2e` : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${annotationDraft.type === t ? ANNOTATION_META[t].color : 'rgba(255,255,255,0.1)'}`,
                                  color: annotationDraft.type === t ? ANNOTATION_META[t].color : 'rgba(255,255,255,0.5)',
                                }}
                              >{ANNOTATION_META[t].label}</button>
                            ))}
                          </div>
                          <input
                            autoFocus
                            value={annotationDraft.text}
                            onChange={e => setAnnotationDraft(d => d ? { ...d, text: e.target.value } : d)}
                            onKeyDown={e => { if (e.key === 'Enter') submitAnnotation(); if (e.key === 'Escape') setAnnotationDraft(null); }}
                            placeholder={`Routes to ${ANNOTATION_META[annotationDraft.type].routesTo}...`}
                            style={{ width: '100%', padding: '6px 8px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', fontSize: 11, marginBottom: 8 }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={submitAnnotation} disabled={!annotationDraft.text.trim()} style={{ flex: 1, background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: 6, padding: '5px', cursor: 'pointer', fontSize: 10 }}>Add</button>
                            <button onClick={() => setAnnotationDraft(null)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#888', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 10 }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleEditorChange}
                onKeyDown={handleEditorKeyDown}
                onSelect={e => {
                  const ta = e.target as HTMLTextAreaElement;
                  broadcastCursor(ta.selectionStart);
                  setCursorLine(ta.value.substring(0, ta.selectionStart).split('\n').length - 1);
                }}
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

              {/* Status bar — names the current element and hints the
                  conventional next keystroke, so the writer never has to
                  guess what Tab/Enter will do mid-scene. */}
              {!focusMode && (() => {
                const currentType = lines[cursorLine]?.type || 'empty';
                const status = ELEMENT_STATUS[currentType] || ELEMENT_STATUS.empty;
                const color = TYPE_COLORS[currentType] || 'rgba(224, 221, 174,0.6)';
                return (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 16px', background: 'rgba(8,8,8,0.9)', borderTop: '1px solid rgba(255,255,255,0.06)',
                    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 0.5,
                  }}>
                    <span style={{ color, textTransform: 'uppercase', fontWeight: 700 }}>{status.label}</span>
                    <span style={{ color: 'rgba(224, 221, 174,0.4)' }}>{status.hint}</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Live structure rail — Save-the-Cat-style milestone overlay, a
              pacing flag, and where the current scene sits, surfaced in the
              margin instead of buried in a Stats tab. */}
          {/* Live structure rail — Save-the-Cat-style milestone overlay, a
              pacing flag, and where the current scene sits, surfaced in the
              margin instead of buried in a Stats tab. */}
          {activeView === 'write' && !focusMode && (
            <div style={{
              position: 'fixed',
              left: showSidebar && !isMobile ? 288 : 40,
              top: 120,
              bottom: 80,
              width: 2,
              background: 'rgba(255,255,255,0.03)',
              zIndex: 10,
              transition: 'left 0.35s ease'
            }}>
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

              {/* Save-the-Cat milestone labels */}
              {[
                { pct: 10, label: 'Setup' },
                { pct: 25, label: 'Break into Two' },
                { pct: 50, label: 'Midpoint' },
                { pct: 75, label: 'Break into Three' },
                { pct: 90, label: 'Finale' },
              ].map(m => (
                <div
                  key={m.label}
                  title={m.label}
                  style={{
                    position: 'absolute',
                    top: `${m.pct}%`,
                    left: -3,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.25)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    transform: 'translateY(-50%)',
                    cursor: 'help',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--accent)';
                    const txt = e.currentTarget.querySelector('span');
                    if (txt) {
                      txt.style.color = '#fff';
                      txt.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                    const txt = e.currentTarget.querySelector('span');
                    if (txt) {
                      txt.style.color = 'rgba(255,255,255,0.35)';
                      txt.style.opacity = '0.7';
                    }
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    left: 16,
                    top: -5,
                    fontFamily: 'var(--mono)',
                    fontSize: 8.5,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.35)',
                    opacity: 0.7,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s, opacity 0.2s'
                  }}>
                    {m.label}
                  </span>
                </div>
              ))}

              {/* Where the cursor currently sits */}
              {scenesList.length > 0 && currentSceneIdx >= 0 && (
                <div style={{ position: 'absolute', top: `${(currentSceneIdx / scenesList.length) * 100}%`, left: -5, width: 12, height: 12, marginTop: -6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} title={`Now writing: ${scenesList[currentSceneIdx]?.text}`} />
              )}

              {/* Pacing flag — Act II (25%-75%) word share vs. the rest */}
              {(() => {
                if (scenesList.length < 4) return null;
                const inAct2 = (idx: number) => { const p = (idx / scenesList.length) * 100; return p >= 25 && p < 75; };
                let act2Words = 0, totalWords = 0;
                sceneWordCounts.forEach((wc, idx) => { totalWords += wc; if (inAct2(idx)) act2Words += wc; });
                if (totalWords === 0) return null;
                const act2Share = act2Words / totalWords;
                if (act2Share < 0.55) return null;
                return (
                  <div style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 0.5, color: '#eab308', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 4, padding: '3px 6px', whiteSpace: 'nowrap' }}>
                    Act II lagging · {Math.round(act2Share * 100)}% of words
                  </div>
                );
              })()}
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
                      <LinePreview line={line} index={i} nightModePreview={nightModePreview} sceneNumber={line.type === 'slug' ? scenesList.indexOf(line) + 1 : undefined} showSceneNumbers={showSceneNumbers} />
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
                  handleLockRevision={handleLockRevision} handleRestoreRevision={(text: string) => setContent(text)} revisions={revisions} content={content}
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
