'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { WorldEditor } from '@/components/world/WorldEditor';

export default function WorldPage() {
  const params = useParams();
  const projectId = String(params?.id ?? '');
  if (!projectId) return <p style={{ color: 'var(--fg-muted)' }}>No project.</p>;
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>World building</h1>
      <WorldEditor projectId={projectId} />
    </div>
  );
}
