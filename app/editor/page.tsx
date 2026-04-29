'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Save, Download, FileText, Plus, X, ChevronDown, Loader } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { parseScript } from '@/lib/scriptos/parser';
import { saveScript, getAllScripts, createNewScript, exportScriptAsText, type StoredScript } from '@/lib/scriptos/storage';
import type { ScriptLine } from '@/types/screenplay';
import { useToast } from '@/components/Toast';

const TYPE_LABELS: Record<string, string> = {
  slug: 'SCENE',
  character: 'CHAR',
  dialogue: 'DIAL',
  parenthetical: 'PRNTH',
  transition: 'TRANS',
  action: 'ACTION',
};

const TYPE_COLORS: Record<string, string> = {
  slug: '#ff3c00',
  character: '#ffaa00',
  dialogue: 'var(--fg)',
  parenthetical: 'rgba(240,236,228,0.5)',
  transition: '#888',
  action: 'rgba(240,236,228,0.75)',
};

function LinePreview({ line, index }: { line: ScriptLine; index: number }) {
  const style: React.CSSProperties = {
    fontFamily: 'Courier Prime, Courier, monospace',
    fontSize: 12,
    lineHeight: '1.7',
    color: TYPE_COLORS[line.type] || 'var(--fg)',
    marginBottom: 2,
    padding: '2px 0',
    whiteSpace: 'pre-wrap',
  };

  if (line.type === 'slug') {
    return <div style={{ ...style, fontWeight: 700, textTransform: 'uppercase', marginTop: index > 0 ? 16 : 0, marginBottom: 4 }}>{line.text}</div>;
  }
  if (line.type === 'character') {
    return <div style={{ ...style, textAlign: 'center', textTransform: 'uppercase', fontWeight: 600, marginTop: 12, marginBottom: 0 }}>{line.text}</div>;
  }
  if (line.type === 'dialogue') {
    return (
      <div style={{ ...style, paddingLeft: 80, paddingRight: 60, maxWidth: '100%', marginBottom: 8 }}>
        {line.text}
      </div>
    );
  }
  if (line.type === 'parenthetical') {
    return (
      <div style={{ ...style, paddingLeft: 100, fontStyle: 'italic', opacity: 0.6, marginBottom: 0 }}>
        {line.text}
      </div>
    );
  }
  if (line.type === 'transition') {
    return <div style={{ ...style, textAlign: 'right', fontWeight: 700, textTransform: 'uppercase', marginTop: 16, marginBottom: 16 }}>{line.text}</div>;
  }

  return <div style={style}>{line.text || <span style={{ opacity: 0.2 }}>—</span>}</div>;
}

function ScriptItem({ script, active, onClick, onClose }: {
  script: StoredScript;
  active: boolean;
  onClick: () => void;
  onClose?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 3 }}
      onClick={onClick}
      style={{
        padding: '12px 14px',
        marginBottom: 6,
        border: `1px solid ${active ? 'rgba(255,60,0,0.4)' : 'rgba(255,255,255,0.05)'}`,
        background: active ? 'rgba(255,60,0,0.05)' : 'transparent',
        cursor: 'none',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        transition: 'border-color 0.3s, background 0.3s',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          letterSpacing: 0.5,
          color: active ? 'var(--accent)' : 'var(--fg)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 3,
        }}>
          {script.title}
        </div>
        <div style={{ fontSize: 9, opacity: 0.35, fontFamily: 'var(--mono)' }}>
          {new Date(script.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>
    </motion.div>
  );
}

const PLACEHOLDER = `FADE IN:

INT. COFFEE SHOP - DAY

The kind of place that hasn't changed in forty years. Good.

JANE (30s, sharp eyes, cheap suit) sits at a corner table,
typing furiously on a laptop that's seen better days.

JANE
(to herself)
Got it. The perfect opening line.

She leans back. Takes a long sip of cold coffee.

CUT TO:`;

export default function EditorPage() {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');
  const [currentScript, setCurrentScript] = useState<StoredScript | null>(null);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [scripts, setScripts] = useState<StoredScript[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'stats'>('preview');

  useEffect(() => {
    const all = getAllScripts();
    setScripts(all);
    if (all.length > 0) {
      const latest = all[all.length - 1];
      setCurrentScript(latest);
      setContent(latest.content);
    } else {
      const fresh = createNewScript('My First Screenplay');
      setCurrentScript(fresh);
      setScripts([fresh]);
    }
  }, []);

  useEffect(() => {
    if (content) {
      const result = parseScript(content);
      setLines(result.lines);
    } else {
      setLines([]);
    }
  }, [content]);

  // Auto-save
  useEffect(() => {
    if (!currentScript) return;
    const timer = setTimeout(() => {
      saveScript({ id: currentScript.id, title: currentScript.title, content });
    }, 1200);
    return () => clearTimeout(timer);
  }, [content, currentScript]);

  const handleSave = useCallback(() => {
    if (!currentScript) return;
    setSaving(true);
    saveScript({ id: currentScript.id, title: currentScript.title, content });
    setTimeout(() => {
      setSaving(false);
      toast('Screenplay saved.', 'success');
    }, 400);
  }, [currentScript, content, toast]);

  const handleExport = useCallback(() => {
    if (!currentScript) return;
    exportScriptAsText({ ...currentScript, content });
    toast('Exported as .txt', 'info');
  }, [currentScript, content, toast]);

  const handleNew = useCallback(() => {
    const s = createNewScript('Untitled');
    setCurrentScript(s);
    setContent('');
    setScripts(prev => [...prev, s]);
    setShowSidebar(false);
    textareaRef.current?.focus();
  }, []);

  const handleLoad = useCallback((script: StoredScript) => {
    setCurrentScript(script);
    setContent(script.content);
    setShowSidebar(false);
  }, []);

  // Stats
  const scenes = lines.filter(l => l.type === 'slug').length;
  const chars = [...new Set(lines.filter(l => l.type === 'character').map(l => l.text.trim()))];
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const pageEst = Math.max(1, Math.round(wordCount / 185));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(8,8,8,0.96)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '0 24px',
        height: 60,
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

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              fontFamily: 'var(--display)',
              fontSize: '1.05rem',
              letterSpacing: 4,
              color: 'var(--accent)',
            }}>
              ScriptOS
            </div>
            <span style={{ fontSize: 9, opacity: 0.3, fontFamily: 'var(--mono)', letterSpacing: 2 }}>·</span>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--fg-muted)',
              maxWidth: 200,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {currentScript?.title || 'Untitled'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Scripts picker */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="link-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FileText size={11} /> Scripts ({scripts.length}) <ChevronDown size={10} style={{ opacity: 0.5, transform: showSidebar ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>

          <button
            onClick={handleSave}
            className="link-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saving ? <Loader size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={11} />}
            Save
          </button>

          <button
            onClick={handleExport}
            className="link-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={11} /> Export
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Scripts sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: 260,
                background: '#090909',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.4 }}>
                  Your Scripts
                </span>
                <button onClick={handleNew} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'var(--accent)', border: 'none', color: 'var(--bg)',
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
                  padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                }}>
                  <Plus size={10} /> New
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
                {scripts.map(s => (
                  <ScriptItem
                    key={s.id}
                    script={s}
                    active={s.id === currentScript?.id}
                    onClick={() => handleLoad(s)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor pane */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Input */}
          <div style={{
            flex: 1,
            padding: '40px 40px',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.04)',
          }}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); } }}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--fg)',
                fontFamily: 'Courier Prime, Courier, monospace',
                fontSize: 13,
                lineHeight: 1.7,
                resize: 'none',
                outline: 'none',
                letterSpacing: 0.3,
              }}
            />
            <div style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              gap: 20,
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: 2,
              color: 'var(--fg-subtle)',
              flexWrap: 'wrap',
            }}>
              <span>{wordCount.toLocaleString()} words</span>
              <span>{pageEst} est. page{pageEst !== 1 ? 's' : ''}</span>
              <span>{scenes} scene{scenes !== 1 ? 's' : ''}</span>
              <span style={{ marginLeft: 'auto', opacity: 0.5 }}>⌘S to save</span>
            </div>
          </div>

          {/* Preview / Stats pane */}
          <div style={{
            width: '42%',
            background: '#0a0a0a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              padding: '0 20px',
            }}>
              {(['preview', 'stats'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '14px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
                    color: activeTab === tab ? 'var(--fg)' : 'var(--fg-muted)',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    transition: 'color 0.2s, border-color 0.2s',
                    marginRight: 4,
                  }}
                >
                  {tab}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-subtle)', letterSpacing: 1 }}>
                  {lines.length} lines
                </span>
              </div>
            </div>

            {/* Preview tab */}
            {activeTab === 'preview' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
                {lines.length === 0 ? (
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--fg-subtle)', textAlign: 'center', marginTop: 40 }}>
                    Start writing to see your screenplay parse in real time.
                  </div>
                ) : (
                  lines.map((line, i) => <LinePreview key={i} line={line} index={i} />)
                )}
              </div>
            )}

            {/* Stats tab */}
            {activeTab === 'stats' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
                {/* Counts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                  {[
                    { label: 'Words', value: wordCount.toLocaleString() },
                    { label: 'Est. Pages', value: pageEst },
                    { label: 'Scenes', value: scenes },
                    { label: 'Characters', value: chars.length },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <div style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 1, color: 'var(--accent)', lineHeight: 1 }}>
                        {stat.value}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-subtle)', marginTop: 6 }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Characters */}
                {chars.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 12 }}>
                      Characters
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {chars.map(c => (
                        <span key={c} style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 9,
                          letterSpacing: 1,
                          padding: '5px 10px',
                          background: 'rgba(255,60,0,0.07)',
                          border: '1px solid rgba(255,60,0,0.2)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--accent)',
                          textTransform: 'uppercase',
                        }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Line breakdown */}
                <div style={{ marginTop: 28 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 12 }}>
                    Line Types
                  </div>
                  {Object.entries(TYPE_LABELS).map(([type, label]) => {
                    const count = lines.filter(l => l.type === type).length;
                    if (!count) return null;
                    const pct = Math.round((count / lines.length) * 100);
                    return (
                      <div key={type} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, marginBottom: 4 }}>
                          <span style={{ color: TYPE_COLORS[type] as string }}>{label}</span>
                          <span style={{ color: 'var(--fg-muted)' }}>{count}</span>
                        </div>
                        <div style={{ height: 2, background: '#1a1a1a', borderRadius: 1, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            style={{ height: '100%', background: TYPE_COLORS[type] as string, borderRadius: 1 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(240,236,228,0.12); }
      `}</style>
    </div>
  );
}
