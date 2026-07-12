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

export function WriteView({ ctx }: { ctx: EditorCtx }) {
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
                      background: isReadingLine ? 'rgba(215, 52, 11,0.14)' : isCurrentLine ? 'rgba(255,255,255,0.035)' : undefined,
                      boxShadow: isReadingLine ? 'inset 3px 0 0 var(--accent)' : isCurrentLine ? 'inset 2px 0 0 rgba(255,255,255,0.25)' : undefined,
                    }}>
                      {lineText.length ? lineText : ' '}
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
                                onClick={() => setAnnotationDraft((d: any) => d ? { ...d, type: t } : d)}
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
          
  );
}
