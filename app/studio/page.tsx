'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
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
  const [dragging, setDragging] = useState<Asset | null>(null);
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
    await supabase.from('studio_boards').delete().eq('id', id);
    const rest = boards.filter(b => b.id !== id);
    setBoards(rest);
    setSelected(selected?.id === id ? rest[0] || null : selected);
  };

  const addAsset = async () => {
    if (!selected || (!newAssetUrl.trim() && !newAssetTitle.trim())) return;
    const { data } = await supabase
      .from('studio_assets')
      .insert({
        board_id: selected.id,
        user_id: user.id,
        asset_url: newAssetUrl || ' ',
        asset_type: 'image',
        title: newAssetTitle,
        position_x: Math.floor(Math.random() * 400),
        position_y: Math.floor(Math.random() * 300),
        width: 300,
        height: 200
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragging || !selected || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - 150);
    const y = Math.max(0, e.clientY - rect.top - 100);
    await supabase.from('studio_assets').update({ position_x: x, position_y: y }).eq('id', dragging.id);
    const updated = { ...selected, studio_assets: selected.studio_assets.map(a => a.id === dragging.id ? { ...a, position_x: x, position_y: y } : a) };
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 60, background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 24px', display: 'flex', alignItems: 'center', zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>STUDIO</h1>
        </Link>
      </header>

      {/* Board list */}
      <div style={{ marginTop: 60, width: 220, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.04)', padding: 16, overflowY: 'auto', height: 'calc(100vh - 60px)' }}>
        <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>BOARDS</h3>
        <div style={{ marginBottom: 16 }}>
          <input type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createBoard()}
            placeholder="New board..."
            style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 8 }} />
          <button onClick={createBoard}
            style={{ width: '100%', padding: 8, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>
            + CREATE
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {boards.map(board => (
            <button key={board.id} onClick={() => setSelected(board)}
              style={{ padding: 12, background: selected?.id === board.id ? 'rgba(255,60,0,0.1)' : 'transparent', border: `1px solid ${selected?.id === board.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (selected?.id !== board.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={e => { if (selected?.id !== board.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
              <div>{board.name}</div>
              <div style={{ fontSize: 8, opacity: 0.4, marginTop: 2 }}>{board.studio_assets.length} assets</div>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      {selected && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginTop: 60, height: 40, borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 11, margin: 0 }}>{selected.name}</h2>
            <button onClick={() => deleteBoard(selected.id)} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.4 }}>
              <Trash2 size={16} />
            </button>
          </div>

          <div ref={canvasRef}
            style={{ flex: 1, background: 'linear-gradient(to bottom, #0a0a0a 0%, #0f0f0f 100%)', position: 'relative', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'default' }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}>
            {selected.studio_assets.map(asset => (
              <div key={asset.id} draggable
                onDragStart={() => setDragging(asset)}
                onDragEnd={() => setDragging(null)}
                style={{ position: 'absolute', left: asset.position_x, top: asset.position_y, width: asset.width, height: asset.height, background: 'rgba(255,100,100,0.1)', border: '2px solid rgba(255,100,100,0.5)', cursor: 'grab', overflow: 'hidden' }}>
                {asset.asset_url.trim().startsWith('http') ? (
                  <img src={asset.asset_url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, textAlign: 'center', padding: 8 }}>
                    {asset.title}
                  </div>
                )}
                <button onClick={() => deleteAsset(asset.id)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: 'var(--fg)', cursor: 'pointer', padding: 4, opacity: 0.7 }}>
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ height: 120, borderTop: '1px solid rgba(255,255,255,0.04)', padding: 16, background: '#0a0a0a' }}>
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 10, opacity: 0.5 }}>ADD ASSET</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={newAssetUrl} onChange={e => setNewAssetUrl(e.target.value)}
                placeholder="Image URL..."
                style={{ flex: 1, padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10 }} />
              <input type="text" value={newAssetTitle} onChange={e => setNewAssetTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAsset()}
                placeholder="Label..."
                style={{ width: 110, padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10 }} />
              <button onClick={addAsset}
                style={{ padding: '8px 16px', background: 'rgba(255,60,0,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>
                + ADD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
