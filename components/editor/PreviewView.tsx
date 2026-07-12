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

export function PreviewView({ ctx }: { ctx: EditorCtx }) {
  const { lines, nightModePreview, scenesList, showSceneNumbers, showWatermark, titlePage } = ctx;
  return (

            <div style={{ flex: 1, overflowY: 'auto', padding: '60px 80px', width: '100%', maxWidth: 850, margin: '20px auto', background: nightModePreview ? '#111' : '#fff', color: nightModePreview ? '#ddd' : '#000', boxShadow: '0 0 40px rgba(0,0,0,0.5)', borderRadius: 4, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 24, right: 40, fontSize: 10, color: '#999', fontFamily: 'Courier Prime, monospace' }}>Page 1</div>
              {showWatermark && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: 80, fontWeight: 900, color: 'rgba(0,0,0,0.04)', textTransform: 'uppercase', fontFamily: 'Courier Prime, monospace', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 0 }}>DRAFT</div>
              )}
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
                lines.map((line: any, i: number) => {

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
          
  );
}
