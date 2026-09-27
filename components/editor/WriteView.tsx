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
import { segments, type Mark } from '@/lib/breakdown/marks';
import type { CaretContext } from './breakdown/useEditorBreakdown';
import { TagBar } from './breakdown/TagBar';
import { readable } from '@/lib/color';
import { CutNoteMarkers } from './CutNoteMarkers';

const EDITOR_CHAR_WIDTH = 9.6; // Courier Prime at 16px

function markStyle(m: Mark): React.CSSProperties {
  const c = readable(m.color);
  return m.kind === 'tag'
    ? { background: `${m.color}33`, boxShadow: `inset 0 -2px 0 ${c}`, borderRadius: 2 }
    : { textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: c, textDecorationThickness: 2, textUnderlineOffset: 4 };
}

export function WriteView({ ctx }: { ctx: EditorCtx }) {
  const { bd, openBreakdown } = ctx;
  const [tagAt, setTagAt] = useState<{ ctx: CaretContext; top: number; left: number } | null>(null);
  const showMarks = bd.enabled && bd.mode;
  useEffect(() => { if (!showMarks) setTagAt(null); }, [showMarks]);

  /** Where the caret or selection is, for the tag bar (breakdown mode only). */
  const updateTagBar = (ta: HTMLTextAreaElement) => {
    if (!showMarks) return;
    const c = bd.caretContext(ta.value, ta.selectionStart, ta.selectionEnd);
    const lineEl = ctx.highlightRef.current?.children[c.line] as HTMLElement | undefined;
    if ((!c.selection && !c.mark) || c.sceneIdx < 0 || !lineEl) { setTagAt(null); return; }
    const col = ta.selectionStart - (ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1);
    setTagAt({
      ctx: c,
      top: lineEl.offsetTop - (ctx.highlightRef.current?.scrollTop ?? 0) + lineEl.offsetHeight + 6,
      // Under the selection, kept inside the page (the bar is up to 520px wide).
      left: Math.max(16, Math.min(lineEl.offsetLeft + col * EDITOR_CHAR_WIDTH - 24, (ctx.highlightRef.current?.clientWidth ?? 900) - 536)),
    });
  };

  const tagSelection = (categoryId: string) => {
    if (!tagAt?.ctx.selection) return;
    void bd.tagText(tagAt.ctx.sceneIdx, tagAt.ctx.selection, categoryId);
    setTagAt(null);
  };
  const acceptMark = (m: Mark, categoryId: string) => {
    if (!tagAt) return;
    void bd.tagText(tagAt.ctx.sceneIdx, m.name, categoryId);
    setTagAt(null);
  };
  const dropMark = (m: Mark) => {
    if (!tagAt) return;
    if (m.kind === 'tag' && m.elementId) void bd.untag(tagAt.ctx.sceneIdx, m.elementId);
    else void bd.dismiss(m.name);
    setTagAt(null);
  };

  /** Breakdown shortcuts; true when handled. */
  const breakdownKeys = (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyB') {
      e.preventDefault();
      if (!bd.enabled) { openBreakdown(); return true; }
      bd.setMode(!bd.mode);
      return true;
    }
    if (!showMarks || !tagAt) return false;
    const cats = bd.state.categories.rows;
    if (e.key === 'Escape') { e.preventDefault(); setTagAt(null); return true; }
    if (e.altKey && /^Digit[1-9]$/.test(e.code) && tagAt.ctx.selection) {
      const cat = cats[Number(e.code.slice(5)) - 1];
      if (cat) { e.preventDefault(); tagSelection(cat.id); return true; }
    }
    const m = tagAt.ctx.mark;
    if (e.altKey && e.key === 'Enter' && m?.kind === 'suggestion') { e.preventDefault(); acceptMark(m, m.categoryId); return true; }
    if (e.altKey && e.key === 'Backspace' && m) { e.preventDefault(); dropMark(m); return true; }
    return false;
  };

  const { annotationDraft, annotations, broadcastCursor, content, cursorLine, focusMode, handleEditorChange, handleEditorKeyDown, highlightRef, lines, pauseTableRead, removeAnnotation, resumeTableRead, revisionMode, setAnnotationDraft, setCursorLine, startTableRead, stopTableRead, submitAnnotation, tableReadLineIdx, tableReadPlaying, textareaRef, typewriterMode } = ctx;
  return (

            <div style={{ flex: 1, position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto' }}>
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
                {content.split('\n').map((lineText: any, i: number) => {
                  const type = lines[i]?.type;
                  const color = (type && TYPE_COLORS[type]) || (revisionMode ? '#0099ff' : '#e0e0e0');
                  const bold = type === 'slug' || type === 'character' || type === 'transition';
                  const isReadingLine = tableReadLineIdx === i;
                  const isCurrentLine = i === cursorLine;
                  const lineAnnotations = annotations.filter((a: any) => a.line_index === i);
                  return (
                    <div key={i} style={{
                      position: 'relative',
                      color, fontWeight: bold ? 700 : 400,
                      background: isReadingLine ? 'rgba(232, 67, 26,0.14)' : isCurrentLine ? 'rgba(255,255,255,0.035)' : undefined,
                      boxShadow: isReadingLine ? 'inset 3px 0 0 var(--accent)' : isCurrentLine ? 'inset 2px 0 0 rgba(255,255,255,0.25)' : undefined,
                    }}>
                      {!lineText.length ? ' ' : showMarks && bd.view.marks.has(i)
                        ? segments(lineText, bd.view.marks.get(i)).map((seg, si) => seg.mark
                          ? <span key={si} style={markStyle(seg.mark)}>{seg.text}</span>
                          : <React.Fragment key={si}>{seg.text}</React.Fragment>)
                        : lineText}
                      {lineAnnotations.map((a: any, ai: number) => {
                        const meta = ANNOTATION_META[a.type as keyof typeof ANNOTATION_META];
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
                            border: '1px dashed rgba(255,255,255,0.35)', color: 'var(--fg-dim)',
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
                                onClick={() => setAnnotationDraft((d: any) => d ? { ...d, type: t } : d)}
                                style={{
                                  fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 0.5, textTransform: 'uppercase',
                                  padding: '3px 7px', borderRadius: 99, cursor: 'pointer',
                                  background: annotationDraft.type === t ? `${ANNOTATION_META[t].color}2e` : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${annotationDraft.type === t ? ANNOTATION_META[t].color : 'var(--fg-dim)'}`,
                                  color: annotationDraft.type === t ? ANNOTATION_META[t].color : 'var(--fg-dim)',
                                }}
                              >{ANNOTATION_META[t].label}</button>
                            ))}
                          </div>
                          <input
                            autoFocus
                            value={annotationDraft.text}
                            onChange={e => setAnnotationDraft((d: any) => d ? { ...d, text: e.target.value } : d)}
                            onKeyDown={e => { if (e.key === 'Enter') submitAnnotation(); if (e.key === 'Escape') setAnnotationDraft(null); }}
                            placeholder={`Routes to ${ANNOTATION_META[annotationDraft.type as keyof typeof ANNOTATION_META].routesTo}...`}
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
                onChange={e => { setTagAt(null); handleEditorChange(e); }}
                onKeyDown={e => { if (!breakdownKeys(e)) handleEditorKeyDown(e); }}
                onSelect={e => {
                  const ta = e.target as HTMLTextAreaElement;
                  broadcastCursor(ta.selectionStart);
                  setCursorLine(ta.value.substring(0, ta.selectionStart).split('\n').length - 1);
                  updateTagBar(ta);
                }}
                onScroll={e => { if (highlightRef.current) highlightRef.current.scrollTop = e.currentTarget.scrollTop; setTagAt(null); }}
                onMouseUp={e => updateTagBar(e.currentTarget)}
                onKeyUp={e => { if (e.shiftKey || e.key.startsWith('Arrow')) updateTagBar(e.currentTarget); }}
                aria-label="Script"
                aria-describedby={showMarks ? 'tag-mode-help' : undefined}
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
              <CutNoteMarkers
                byLine={ctx.cutNotes.byLine} highlightRef={highlightRef} textareaRef={textareaRef} content={content}
                openLine={ctx.cutNotes.openLine} setOpenLine={ctx.cutNotes.setOpenLine}
                onResolve={ctx.cutNotes.resolve} canResolve={ctx.cutNotes.canResolve}
              />

              {showMarks && tagAt && (
                <TagBar
                  top={tagAt.top} left={tagAt.left}
                  selection={tagAt.ctx.selection} mark={tagAt.ctx.mark}
                  categories={bd.state.categories.rows}
                  onTag={(_, c) => tagSelection(c.id)}
                  onAccept={acceptMark}
                  onDismiss={dropMark}
                  onUntag={dropMark}
                  onOpen={(m) => { setTagAt(null); openBreakdown(m.elementId ?? null); }}
                  onClose={() => setTagAt(null)}
                />
              )}

              {showMarks && !focusMode && (
                <div id="tag-mode-help" style={{
                  position: 'absolute', top: 16, left: 16, zIndex: 5,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(8,8,8,0.85)', border: '1px solid rgba(232,67,26,0.35)',
                  borderRadius: 20, padding: '6px 12px', backdropFilter: 'blur(12px)',
                  fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: 0.5, color: 'var(--fg-muted)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} aria-hidden />
                  Tag mode — select words to tag them · underlined words are suggestions
                  <button type="button" onClick={() => bd.setMode(false)} style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, textDecoration: 'underline' }}>Exit</button>
                </div>
              )}

              {!focusMode && (
                <div style={{
                  position: 'absolute', top: 16, right: 16, zIndex: 5,
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(8,8,8,0.85)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20, padding: '6px 10px', backdropFilter: 'blur(12px)',
                }}>
                  <button type="button" aria-label={tableReadPlaying ? 'Pause table read' : 'Resume table read'}
                    onClick={() => (tableReadPlaying ? pauseTableRead() : (tableReadLineIdx != null ? resumeTableRead() : startTableRead(0)))}
                    title={tableReadPlaying ? 'Pause table read' : 'Play table read'}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {tableReadPlaying ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  {tableReadLineIdx != null && (
                    <button aria-label="Stop table read"
                      onClick={stopTableRead}
                      title="Stop table read"
                      style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>
                    Table Read
                  </span>
                </div>
              )}

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
                    <span style={{ color: 'var(--fg-dim)' }}>{status.hint}</span>
                  </div>
                );
              })()}
            </div>
          
  );
}
