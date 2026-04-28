'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Download, FileText, Play, Navigation2, Eye } from 'lucide-react';
import Link from 'next/link';
import { parseScript } from '@/lib/scriptos/parser';
import { saveScript, getAllScripts, createNewScript, exportScriptAsText, type StoredScript } from '@/lib/scriptos/storage';
import { getCharacterNames, ELEMENT_CYCLE, getCurrentLine } from '@/lib/scriptos/editor-utils';
import { exportAsFountain } from '@/lib/scriptos/fountain-export';
import type { ScriptLine } from '@/types/screenplay';

export default function EditorPage() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState('');
  const [currentScript, setCurrentScript] = useState<StoredScript | null>(null);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [scripts, setScripts] = useState<StoredScript[]>([]);
  const [showScripts, setShowScripts] = useState(false);
  const [showSceneNav, setShowSceneNav] = useState(false);
  const [showTableRead, setShowTableRead] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textareaRef.current) return;

      // Cmd+S / Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Tab key - cycle element types
      if (e.key === 'Tab') {
        e.preventDefault();
        handleTabKey();
        return;
      }

      // Track cursor position for real-time line type detection
      setTimeout(() => {
        setCursorPos(textareaRef.current?.selectionStart || 0);
      }, 0);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, lines]);

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

  const getLineTypeAtCursor = (): string => {
    const { line } = getCurrentLine(content, cursorPos);
    const matchingLine = lines.find((l, i) => {
      const lineStart = content.substring(0, i * 20).split('\n').length;
      return l.text.trim() === line.trim();
    });
    return matchingLine?.type || 'action';
  };

  const handleTabKey = () => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const { lineStart, lineEnd } = getCurrentLine(content, start);
    const lineText = content.substring(lineStart, lineEnd - 1);

    const currentType = getLineTypeAtCursor();
    const currentIndex = ELEMENT_CYCLE.indexOf(currentType as any);
    const nextIndex = (currentIndex + 1) % ELEMENT_CYCLE.length;
    const nextType = ELEMENT_CYCLE[nextIndex];

    const formatter = getElementFormatter(nextType);
    const formattedLine = formatter(lineText.trim());

    const newContent = content.substring(0, lineStart) + formattedLine + content.substring(lineEnd);

    setContent(newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = lineStart + formattedLine.length;
        textareaRef.current.selectionEnd = lineStart + formattedLine.length;
      }
    }, 0);
  };

  const getElementFormatter = (type: string): ((text: string) => string) => {
    switch (type) {
      case 'slug':
        return (text) => text.toUpperCase().trim();
      case 'character':
        return (text) => text.toUpperCase().trim();
      case 'dialogue':
        return (text) => text.trim();
      case 'parenthetical':
        return (text) => `(${text.replace(/[()]/g, '').trim()})`;
      case 'action':
        return (text) => text.trim();
      case 'transition':
        return (text) => text.toUpperCase().trim() + (text.toUpperCase().endsWith(':') ? '' : ':');
      default:
        return (text) => text.trim();
    }
  };

  const handleSave = () => {
    if (currentScript) {
      const saved = saveScript({
        id: currentScript.id,
        title: currentScript.title,
        content
      });
      setCurrentScript(saved);
    }
  };

  const handleExport = () => {
    if (currentScript) {
      exportScriptAsText({ ...currentScript, content });
    }
  };

  const handleFountainExport = () => {
    if (currentScript) {
      exportAsFountain(content, currentScript.title);
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
          <button
            onClick={() => setShowSceneNav(!showSceneNav)}
            className="link-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Navigation2 size={12} /> Scenes ({lines.filter((l) => l.type === 'slug').length})
          </button>
          <button
            onClick={() => setShowTableRead(!showTableRead)}
            className="link-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Play size={12} /> Table Read
          </button>
          <button onClick={handleSave} className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={12} /> Save
          </button>
          <button onClick={handleFountainExport} className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={12} /> Fountain
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

      {/* Scene Navigator */}
      {showSceneNav && (
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
            SCENE NAVIGATOR
          </h3>
          {lines
            .filter((l) => l.type === 'slug')
            .map((scene, i) => (
              <div
                key={scene.id}
                onClick={() => {
                  if (textareaRef.current) {
                    textareaRef.current.focus();
                    const scrollPos = content.substring(0, scene.index * 50).split('\n').reduce((acc, line) => acc + line.length + 1, 0);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.scrollTop = scrollPos;
                      }
                    }, 0);
                  }
                }}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', marginBottom: 4 }}>
                  Scene {i + 1}
                </div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{scene.text.trim()}</div>
              </div>
            ))}
        </div>
      )}

      <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Editor */}
        <div style={{ flex: 1, padding: 40 }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setCursorPos(e.currentTarget.selectionStart);
            }}
            onClick={(e) => setCursorPos(e.currentTarget.selectionStart)}
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

        {/* Preview / Table Read Mode */}
        <div
          style={{
            width: '50%',
            borderLeft: '1px solid rgba(255, 255, 255, 0.04)',
            padding: 40,
            overflowY: 'auto',
            background: '#0a0a0a'
          }}
        >
          {showTableRead ? (
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
                TABLE READ MODE
              </h3>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, opacity: 0.7 }}>Select character:</label>
                <select
                  value={selectedCharacter || ''}
                  onChange={(e) => setSelectedCharacter(e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: 8,
                    marginTop: 8,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--fg)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All characters</option>
                  {getCharacterNames(lines).map((char) => (
                    <option key={char} value={char}>
                      {char}
                    </option>
                  ))}
                </select>
              </div>
              {lines.map((line, i) => {
                const isCharacterLine = line.type === 'character';
                const isDialogueLine = line.type === 'dialogue';
                const characterName = line.meta?.characterName || '';

                if (selectedCharacter && isCharacterLine && characterName === selectedCharacter) {
                  return (
                    <div key={i} style={{ marginBottom: 16, padding: 12, background: 'rgba(255, 100, 100, 0.1)', border: '2px solid var(--accent)' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: 8, color: 'var(--accent)' }}>{characterName}</div>
                      {lines
                        .slice(i + 1)
                        .find((l) => l.type === 'character' || l.type === 'action' || l.type === 'slug')
                        ?.index || lines.length}
                    </div>
                  );
                }

                if (selectedCharacter && isDialogueLine) {
                  const prev = lines[i - 1];
                  if (prev?.meta?.characterName === selectedCharacter) {
                    return (
                      <div key={i} style={{ ...getLineStyle(line.type), background: 'rgba(255, 255, 255, 0.05)', padding: 12 }}>
                        {line.text}
                      </div>
                    );
                  }
                }

                if (!selectedCharacter) {
                  return (
                    <div key={i} style={getLineStyle(line.type)}>
                      {line.text || <span style={{ opacity: 0.3 }}>[empty line]</span>}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          ) : (
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
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 20 }}>
                <div>Words: {lines.reduce((n, l) => n + (l.type === 'dialogue' || l.type === 'action' ? l.text.split(/\s+/).length : 0), 0)}</div>
                <div>Scenes: {lines.filter((l) => l.type === 'slug').length}</div>
                <div>Characters: {getCharacterNames(lines).length}</div>
              </div>
              {lines.map((line, i) => (
                <div key={i} style={getLineStyle(line.type)}>
                  {line.text || <span style={{ opacity: 0.3 }}>[empty line]</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
