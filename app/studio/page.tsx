'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getAllBoards, createBoard, deleteBoard, addAsset, deleteAsset, updateAsset, type Board, type Asset } from '@/lib/storage/studio';

export default function StudioPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [newAssetUrl, setNewAssetUrl] = useState('');
  const [newAssetTitle, setNewAssetTitle] = useState('');
  const [draggedAsset, setDraggedAsset] = useState<Asset | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = getAllBoards();
    setBoards(loaded);
    if (loaded.length > 0) {
      setSelectedBoard(loaded[0]);
    }
  }, []);

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      const board = createBoard(newBoardName);
      setBoards([...boards, board]);
      setSelectedBoard(board);
      setNewBoardName('');
    }
  };

  const handleDeleteBoard = (id: string) => {
    if (deleteBoard(id)) {
      setBoards(boards.filter((b) => b.id !== id));
      if (selectedBoard?.id === id) {
        setSelectedBoard(boards.find((b) => b.id !== id) || null);
      }
    }
  };

  const handleAddAsset = () => {
    if (selectedBoard && (newAssetUrl.trim() || newAssetTitle.trim())) {
      const asset = addAsset(selectedBoard.id, newAssetUrl, 'image', newAssetTitle);
      const updated = getAllBoards().find((b) => b.id === selectedBoard.id);
      if (updated) {
        setSelectedBoard(updated);
        setBoards(boards.map((b) => (b.id === selectedBoard.id ? updated : b)));
        setNewAssetUrl('');
        setNewAssetTitle('');
      }
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    if (selectedBoard) {
      deleteAsset(selectedBoard.id, assetId);
      const updated = getAllBoards().find((b) => b.id === selectedBoard.id);
      if (updated) {
        setSelectedBoard(updated);
        setBoards(boards.map((b) => (b.id === selectedBoard.id ? updated : b)));
      }
    }
  };

  const handleAssetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedAsset || !selectedBoard || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateAsset(selectedBoard.id, draggedAsset.id, { x, y });
    const updated = getAllBoards().find((b) => b.id === selectedBoard.id);
    if (updated) {
      setSelectedBoard(updated);
      setBoards(boards.map((b) => (b.id === selectedBoard.id ? updated : b)));
    }
    setDraggedAsset(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex' }}>
      {/* Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: 60,
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
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>
            STUDIO
          </h1>
        </Link>
      </header>

      {/* Board List */}
      <div
        style={{
          marginTop: 60,
          width: 220,
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255, 255, 255, 0.04)',
          padding: 16,
          overflowY: 'auto',
          height: 'calc(100vh - 60px)'
        }}
      >
        <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>
          BOARDS
        </h3>

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="New board..."
            style={{
              width: '100%',
              padding: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--fg)',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              marginBottom: 8
            }}
          />
          <button
            onClick={handleCreateBoard}
            style={{
              width: '100%',
              padding: 8,
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: 1,
              cursor: 'pointer'
            }}
          >
            + CREATE
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setSelectedBoard(board)}
              style={{
                padding: 12,
                background: selectedBoard?.id === board.id ? 'rgba(255, 60, 0, 0.1)' : 'transparent',
                border: selectedBoard?.id === board.id ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--fg)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedBoard?.id !== board.id) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBoard?.id !== board.id) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              <div>{board.name}</div>
              <div style={{ fontSize: 8, opacity: 0.4, marginTop: 2 }}>{board.assets.length} assets</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas */}
      {selectedBoard && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Board Header */}
          <div
            style={{
              marginTop: 60,
              height: 40,
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 11, margin: 0 }}>{selectedBoard.name}</h2>
            </div>
            <button
              onClick={() => handleDeleteBoard(selectedBoard.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--fg)',
                cursor: 'pointer',
                opacity: 0.5
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            style={{
              flex: 1,
              background: 'linear-gradient(to bottom, #0a0a0a 0%, #0f0f0f 100%)',
              position: 'relative',
              overflowY: 'auto',
              cursor: draggedAsset ? 'grabbing' : 'default'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleAssetDrop}
          >
            {selectedBoard.assets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={() => setDraggedAsset(asset)}
                onDragEnd={() => setDraggedAsset(null)}
                style={{
                  position: 'absolute',
                  left: asset.x,
                  top: asset.y,
                  width: asset.width,
                  height: asset.height,
                  background: 'rgba(255, 100, 100, 0.1)',
                  border: '2px solid rgba(255, 100, 100, 0.5)',
                  cursor: 'grab',
                  padding: 8,
                  overflow: 'hidden'
                }}
              >
                {asset.url.startsWith('http') ? (
                  <img src={asset.url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      textAlign: 'center'
                    }}
                  >
                    {asset.title}
                  </div>
                )}

                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(0, 0, 0, 0.7)',
                    border: 'none',
                    color: 'var(--fg)',
                    cursor: 'pointer',
                    padding: 4,
                    opacity: 0.5
                  }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>

          {/* Asset Panel */}
          <div
            style={{
              height: 140,
              borderTop: '1px solid rgba(255, 255, 255, 0.04)',
              padding: 16,
              background: '#0a0a0a',
              overflowY: 'auto'
            }}
          >
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>
              ADD ASSET
            </h3>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newAssetUrl}
                onChange={(e) => setNewAssetUrl(e.target.value)}
                placeholder="Image URL..."
                style={{
                  flex: 1,
                  padding: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10
                }}
              />
              <input
                type="text"
                value={newAssetTitle}
                onChange={(e) => setNewAssetTitle(e.target.value)}
                placeholder="Title..."
                style={{
                  width: 120,
                  padding: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10
                }}
              />
              <button
                onClick={handleAddAsset}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 60, 0, 0.1)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: 1,
                  cursor: 'pointer'
                }}
              >
                + ADD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
