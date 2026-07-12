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
import { loadTitlePage, saveTitlePage, getDefaultTitlePage, type TitlePage } from '@/lib/scriptos/titlepage';
import { validateScript, type LintIssue } from '@/lib/scriptos/validator';
import { loadCharacterProfiles, saveCharacterProfiles, mergeProfiles, type CharacterProfile } from '@/lib/scriptos/bible';
import type { ScriptLine, LineType } from '@/types/screenplay';
import { useToast } from '@/components/Toast';
import { useScriptSync } from '@/lib/scriptos/sync';
import { useProject } from '@/lib/os';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { supabase } from '@/lib/supabase/client';
import { useOSGate } from '@/lib/os';
import { getCastingsForProject, setCasting, removeCasting, type Casting } from '@/lib/supabase/casting';
import { listAnnotations, addAnnotation, deleteAnnotation, ANNOTATION_META, ANNOTATION_TYPES, type ScriptAnnotation, type AnnotationType } from '@/lib/supabase/annotations';
import { logAuditAction } from '@/lib/supabase/audit';
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
import { awaitOSUser } from '@/lib/os';
import {
  PRINT_COLORS, TEMPLATES, PLACEHOLDER, TRANSITIONS, ELEMENT_STATUS,
  MAX_HISTORY, TAB_TYPE_CYCLE, stripLineDecoration, toSentenceCase,
  transformLineForType, LinePreview,
} from '@/components/editor/editorPageParts';
import type { EditorCtx } from './editorCtx';

export function EditorHeader({ ctx }: { ctx: EditorCtx }) {
  const { activeProject, activeView, currentScript, handleExport, handleLockRevision, handleSave, revisionMode, saving, sessionWordsWritten, setActiveView, setCurrentScript, setFocusMode, setRevisionMode, setShowCharBible, setShowFormatMenu, setShowRightSidebar, setShowShortcuts, setShowSidebar, showFormatMenu, showRightSidebar, showSidebar, toggleDualDialogue } = ctx;
  return (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/" style={{ color: 'var(--fg-muted)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}>
              <ArrowLeft size={18} />
            </Link>

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

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

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
  );
}
