'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Download, FileText } from 'lucide-react';
import Link from 'next/link';
import { parseScript } from '@/lib/scriptos/parser';
import { saveScript, getAllScripts, createNewScript, exportScriptAsText, type StoredScript } from '@/lib/scriptos/storage';
import type { ScriptLine } from '@/types/screenplay';

export default function EditorPage() {
  const [content, setContent] = useState('');
  const [currentScript, setCurrentScript] = useState<StoredScript | null>(null);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [scripts, setScripts] = useState<StoredScript[]>([]);
  const [showScripts, setShowScripts] = useState(false);

  // Load scripts on mount
  useEffect(() => {
    const allScripts = getAllScripts();
    setScripts(allScripts);
    
    if (allScripts.length > 0) {
      const latest = allScripts[allScripts.length - 1];
      setCurrentScript(latest);
      setContent(latest.content);
    } else {
      // Create first script
      const newScript = createNewScript('My First Screenplay');
      setCurrentScript(newScript);
      setScripts([newScript]);
    }
  }, []);

  // Parse content when it changes
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
    if (currentScript) {
      const timeoutId = setTimeout(() => {
        saveScript({
          id: currentScript.id,
          title: currentScript.title,
          content
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [content, currentScript]);

  const handleSave = () => {
    if (currentScript) {
      const saved = saveScript({
        id: currentScript.id,
        title: currentScript.title,
        content
      });
      setCurrentScript(saved);
      alert('Screenplay saved!');
    }
  };

  const handleExport = () => {
    if (currentScript) {
      exportScriptAsText({ ...currentScript, content });
    }
  };

  const handleNewScript = () => {
    const newScript = createNewScript('Untitled');
    setCurrentScript(newScript);
    setContent('');
    setScripts([...scripts, newScript]);
    setShowScripts(false);
  };

  const handleLoadScript = (script: StoredScript) => {
    setCurrentScript(script);
    setContent(script.content);
    setShowScripts(false);
  };

  const getLineStyle = (type: string) => {
    const baseStyle: React.CSSProperties = {
      fontFamily: 'Courier Prime, Courier, monospace',
      fontSize: '12px',
      lineHeight: '1.5',
      marginBottom: '12px',
      whiteSpace: 'pre-wrap'
    };

    switch (type) {
      case 'slug':
        return { ...baseStyle, fontWeight: 'bold', textTransform: 'uppercase' as const, color: '#ff3c00' };
      case 'character':
        return { ...baseStyle, textAlign: 'center' as const, textTransform: 'uppercase' as const, fontWeight: 'bold' };
      case 'dialogue':
        return { ...baseStyle, maxWidth: '400px', margin: '0 auto 12px', paddingLeft: '100px', paddingRight: '80px' };
      case 'parenthetical':
        return { ...baseStyle, maxWidth: '300px', margin: '0 auto 6px', paddingLeft: '120px', fontStyle: 'italic', opacity: 0.7 };
      case 'transition':
        return { ...baseStyle, textAlign: 'right' as const, fontWeight: 'bold', textTransform: 'uppercase' as const };
      case 'action':
        return { ...baseStyle, maxWidth: '600px' };
      default:
        return baseStyle;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(8, 8, 8, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ color: 'var(--fg)', textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontSize: '1.2rem',
              letterSpacing: 4,
              margin: 0
            }}
          >
            {currentScript?.title || 'EDITOR'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowScripts(!showScripts)}
            className="link-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FileText size={12} /> Scripts ({scripts.length})
          </button>
          <button onClick={handleSave} className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={12} /> Save
          </button>
          <button onClick={handleExport} className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={12} /> Export
          </button>
        </div>
      </header>

      {/* Scripts Sidebar */}
      {showScripts && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: 300,
            height: '100vh',
            background: '#0a0a0a',
            borderLeft: '1px solid rgba(255, 255, 255, 0.04)',
            padding: 20,
            zIndex: 200,
            overflowY: 'auto'
          }}
        >
          <h3 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 2, marginBottom: 20 }}>
            YOUR SCRIPTS
          </h3>
          <button
            onClick={handleNewScript}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: 2,
              cursor: 'pointer',
              marginBottom: 16
            }}
          >
            + NEW SCRIPT
          </button>
          {scripts.map(script => (
            <div
              key={script.id}
              onClick={() => handleLoadScript(script)}
              style={{
                padding: 12,
                marginBottom: 8,
                border: script.id === currentScript?.id ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={(e) => {
                if (script.id !== currentScript?.id) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 4 }}>{script.title}</div>
              <div style={{ fontSize: 9, opacity: 0.5 }}>
                {new Date(script.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Editor */}
        <div style={{ flex: 1, padding: 40 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your screenplay here...

INT. COFFEE SHOP - DAY

JANE sits at a corner table, typing furiously.

JANE
I've got it. The perfect opening line.

She leans back, satisfied."
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--fg)',
              fontFamily: 'Courier Prime, Courier, monospace',
              fontSize: '12px',
              lineHeight: '1.5',
              padding: 20,
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        {/* Preview */}
        <div
          style={{
            width: '50%',
            borderLeft: '1px solid rgba(255, 255, 255, 0.04)',
            padding: 40,
            overflowY: 'auto',
            background: '#0a0a0a'
          }}
        >
          <div style={{ maxWidth: 650, margin: '0 auto' }}>
            <h3
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: 3,
                marginBottom: 20,
                opacity: 0.5
              }}
            >
              LIVE PREVIEW ({lines.length} lines)
            </h3>
            {lines.map((line, i) => (
              <div key={i} style={getLineStyle(line.type)}>
                {line.text || <span style={{ opacity: 0.3 }}>[empty line]</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
