'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Save, Download, FileText, Plus, ChevronDown, Loader, Wand2, 
  Book, Clock, Users, AlertCircle, FileUp, Settings, HelpCircle, History,
  Maximize, Minimize, LayoutDashboard, Type, List, Target, Play, Pause,
  Tags, Bookmark, MessageSquare, SplitSquareHorizontal, Edit3,
  Search, Replace, X, BarChart3, Lock
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { parseScript } from '@/lib/scriptos/parser';
import { saveScript, getAllScripts, createNewScript, importScriptFromText, type StoredScript } from '@/lib/scriptos/storage';
import { exportScriptAsText, exportScriptAsFdx, exportScriptAsPdf } from '@/lib/scriptos/export';
import { REVISION_COLORS, getRevisions, createRevision, type Revision } from '@/lib/scriptos/revisions';
import { analyzeCharacters, type CharacterStats } from '@/lib/scriptos/characters';
import { loadTitlePage, saveTitlePage, getDefaultTitlePage, type TitlePage } from '@/lib/scriptos/titlepage';
import { validateScript, type LintIssue } from '@/lib/scriptos/validator';
import { loadCharacterProfiles, saveCharacterProfiles, mergeProfiles, type CharacterProfile } from '@/lib/scriptos/bible';
import type { ScriptLine } from '@/types/screenplay';
import { useToast } from '@/components/Toast';
import { useScriptSync } from '@/lib/scriptos/sync';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const TYPE_COLORS: Record<string, string> = {
  slug: '#ff3c00',
  character: '#ffaa00',
  dialogue: 'var(--fg)',
  parenthetical: 'rgba(240,236,228,0.5)',
  transition: '#888',
  action: 'rgba(240,236,228,0.75)',
  note: '#eab308'
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

const PLACEHOLDER = `FADE IN:

INT. COFFEE SHOP - DAY

The kind of place that hasn't changed in forty years. Good.

JANE (30s, sharp eyes, cheap suit) sits at a corner table,
typing furiously on a laptop that's seen better days.

JANE
(to herself)
Got it. The perfect opening line.

[[NOTE: Ensure Jane's coffee looks untouched.]]

She leans back. Takes a long sip of cold coffee.

CUT TO:`;

// ============================================================================
// COMPONENTS
// ============================================================================

function LinePreview({ line, index }: { line: ScriptLine; index: number }) {
  const style: React.CSSProperties = {
    fontFamily: 'Courier Prime, Courier, monospace',
    fontSize: 14,
    lineHeight: '1.7',
    color: TYPE_COLORS[line.type] || 'var(--fg)',
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
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');
  const [currentScript, setCurrentScript] = useState<StoredScript | null>(null);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [elements, setElements] = useState<Record<string, string[]>>({});
  const [scripts, setScripts] = useState<StoredScript[]>([]);
  
  // UI States
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
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

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState(0);

  // Panels
  const [rightPanel, setRightPanel] = useState<'tools' | 'characters' | 'revisions' | 'lint' | 'stash'>('tools');
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
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sessionStartWords, setSessionStartWords] = useState(0);
  const [showGoToScene, setShowGoToScene] = useState(false);
  const [goToSceneNum, setGoToSceneNum] = useState('');
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [nightModePreview, setNightModePreview] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [stashItems, setStashItems] = useState<{id: string, text: string, date: number}[]>([]);
  const [sceneColors, setSceneColors] = useState<Record<string, string>>({});
  const [showDiff, setShowDiff] = useState(false);
  const [diffRevisionId, setDiffRevisionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Realtime Sync
  const { isSyncing, lastSyncedAt } = useScriptSync(currentScript?.id || '', content, (newContent) => {
    // Only update if it's different to avoid cursor jumping
    if (newContent !== content) {
      setContent(newContent);
    }
  });

  // Init
  useEffect(() => {
    const all = getAllScripts();
    setScripts(all);
    if (all.length > 0) {
      const latest = all[all.length - 1];
      setCurrentScript(latest);
      setContent(latest.content || PLACEHOLDER);
      setTitlePage(loadTitlePage(latest.id));
      setCharProfiles(loadCharacterProfiles(latest.id));
      setSessionStartWords((latest.content || PLACEHOLDER).split(/\s+/).filter(Boolean).length);
    } else {
      const fresh = createNewScript('My First Screenplay');
      setCurrentScript(fresh);
      setScripts([fresh]);
      setContent(PLACEHOLDER);
      setSessionStartWords(PLACEHOLDER.split(/\s+/).filter(Boolean).length);
    }
  }, []);

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

  // Load revisions when script changes
  useEffect(() => {
    if (currentScript) {
      setRevisions(getRevisions(currentScript.id));
    }
  }, [currentScript]);

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
    const timer = setTimeout(() => {
      saveScript({ id: currentScript.id, title: currentScript.title, content });
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
  const handleSave = useCallback(() => {
    if (!currentScript) return;
    setSaving(true);
    saveScript({ id: currentScript.id, title: currentScript.title, content });
    setTimeout(() => {
      setSaving(false);
      toast('Screenplay saved.', 'success');
    }, 400);
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
      exportScriptAsPdf({ ...currentScript, content });
      toast('Generating PDF...', 'success');
    } else {
      toast(`Exporting as ${format.toUpperCase()} (Pro Feature)`, 'info');
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

  const handleLockRevision = useCallback(() => {
    if (!currentScript) return;
    const rev = createRevision(currentScript.id, content);
    setRevisions(prev => [...prev, rev]);
    toast(`Locked as ${rev.label}`, 'success');
  }, [currentScript, content, toast]);

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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, focusMode, showFindReplace, showFormatMenu, showGoToScene, showShortcuts]);

  // Import .fountain / .txt file
  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const title = file.name.replace(/\.(fountain|txt|fdx)$/i, '');
      const imported = importScriptFromText(text, title);
      setScripts(prev => [...prev, imported]);
      setCurrentScript(imported);
      setContent(text);
      toast(`Imported "${title}"`, 'success');
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
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
    if (e.key === 'Tab') {
      e.preventDefault();
      const editor = textareaRef.current;
      if (!editor) return;
      const cursor = editor.selectionStart;
      const currentLine = content.substring(0, cursor).split('\n').pop() || '';
      const trimmed = currentLine.trim();

      // If empty line, insert a scene heading template
      if (!trimmed) {
        insertElement('scene');
        return;
      }
      // If uppercase short text (likely a character), insert dialogue below
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 1 && trimmed.length < 40) {
        const after = content.substring(cursor);
        setContent(content.substring(0, cursor) + '\n' + after);
        setTimeout(() => {
          editor.focus();
          editor.setSelectionRange(cursor + 1, cursor + 1);
        }, 0);
        return;
      }
      // Default: insert 4 spaces (standard tab)
      const before = content.substring(0, cursor);
      const after = content.substring(editor.selectionEnd);
      setContent(before + '    ' + after);
      setTimeout(() => {
        editor.focus();
        editor.setSelectionRange(cursor + 4, cursor + 4);
      }, 0);
    }
  }, [content]);

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

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    
    const cursor = e.target.selectionStart;
    const currentLine = val.substring(0, cursor).split('\n').pop() || '';
    const trimmed = currentLine.trim();
    
    if (currentLine.match(/^(INT\.|EXT\.)\s/)) {
      // Location autocomplete
      const locations = [...new Set(lines.filter(l => l.type === 'slug').map(l => l.text.split('-')[0].replace(/^(INT\.|EXT\.)\s/, '').trim()))];
      if (locations.length > 0 && currentLine.length < 15) {
        setAutocompleteItems(locations);
        setShowAutocomplete(true);
        setCursorPos({ top: 100, left: 200 });
      }
    } else if (trimmed.length >= 2 && trimmed === trimmed.toUpperCase() && !trimmed.includes('.') && !trimmed.includes(':')) {
      // Character name autocomplete - suggest known characters matching prefix
      const matchingChars = chars.filter(c => c.toUpperCase().startsWith(trimmed) && c.toUpperCase() !== trimmed);
      if (matchingChars.length > 0) {
        setAutocompleteItems(matchingChars);
        setShowAutocomplete(true);
        setCursorPos({ top: 100, left: 200 });
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  // Stats
  const scenesList = useMemo(() => lines.filter(l => l.type === 'slug'), [lines]);
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

  // Board card colors (cycle through a palette)
  const CARD_COLORS = ['#ff3c00', '#0099ff', '#00cc66', '#ff6b9d', '#ffd43b', '#a855f7', '#f97316', '#06b6d4'];
  const sessionWordsWritten = Math.max(0, wordCount - sessionStartWords);

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
    <div style={{ minHeight: '100vh', background: '#050505', color: 'var(--fg)', display: 'flex', flexDirection: 'column' }}>

      {/* TOOLBAR */}
      {!focusMode && (
        <header style={{
          position: 'sticky', top: 0,
          background: '#0a0a0a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 24px',
          height: 64,
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
                <span style={{ fontWeight: 600 }}>{currentScript?.title || 'Untitled'}</span>
              </button>
              
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: revisionMode ? 'rgba(0,153,255,0.1)' : 'rgba(255,255,255,0.05)', color: revisionMode ? '#0099ff' : 'var(--fg-subtle)', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }} onClick={() => setRevisionMode(!revisionMode)}>
                {revisionMode ? 'Blue Revision' : 'Draft Mode'}
              </span>
            </div>
          </div>

          {/* Center: View Switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 4 }}>
            <button onClick={() => setActiveView('write')} style={{ padding: '6px 16px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: 'none', background: activeView === 'write' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeView === 'write' ? '#fff' : 'var(--fg-muted)', cursor: 'pointer' }}>
              <Type size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Write
            </button>
            <button onClick={() => setActiveView('board')} style={{ padding: '6px 16px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: 'none', background: activeView === 'board' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeView === 'board' ? '#fff' : 'var(--fg-muted)', cursor: 'pointer' }}>
              <LayoutDashboard size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Board
            </button>
            <button onClick={() => setActiveView('outline')} style={{ padding: '6px 16px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: 'none', background: activeView === 'outline' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeView === 'outline' ? '#fff' : 'var(--fg-muted)', cursor: 'pointer' }}>
              <List size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Outline
            </button>
            <button onClick={() => setActiveView('preview')} style={{ padding: '6px 16px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: 'none', background: activeView === 'preview' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeView === 'preview' ? '#fff' : 'var(--fg-muted)', cursor: 'pointer' }}>
              <FileText size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Preview
            </button>
            <button onClick={() => setActiveView('stats')} style={{ padding: '6px 16px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: 'none', background: activeView === 'stats' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeView === 'stats' ? '#fff' : 'var(--fg-muted)', cursor: 'pointer' }}>
              <BarChart3 size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Stats
            </button>
          </div>

          {/* Right: Tools & Export */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            
            {/* Session word count */}
            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: sessionWordsWritten > 0 ? '#00cc66' : 'var(--fg-muted)', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
              +{sessionWordsWritten}w
            </span>

            <button onClick={() => setShowShortcuts(true)} className="link-btn" title="Keyboard Shortcuts (Ctrl+/)" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)' }}>
              <HelpCircle size={14} />
            </button>
            <button onClick={() => setShowCharBible(true)} className="link-btn" title="Character Bible" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)' }}>
              <Users size={14} />
            </button>
            <button onClick={() => setFocusMode(true)} className="link-btn" title="Focus Mode" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)' }}>
              <Maximize size={14} />
            </button>
            <button onClick={() => setShowRightSidebar(!showRightSidebar)} className="link-btn" title="Tools" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)' }}>
              <Settings size={14} />
            </button>
            <button onClick={handleLockRevision} className="link-btn" title="Lock Revision" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)' }}>
              <Lock size={14} />
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFormatMenu(!showFormatMenu)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', background: 'var(--accent)', color: 'var(--bg)',
                  borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 12,
                  border: 'none', cursor: 'pointer'
                }}
              >
                <Download size={14} /> Export <ChevronDown size={14} />
              </button>

              {showFormatMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-sm)', padding: 6, minWidth: 160, zIndex: 100,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                  {['fountain', 'fdx', 'pdf', 'txt'].map(fmt => (
                    <button key={fmt} onClick={() => handleExport(fmt)} style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                      background: 'transparent', border: 'none', color: 'var(--fg)',
                      fontSize: 12, cursor: 'pointer', borderRadius: 4, textTransform: 'uppercase',
                      fontWeight: 500
                    }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      Export .{fmt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: 'var(--fg)',
                borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 12,
                border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1
              }}
            >
              {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            </button>
          </div>
        </header>
      )}

      {/* FIND & REPLACE BAR */}
      <AnimatePresence>
        {showFindReplace && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Search size={14} style={{ color: 'var(--fg-muted)' }} />
            <input value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..." style={{ flex: 1, maxWidth: 240, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
            <input value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace..." style={{ flex: 1, maxWidth: 240, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{findCount} found</span>
            <button onClick={handleFindReplaceOne} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 4, padding: '5px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Replace</button>
            <button onClick={handleFindReplace} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 4, padding: '5px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>All</button>
            <button onClick={() => setShowFindReplace(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT NAVIGATOR (Scenes & Documents) */}
        <AnimatePresence>
          {showSidebar && !focusMode && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              style={{
                width: 260, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
              }}
            >
              {/* Script Switcher */}
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => {
                  const s = createNewScript('Untitled Script');
                  setScripts([...scripts, s]);
                  setCurrentScript(s);
                  setContent('');
                }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  padding: '8px', borderRadius: 6, color: 'var(--fg)', fontSize: 12, cursor: 'pointer'
                }}>
                  <Plus size={14} /> New Script
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', padding: '6px', borderRadius: 6, color: 'var(--fg-muted)', fontSize: 10, cursor: 'pointer' }}>
                    <FileUp size={12} /> Import
                  </button>
                  <button onClick={() => setShowTitleEditor(!showTitleEditor)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', padding: '6px', borderRadius: 6, color: 'var(--fg-muted)', fontSize: 10, cursor: 'pointer' }}>
                    <Book size={12} /> Title Page
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".fountain,.txt,.fdx" onChange={handleImportFile} style={{ display: 'none' }} />
                {/* Templates */}
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 6 }}>Templates</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.keys(TEMPLATES).filter(k => k !== 'blank').map(key => (
                    <button key={key} onClick={() => {
                      const s = createNewScript(key.charAt(0).toUpperCase() + key.slice(1));
                      setScripts(prev => [...prev, s]);
                      setCurrentScript(s);
                      setContent(TEMPLATES[key]);
                      toast(`Created from "${key}" template`, 'success');
                    }} style={{ fontSize: 9, padding: '4px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, color: 'var(--fg-muted)', cursor: 'pointer', textTransform: 'capitalize' }}>{key}</button>
                  ))}
                </div>
              </div>

              {/* Scene Navigator */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4 }}>Navigator</div>
                
                {scenesList.length === 0 && <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', padding: 4 }}>No scenes detected.</div>}
                
                {scenesList.map((scene, i) => (
                  <button key={i} style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: 2,
                    background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
                    color: 'var(--fg)', display: 'flex', flexDirection: 'column', gap: 4
                  }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLORS.slug, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {showSceneNumbers ? `${i + 1}. ` : ''}{scene.text}
                    </div>
                    {/* Snippet of scene action if possible */}
                    <div style={{ fontSize: 10, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Scene {i + 1}
                    </div>
                  </button>
                ))}

                {/* Location Manager */}
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, marginTop: 16, marginLeft: 4 }}>Locations ({uniqueLocations.length})</div>
                {uniqueLocations.length === 0 && <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', padding: 4 }}>No locations detected.</div>}
                {uniqueLocations.slice(0, 20).map(([loc, count]) => (
                  <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px', marginBottom: 2, borderRadius: 4, background: 'transparent', fontSize: 11, color: 'var(--fg-muted)' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{loc}</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: '#666', flexShrink: 0, marginLeft: 8 }}>×{count}</span>
                  </div>
                ))}
              </div>
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
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleEditorChange}
              onKeyDown={handleEditorKeyDown}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              style={{
                flex: 1, padding: focusMode ? '100px 10%' : '60px 80px', paddingBottom: typewriterMode ? '60vh' : '60px', width: '100%', maxWidth: 900, margin: '0 auto',
                background: 'transparent', border: 'none', color: revisionMode ? '#0099ff' : '#e0e0e0',
                fontFamily: 'Courier Prime, Courier, monospace', fontSize: 16, lineHeight: 1.6,
                resize: 'none', outline: 'none'
              }}
            />
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
                      <LinePreview line={line} index={i} />
                    </React.Fragment>
                  );
                })
              )}
            </div>
          )}

          {activeView === 'board' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexWrap: 'wrap', gap: 20, alignContent: 'flex-start' }}>
              {scenesList.length === 0 ? (
                 <div style={{ width: '100%', textAlign: 'center', color: '#888', marginTop: 100, fontStyle: 'italic' }}>No scenes to display on board.</div>
              ) : scenesList.map((scene, i) => {
                const cardColor = CARD_COLORS[i % CARD_COLORS.length];
                const wc = sceneWordCounts[i] || 0;
                const estMins = Math.max(1, Math.round(wc / 185 * 0.8));
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{
                    width: 280, minHeight: 180, background: '#111', borderLeft: `3px solid ${cardColor}`,
                    border: '1px solid rgba(255,255,255,0.1)', borderLeftWidth: 3, borderLeftColor: cardColor,
                    borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Scene {i + 1}</span>
                      <span style={{ fontSize: 9, color: cardColor, fontFamily: 'var(--mono)' }}>{wc}w · ~{estMins}m</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: cardColor, marginBottom: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scene.text}</div>
                    <div style={{ flex: 1, fontSize: 12, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                       {lines.slice(lines.findIndex(l => l.id === scene.id) + 1, lines.findIndex(l => l.id === scene.id) + 5).filter(l => l.type === 'action').map(l => l.text).join(' ')}
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', gap: 6, paddingTop: 8 }}>
                      {/* Show characters in this scene */}
                      {(() => {
                        const startIdx = lines.findIndex(l => l.id === scene.id);
                        const endIdx = i + 1 < scenesList.length ? lines.findIndex(l => l.id === scenesList[i + 1].id) : lines.length;
                        const sceneChars = [...new Set(lines.slice(startIdx, endIdx).filter(l => l.type === 'character').map(l => l.text.trim()))];
                        return sceneChars.slice(0, 3).map(c => (
                          <span key={c} style={{ fontSize: 8, background: 'rgba(255,170,0,0.1)', color: TYPE_COLORS.character, padding: '2px 5px', borderRadius: 3, fontWeight: 600 }}>{c}</span>
                        ));
                      })()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {activeView === 'outline' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
              {/* Scene Filter Bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {(['all', 'int', 'ext', 'day', 'night'] as const).map(f => (
                  <button key={f} onClick={() => setSceneFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', background: sceneFilter === f ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)', color: sceneFilter === f ? '#fff' : 'var(--fg-muted)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>{f}</button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)', alignSelf: 'center' }}>{filteredScenes.length} scene{filteredScenes.length !== 1 ? 's' : ''}</span>
              </div>
              {/* Outline List */}
              {filteredScenes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', marginTop: 80, fontStyle: 'italic' }}>No scenes match the filter.</div>
              ) : (
                filteredScenes.map((scene, i) => {
                  const globalIdx = scenesList.indexOf(scene);
                  const startIdx = lines.findIndex(l => l.id === scene.id);
                  const endIdx = globalIdx + 1 < scenesList.length ? lines.findIndex(l => l.id === scenesList[globalIdx + 1].id) : lines.length;
                  const sceneLines = lines.slice(startIdx, endIdx);
                  const sceneChars = [...new Set(sceneLines.filter(l => l.type === 'character').map(l => l.text.trim()))];
                  const wc = sceneLines.reduce((s, l) => s + l.text.split(/\s+/).filter(Boolean).length, 0);
                  const actionPreview = sceneLines.filter(l => l.type === 'action').slice(0, 2).map(l => l.text).join(' ');
                  return (
                    <motion.div key={scene.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', flexShrink: 0, paddingTop: 2 }}>{globalIdx + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS.slug, textTransform: 'uppercase', marginBottom: 4 }}>{scene.text}</div>
                        {actionPreview && <div style={{ fontSize: 12, color: '#888', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actionPreview}</div>}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {sceneChars.map(c => (<span key={c} style={{ fontSize: 9, background: 'rgba(255,170,0,0.1)', color: TYPE_COLORS.character, padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>{c}</span>))}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>{wc}w</div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* STATISTICS DASHBOARD */}
          {activeView === 'stats' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={20} /> Script Analytics</div>
              
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
                {[
                  { label: 'Words', value: wordCount.toLocaleString(), color: '#0099ff' },
                  { label: 'Pages', value: `${pageEst}`, color: '#00cc66' },
                  { label: 'Scenes', value: `${scenesList.length}`, color: '#ff6b9d' },
                  { label: 'Characters', value: `${chars.length}`, color: '#ffd43b' },
                  { label: 'Runtime', value: `~${Math.ceil(pageEst * 0.8)}m`, color: '#a855f7' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: stat.color, fontFamily: 'var(--mono)' }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Dialogue/Action Split */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Dialogue vs Action</div>
                <div style={{ display: 'flex', gap: 2, borderRadius: 6, overflow: 'hidden', height: 24 }}>
                  <div style={{ width: `${dialogueRatio}%`, background: '#0099ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', transition: 'width 0.5s' }}>{dialogueRatio > 10 ? `${dialogueRatio}% Dialogue` : ''}</div>
                  <div style={{ width: `${100 - dialogueRatio}%`, background: '#ff3c00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', transition: 'width 0.5s' }}>{(100 - dialogueRatio) > 10 ? `${100 - dialogueRatio}% Action` : ''}</div>
                </div>
              </div>

              {/* Scene Pacing Visualization */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Scene Pacing</div>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 100, background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '8px 4px' }}>
                  {sceneWordCounts.map((wc, i) => {
                    const maxWc = Math.max(...sceneWordCounts, 1);
                    const height = Math.max(4, (wc / maxWc) * 80);
                    const color = CARD_COLORS[i % CARD_COLORS.length];
                    return (
                      <div key={i} title={`Scene ${i + 1}: ${wc} words`} style={{ flex: 1, height, background: color, borderRadius: '2px 2px 0 0', minWidth: 3, cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.8'} />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--fg-muted)', marginTop: 4 }}>
                  <span>Scene 1</span>
                  <span>Scene {scenesList.length}</span>
                </div>
              </div>

              {/* Act Structure Analysis */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Act Structure (Estimated)</div>
                {(() => {
                  const totalWc = sceneWordCounts.reduce((a, b) => a + b, 0) || 1;
                  let runningWc = 0;
                  const actBreaks = sceneWordCounts.map((wc, i) => {
                    runningWc += wc;
                    return { scene: i + 1, pct: (runningWc / totalWc) * 100 };
                  });
                  const act1End = actBreaks.findIndex(b => b.pct >= 25) + 1;
                  const act2End = actBreaks.findIndex(b => b.pct >= 75) + 1;
                  return (
                    <div style={{ display: 'flex', gap: 2, borderRadius: 6, overflow: 'hidden', height: 32 }}>
                      <div style={{ width: '25%', background: 'rgba(0,153,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0099ff' }}>ACT I (Sc 1-{act1End})</div>
                      <div style={{ width: '50%', background: 'rgba(255,60,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#ff3c00' }}>ACT II (Sc {act1End + 1}-{act2End})</div>
                      <div style={{ width: '25%', background: 'rgba(0,204,102,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#00cc66' }}>ACT III (Sc {act2End + 1}-{scenesList.length})</div>
                    </div>
                  );
                })()}
              </div>

              {/* Top Characters */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Top Characters by Dialogue</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {charStats.slice(0, 8).map((cs, i) => (
                    <div key={cs.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, fontSize: 11, fontWeight: 700, color: TYPE_COLORS.character, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cs.name}</div>
                      <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${cs.dialoguePercentage}%`, background: CARD_COLORS[i % CARD_COLORS.length], borderRadius: 3, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', width: 40, textAlign: 'right' }}>{cs.dialoguePercentage}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* INT/EXT & Day/Night Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Interior / Exterior</div>
                  {(() => {
                    const intCount = scenesList.filter(s => s.text.toUpperCase().includes('INT')).length;
                    const extCount = scenesList.filter(s => s.text.toUpperCase().includes('EXT')).length;
                    return (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: intCount || 1, background: '#0099ff', borderRadius: 4, padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>INT ({intCount})</div>
                        <div style={{ flex: extCount || 1, background: '#ff6b9d', borderRadius: 4, padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>EXT ({extCount})</div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Day / Night</div>
                  {(() => {
                    const dayCount = scenesList.filter(s => s.text.toUpperCase().includes('DAY')).length;
                    const nightCount = scenesList.filter(s => s.text.toUpperCase().includes('NIGHT')).length;
                    return (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: dayCount || 1, background: '#ffd43b', borderRadius: 4, padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#000' }}>DAY ({dayCount})</div>
                        <div style={{ flex: nightCount || 1, background: '#6366f1', borderRadius: 4, padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>NIGHT ({nightCount})</div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Lint Summary */}
              <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Script Health</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: lintIssues.filter(i => i.type === 'error').length === 0 ? '#00cc66' : '#ef4444' }}>{lintIssues.filter(i => i.type === 'error').length}</span>
                  <span style={{ fontSize: 10, color: 'var(--fg-muted)', alignSelf: 'center' }}>errors</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#eab308' }}>{lintIssues.filter(i => i.type === 'warning').length}</span>
                  <span style={{ fontSize: 10, color: 'var(--fg-muted)', alignSelf: 'center' }}>warnings</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{lintIssues.filter(i => i.type === 'info').length}</span>
                  <span style={{ fontSize: 10, color: 'var(--fg-muted)', alignSelf: 'center' }}>info</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR (Tabbed Panels) */}
        <AnimatePresence>
          {showRightSidebar && !focusMode && (
            <motion.div
              initial={{ x: 280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 280, opacity: 0 }}
              style={{ width: 280, background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
            >
              {/* Panel Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                {([['tools', Wand2], ['characters', Users], ['revisions', History], ['lint', AlertCircle]] as const).map(([key, Icon]) => (
                  <button key={key} onClick={() => setRightPanel(key as any)} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: 'none', borderBottom: rightPanel === key ? '2px solid var(--accent)' : '2px solid transparent', color: rightPanel === key ? '#fff' : 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    <Icon size={12} /> {key}{key === 'lint' && lintIssues.length > 0 ? ` (${lintIssues.length})` : ''}
                  </button>
                ))}
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24, flex: 1, overflowY: 'auto' }}>
                {/* TOOLS PANEL */}
                {rightPanel === 'tools' && (
                  <>
                    {/* Quick Insert */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
                        <Wand2 size={14} /> Quick Insert
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {['scene', 'action', 'character', 'dialogue', 'transition', 'note'].map(type => (
                          <button key={type} onClick={() => insertElement(type)} style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--fg)', fontSize: 11, fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>{type}</button>
                        ))}
                      </div>
                    </div>
                    {/* Sprint Timer */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 12, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} /> Sprint</div>
                        <button onClick={() => setSprintActive(!sprintActive)} style={{ background: 'transparent', border: 'none', color: sprintActive ? '#ff3c00' : '#0099ff', cursor: 'pointer' }}>{sprintActive ? <Pause size={14} /> : <Play size={14} />}</button>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', color: sprintActive ? '#fff' : 'var(--fg-muted)', textAlign: 'center' }}>{Math.floor(sprintTime / 60).toString().padStart(2, '0')}:{(sprintTime % 60).toString().padStart(2, '0')}</div>
                    </div>
                    {/* Goal Tracker */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}><span>Daily Goal</span><span style={{ color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{wordCount} / {dailyGoal}</span></div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', width: `${goalProgress}%`, background: goalProgress >= 100 ? '#00cc66' : '#0099ff', transition: 'width 0.5s' }} /></div>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    {/* Breakdown Analytics */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Breakdown</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Scenes</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{scenesList.length}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Characters</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{chars.length}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Est. Runtime</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>~{Math.ceil(pageEst * 0.8)} min</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Pages</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{pageEst}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Words</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{wordCount.toLocaleString()}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Dialogue/Action</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{dialogueRatio}% / {100 - dialogueRatio}%</span></div>
                      </div>
                    </div>
                    {/* View Options */}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={14} /> View Options</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                          <span>Typewriter Mode</span>
                          <input type="checkbox" checked={typewriterMode} onChange={e => setTypewriterMode(e.target.checked)} style={{ accentColor: '#0099ff' }} />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                          <span>Dark Mode (Preview)</span>
                          <input type="checkbox" checked={nightModePreview} onChange={e => setNightModePreview(e.target.checked)} style={{ accentColor: '#0099ff' }} />
                        </label>
                      </div>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    {/* Breakdown Tags */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Tags size={14} /> Elements</div>
                      {Object.keys(elements).length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>No elements detected yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {Object.entries(elements).map(([category, items]) => (
                            <div key={category}>
                              <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{category}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {items.map(item => (<span key={item} style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, color: '#fff' }}>{item}</span>))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* CHARACTER STATS PANEL */}
                {rightPanel === 'characters' && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> Character Report</div>
                    {charStats.length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>No characters detected yet.</div>
                    ) : (
                      charStats.slice(0, 15).map((cs, i) => (
                        <div key={cs.name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: TYPE_COLORS.character }}>{cs.name}</span>
                            <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{cs.dialoguePercentage}%</span>
                          </div>
                          {/* Dialogue bar */}
                          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${cs.dialoguePercentage}%`, background: TYPE_COLORS.character, borderRadius: 2 }} />
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 10, color: 'var(--fg-muted)' }}>
                            <span>{cs.dialogueLines} lines</span>
                            <span>{cs.dialogueWords} words</span>
                            <span>{cs.scenesIn.length} scenes</span>
                            <span>~{cs.avgWordsPerLine} w/line</span>
                          </div>
                          {/* Top relationships */}
                          {Object.keys(cs.speaksTo).length > 0 && (
                            <div style={{ marginTop: 8, fontSize: 10, color: '#666' }}>Shares scenes with: {Object.entries(cs.speaksTo).sort((a,b) => b[1]-a[1]).slice(0,3).map(([name]) => name).join(', ')}</div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}

                {/* REVISION HISTORY PANEL */}
                {rightPanel === 'revisions' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><History size={14} /> Revisions</div>
                      <button onClick={handleLockRevision} style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '4px 8px', color: '#fff', cursor: 'pointer' }}>Lock Current</button>
                    </div>
                    {revisions.length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>No revisions locked yet. Lock your first draft to start tracking changes.</div>
                    ) : (
                      revisions.map((rev, i) => {
                        const revColor = REVISION_COLORS[rev.colorIndex];
                        return (
                          <div key={rev.id} style={{ background: revColor.bg, border: `1px solid ${revColor.color}33`, borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: revColor.color }}>{rev.label}</span>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: revColor.color }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{new Date(rev.date).toLocaleString()}</div>
                            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{rev.snapshot.split('\n').length} lines · {rev.snapshot.split(/\s+/).filter(Boolean).length} words</div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {/* LINT / VALIDATION PANEL */}
                {rightPanel === 'lint' && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> Script Validation</div>
                    {/* Toggles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                        <span>Scene Numbers</span>
                        <input type="checkbox" checked={showSceneNumbers} onChange={e => setShowSceneNumbers(e.target.checked)} style={{ accentColor: '#0099ff' }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                        <span>DRAFT Watermark</span>
                        <input type="checkbox" checked={showWatermark} onChange={e => setShowWatermark(e.target.checked)} style={{ accentColor: '#0099ff' }} />
                      </label>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    {/* Issue summary */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{lintIssues.filter(i => i.type === 'error').length} errors</span>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>{lintIssues.filter(i => i.type === 'warning').length} warnings</span>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{lintIssues.filter(i => i.type === 'info').length} info</span>
                    </div>
                    {lintIssues.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#00cc66', fontStyle: 'italic', textAlign: 'center', padding: 16 }}>✓ No issues found. Script formatting looks great!</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {lintIssues.slice(0, 30).map((issue, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '8px 10px', borderLeft: `2px solid ${issue.type === 'error' ? '#ef4444' : issue.type === 'warning' ? '#eab308' : '#3b82f6'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 9, color: issue.type === 'error' ? '#ef4444' : issue.type === 'warning' ? '#eab308' : '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>{issue.type}</span>
                              <span style={{ fontSize: 9, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>L{issue.line}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#ccc' }}>{issue.message}</div>
                            <div style={{ fontSize: 9, color: '#666', marginTop: 2, fontFamily: 'var(--mono)' }}>{issue.rule}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* THE STASH PANEL */}
                {rightPanel === 'stash' && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bookmark size={14} /> The Stash</div>
                      <button onClick={() => {
                        const sel = textareaRef.current?.value.substring(textareaRef.current.selectionStart, textareaRef.current.selectionEnd);
                        if (sel) {
                          setStashItems(prev => [{ id: Math.random().toString(), text: sel, date: Date.now() }, ...prev]);
                          toast('Added to stash', 'success');
                        } else {
                          toast('Select text to stash', 'error');
                        }
                      }} style={{ fontSize: 9, background: 'rgba(255,255,255,0.05)', border: 'none', padding: '4px 8px', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>+ Add Selected</button>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 12, lineHeight: 1.4 }}>Save snippets, alt dialogue, or cut scenes here for later use.</div>
                    
                    {stashItems.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>Stash is empty.<br/><br/>Select text in the editor and click "+ Add Selected" to save it here.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {stashItems.map(item => (
                          <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '10px' }}>
                            <div style={{ fontSize: 11, color: '#ccc', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{ fontSize: 9, color: 'var(--fg-muted)' }}>{new Date(item.date).toLocaleDateString()}</span>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => {
                                  if (textareaRef.current) {
                                    const val = textareaRef.current.value;
                                    const start = textareaRef.current.selectionStart;
                                    const end = textareaRef.current.selectionEnd;
                                    setContent(val.substring(0, start) + item.text + val.substring(end));
                                    toast('Inserted from stash', 'success');
                                  }
                                }} style={{ fontSize: 9, background: 'transparent', border: 'none', color: '#0099ff', cursor: 'pointer', padding: 0 }}>Insert</button>
                                <button onClick={() => setStashItems(prev => prev.filter(i => i.id !== item.id))} style={{ fontSize: 9, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Autocomplete Popover (Basic implementation) */}
      {showAutocomplete && autocompleteItems.length > 0 && (
        <div style={{
          position: 'absolute', top: cursorPos.top, left: cursorPos.left,
          background: '#111', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: 4, zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          maxHeight: 200, overflowY: 'auto'
        }}>
          {autocompleteItems.map((item, idx) => (
            <div key={idx} style={{ padding: '6px 12px', fontSize: 12, color: 'var(--fg)', cursor: 'pointer' }}>
              {item}
            </div>
          ))}
        </div>
      )}

      {/* TITLE PAGE EDITOR MODAL */}
      <AnimatePresence>
        {showTitleEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTitleEditor(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 32, width: 480, maxHeight: '80vh', overflowY: 'auto' }}>
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 32, width: 680, maxHeight: '85vh', overflowY: 'auto' }}>
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
                    return (
                      <div key={name} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => setSelectedCharProfile(isSelected ? null : name)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CARD_COLORS[i % CARD_COLORS.length] }} />
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{stat ? `${stat.dialogueLines} lines · ${stat.scenesIn.length} scenes` : ''}</span>
                        </button>
                        {isSelected && (
                          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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

      {/* KEYBOARD SHORTCUTS MODAL */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowShortcuts(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 32, width: 420 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Keyboard Shortcuts</h2>
                <button onClick={() => setShowShortcuts(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Ctrl + S', 'Save script'],
                  ['Ctrl + F', 'Find & Replace'],
                  ['Ctrl + E', 'Toggle Focus Mode'],
                  ['Ctrl + G', 'Go to Scene'],
                  ['Ctrl + /', 'Show Shortcuts'],
                  ['Tab', 'Smart element insert'],
                  ['Escape', 'Close panels / Exit focus'],
                ].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 12, color: '#ccc' }}>{desc}</span>
                    <kbd style={{ fontSize: 11, fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4, color: '#fff', fontWeight: 600 }}>{key}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GO TO SCENE DIALOG */}
      <AnimatePresence>
        {showGoToScene && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: '#111', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '16px 20px', width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Go to Scene</div>
            <input autoFocus type="number" min={1} max={scenesList.length} value={goToSceneNum} onChange={e => setGoToSceneNum(e.target.value)} onKeyDown={e => {
              if (e.key === 'Enter') {
                const num = parseInt(goToSceneNum);
                if (num >= 1 && num <= scenesList.length) {
                  setActiveView('write');
                  setShowGoToScene(false);
                  setGoToSceneNum('');
                  toast(`Jumped to Scene ${num}`, 'success');
                }
              }
              if (e.key === 'Escape') setShowGoToScene(false);
            }} placeholder={`1 - ${scenesList.length}`} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'var(--mono)' }} />
            <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginTop: 6 }}>{scenesList.length} scenes · Press Enter to jump</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATUS BAR */}
      <div style={{ height: 28, background: '#000', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', zIndex: 50 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>{currentScript?.title || 'Untitled'}</span>
          <span>{revisionMode ? 'REVISION MODE' : 'DRAFT MODE'}</span>
          {sprintActive && <span style={{ color: '#0099ff' }}>SPRINT: {Math.floor(sprintTime / 60)}:{(sprintTime % 60).toString().padStart(2, '0')}</span>}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>Pg: {pageEst}</span>
          <span>Sc: {scenesList.length}</span>
          <span>Wds: {wordCount.toLocaleString()}</span>
          <span style={{ color: isSyncing ? '#0099ff' : '#00cc66' }}>{isSyncing ? '☁ SYNCING...' : '☁ SYNCED'}</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(240,236,228,0.15); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </div>
  );
}
