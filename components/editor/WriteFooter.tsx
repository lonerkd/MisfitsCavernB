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

export function WriteFooter({ ctx }: { ctx: EditorCtx }) {
  const { currentSceneIdx, sceneWordCounts, scenesList } = ctx;
  return (

            <div style={{ position: 'fixed', left: 40, top: 120, bottom: 80, width: 2, background: 'rgba(255,255,255,0.03)', zIndex: 0 }}>
              {scenesList.map((s: any, idx: number) => {
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

              {[
                { pct: 10, label: 'Setup' },
                { pct: 25, label: 'Break into Two' },
                { pct: 50, label: 'Midpoint' },
                { pct: 75, label: 'Break into Three' },
                { pct: 90, label: 'Finale' },
              ].map(m => (
                <div key={m.label} title={m.label} style={{ position: 'absolute', top: `${m.pct}%`, left: -1, width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', transform: 'translateY(-50%)' }}>
                  <span style={{ position: 'absolute', left: 10, top: -6, fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 0.5, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>{m.label}</span>
                </div>
              ))}

              {scenesList.length > 0 && currentSceneIdx >= 0 && (
                <div style={{ position: 'absolute', top: `${(currentSceneIdx / scenesList.length) * 100}%`, left: -5, width: 12, height: 12, marginTop: -6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} title={`Now writing: ${scenesList[currentSceneIdx]?.text}`} />
              )}

              {(() => {
                if (scenesList.length < 4) return null;
                const inAct2 = (idx: number) => { const p = (idx / scenesList.length) * 100; return p >= 25 && p < 75; };
                let act2Words = 0, totalWords = 0;
                sceneWordCounts.forEach((wc: any, idx: number) => { totalWords += wc; if (inAct2(idx)) act2Words += wc; });
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
          
  );
}
