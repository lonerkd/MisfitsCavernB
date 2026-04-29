'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trash2, Plus, Image, Type } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface Asset { id: string; title?: string; asset_url: string; asset_type: string; position_x: number; position_y: number; width: number; height: number; }
interface Board { id: string; name: string; studio_assets: Asset[]; }

export default function StudioPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState<Board | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [addMode, setAddMode] = useState<'image' | 'note'>('image');
  const [dragging, setDragging] = useState<Asset | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [user, setUser] = useState<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) load(user.id);
    });
  }, []);

  const load = async (uid: string) => {
    const { data } = await supabase
      .from('studio_boards')
      .select('*, studio_assets(*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (data) {
      setBoards(data as Board[]);
      if (data.length > 0) setSelected(data[0] as Board);
    }
  };

  const createBoard = async () => {
    if (!user || !newBoardName.trim()) return;
    const { data } = await supabase
      .from('studio_boards')
      .insert({ user_id: user.id, name: newBoardName })
      .select('*, studio_assets(*)')
      .single();
    if (data) {
      setBoards([data as Board, ...boards]);
      setSelected(data as Board);
      setNewBoardName('');
    }
  };

  const deleteBoard = async (id: string) => {
    if (!confirm('Delete this board and all its assets?')) return;
    await supabase.from('studio_boards').delete().eq('id', id);
    const rest = boards.filter(b => b.id !== id);
    setBoards(rest);
    setSelected(selected?.id === id ? rest[0] || null : selected);
  };

  const addAsset = async () => {
    if (!selected) return;
    const isNote = addMode === 'note';
    if (isNote && !newAssetTitle.trim()) return;
    if (!isNote && !newAssetUrl.trim()) return;

    const { data } = await supabase
      .from('studio_assets')
      .insert({
        board_id: selected.id,
        user_id: user.id,
        asset_url: isNote ? '' : newAssetUrl,
        asset_type: isNote ? 'note' : 'image',
        title: newAssetTitle || '',
        position_x: 80 + Math.floor(Math.random() * 300),
        position_y: 80 + Math.floor(Math.random() * 200),
        width: isNote ? 220 : 280,
        height: isNote ? 140 : 200,
      })
      .select().single();
    if (data) {
      const updated = { ...selected, studio_assets: [...selected.studio_assets, data] };
      setSelected(updated);
      setBoards(boards.map(b => b.id === selected.id ? updated : b));
      setNewAssetUrl('');
      setNewAssetTitle('');
    }
  };

  const deleteAsset = async (assetId: string) => {
    if (!selected) return;
    await supabase.from('studio_assets').delete().eq('id', assetId);
    const updated = { ...selected, studio_assets: selected.studio_assets.filter(a => a.id !== assetId) };
    setSelected(updated);
    setBoards(boards.map(b => b.id === selected.id ? updated : b));
  };

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    if (!canvasRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(asset);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragging || !selected || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const y = Math.max(0, e.clientY - rect.top - dragOffset.y);
    await supabase.from('studio_assets').update({ position_x: Math.round(x), position_y: Math.round(y) }).eq('id', dragging.id);
    const updated = {
      ...selected,
      studio_assets: selected.studio_assets.map(a => a.id === dragging.id ? { ...a, position_x: Math.round(x), position_y: Math.round(y) } : a),
    };
    setSelected(updated);
    setBoards(boards.map(b => b.id === selected.id ? updated : b));
    setDragging(null);
  };

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5, marginBottom: 16 }}>Sign in to use Studio.</p>
        <Link href="/auth" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}>Sign in →</Link>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', overflow: 'hidden' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 60, background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 24px', display: 'flex', alignItems: 'center', zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>STUDIO</h1>
        </Link>
        {selected && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.4, marginLeft: 20 }}>
            {selected.name} · {selected.studio_assets.length} assets
          </span>
        )}
      </header>

      {/* Board list sidebar */}
      <div style={{ marginTop: 60, width: 220, background: '#080808', borderRight: '1px solid rgba(255,255,255,0.04)', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, opacity: 0.3, marginBottom: 12 }}>MOOD BOARDS</div>
        <div style={{ marginBottom: 16 }}>
          <input type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createBoard()}
            placeholder="New board name..."
            style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 8, boxSizing: 'border-box' }} />
          <button onClick={createBoard}
            style={{ width: '100%', padding: 8, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Plus size={10} /> CREATE
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {boards.map(board => (
            <button key={board.id} onClick={() => setSelected(board)}
              style={{ padding: '10px 12px', background: selected?.id === board.id ? 'rgba(255,60,0,0.1)' : 'transparent', border: 'none', borderLeft: `2px solid ${selected?.id === board.id ? 'var(--accent)' : 'transparent'}`, color: selected?.id === board.id ? 'var(--fg)' : 'rgba(255,255,255,0.5)', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (selected?.id !== board.id) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { if (selected?.id !== board.id) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}>
              <div>{board.name}</div>
              <div style={{ fontSize: 8, opacity: 0.4, marginTop: 2 }}>{board.studio_assets.length} assets</div>
            </button>
          ))}
          {boards.length === 0 && (
            <div style={{ fontSize: 10, opacity: 0.3, padding: 8, fontFamily: 'var(--mono)' }}>No boards yet</div>
          )}
        </div>
      </div>

      {/* Canvas area */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 60, minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ height: 52, borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#080808', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAddMode('image')}
                style={{ padding: '6px 12px', background: addMode === 'image' ? 'rgba(255,60,0,0.15)' : 'transparent', border: `1px solid ${addMode === 'image' ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, color: addMode === 'image' ? 'var(--accent)' : 'rgba(255,255,255,0.5)', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Image size={10} /> IMAGE
              </button>
              <button onClick={() => setAddMode('note')}
                style={{ padding: '6px 12px', background: addMode === 'note' ? 'rgba(255,60,0,0.15)' : 'transparent', border: `1px solid ${addMode === 'note' ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, color: addMode === 'note' ? 'var(--accent)' : 'rgba(255,255,255,0.5)', fontFamily: 'var(--mono)', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Type size={10} /> NOTE
              </button>
              <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                {addMode === 'image' && (
                  <input type="text" value={newAssetUrl} onChange={e => setNewAssetUrl(e.target.value)}
                    placeholder="Image URL..."
                    style={{ width: 220, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10 }} />
                )}
                <input type="text" value={newAssetTitle} onChange={e => setNewAssetTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addAsset()}
                  placeholder={addMode === 'note' ? 'Note text...' : 'Label (optional)'}
                  style={{ width: addMode === 'note' ? 220 : 120, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10 }} />
                <button onClick={addAsset}
                  style={{ padding: '6px 14px', background: 'var(--accent)', border: 'none', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>
                  + ADD
                </button>
              </div>
            </div>
            <button onClick={() => deleteBoard(selected.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }} title="Delete board">
              <Trash2 size={14} />
            </button>
          </div>

          {/* Canvas */}
          <div ref={canvasRef}
            style={{
              flex: 1, position: 'relative', overflow: 'auto', cursor: dragging ? 'grabbing' : 'default',
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
              backgroundPosition: '0 0',
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}>

            {selected.studio_assets.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ textAlign: 'center', opacity: 0.2 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, marginBottom: 8 }}>EMPTY BOARD</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>Add images or notes using the toolbar above</div>
                </div>
              </div>
            )}

            {selected.studio_assets.map(asset => (
              <div key={asset.id} draggable
                onDragStart={e => handleDragStart(e, asset)}
                onDragEnd={() => setDragging(null)}
                style={{
                  position: 'absolute',
                  left: asset.position_x, top: asset.position_y,
                  width: asset.width, height: asset.height,
                  background: asset.asset_type === 'note' ? 'rgba(255,220,100,0.06)' : '#1a1a1a',
                  border: `1px solid ${asset.asset_type === 'note' ? 'rgba(255,220,100,0.2)' : 'rgba(255,255,255,0.12)'}`,
                  cursor: 'grab', overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  transition: 'box-shadow 0.2s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'}>

                {asset.asset_type === 'note' ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start', padding: 14, boxSizing: 'border-box' }}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,220,100,0.8)', wordBreak: 'break-word' }}>
                      {asset.title}
                    </div>
                  </div>
                ) : asset.asset_url.trim() ? (
                  <img src={asset.asset_url} alt={asset.title || 'asset'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'var(--mono)', opacity: 0.4 }}>
                    {asset.title || 'No content'}
                  </div>
                )}

                {asset.title && asset.asset_type === 'image' && asset.asset_url.trim() && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', background: 'rgba(0,0,0,0.7)', fontSize: 9, fontFamily: 'var(--mono)', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {asset.title}
                  </div>
                )}

                <button onClick={() => deleteAsset(asset.id)}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.75)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4, borderRadius: 2, display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, marginTop: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 4, marginBottom: 8 }}>SELECT A BOARD</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>or create one in the sidebar</div>
          </div>
        </div>
      )}
    </div>
  );
}
