'use client';

import React, { useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Video, FileText, Music, Upload, Plus } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import AnimatedSection from '@/components/AnimatedSection';
import SectionLabel from '@/components/SectionLabel';
import { supabase } from '@/lib/supabase/client';
import { getUserProjects } from '@/lib/supabase/projects';
import { getAllStudioAssets } from '@/lib/supabase/studio';
import { useEffect } from 'react';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio';
  category: string;
  size: string;
  dateAdded: string;
}

const ASSETS: Asset[] = [
  { id: '1', name: 'Femme Fatale — Draft 9', type: 'document', category: 'Screenplays', size: '248 KB', dateAdded: '2026-04-15' },
  { id: '2', name: '10 Million — Final Cut', type: 'video', category: 'Music Videos', size: '4.2 GB', dateAdded: '2026-04-20' },
  { id: '3', name: 'The Briefcase — Poster Concept', type: 'image', category: 'Marketing', size: '3.8 MB', dateAdded: '2026-04-10' },
  { id: '4', name: 'Production Score — V1', type: 'audio', category: 'Audio', size: '68 MB', dateAdded: '2026-03-28' },
  { id: '5', name: 'Grand PSA — Grade LUT', type: 'document', category: 'Color', size: '12 KB', dateAdded: '2026-03-15' },
  { id: '6', name: 'Altitude — Raw Footage B-Roll', type: 'video', category: 'Documentaries', size: '11.3 GB', dateAdded: '2026-02-20' },
];

const PROJECTS = [
  {
    title: 'Femme Fatale',
    type: 'Limited Series',
    status: 'Development',
    statusColor: '#ffaa00',
    completion: 85,
    description: '133-page political noir. Submitted to A24 and Proximity Media.',
  },
  {
    title: '10 Million',
    type: 'Music Video',
    status: 'Post-Production',
    statusColor: 'var(--accent)',
    completion: 95,
    description: 'High-energy visual rhythm. Final color grade in progress.',
  },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <Image size={15} />,
  video: <Video size={15} />,
  document: <FileText size={15} />,
  audio: <Music size={15} />,
};

const TYPE_COLORS: Record<string, string> = {
  image: '#0099ff',
  video: '#ff3c00',
  document: '#ffaa00',
  audio: '#00cc66',
};

function AssetCard({ asset, index }: { asset: Asset; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, borderColor: `${TYPE_COLORS[asset.type]}44` } as any}
      style={{
        padding: '22px 20px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        cursor: 'none',
        transition: 'border-color 0.4s, box-shadow 0.4s',
        borderRadius: 'var(--radius-sm)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.7), 0 0 30px ${TYPE_COLORS[asset.type]}0a`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color: TYPE_COLORS[asset.type] }}>{TYPE_ICONS[asset.type]}</span>
        <span style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: TYPE_COLORS[asset.type], fontFamily: 'var(--mono)', opacity: 0.85 }}>
          {asset.category}
        </span>
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.4, marginBottom: 10, color: 'var(--fg)' }}>
        {asset.name}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-subtle)' }}>
        <span>{asset.size}</span>
        <span>{new Date(asset.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </motion.div>
  );
}

function ProjectCard({ project, index }: { project: typeof PROJECTS[0]; index: number }) {
  return (
    <AnimatedSection delay={index * 0.1}>
      <motion.div
        whileHover={{ borderColor: `${project.statusColor}33` } as any}
        style={{
          padding: 32,
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          transition: 'border-color 0.4s, box-shadow 0.4s',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.8)`)}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      >
        {/* Ghost title */}
        <div style={{
          position: 'absolute',
          top: -10,
          right: -8,
          fontFamily: 'var(--display)',
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          lineHeight: 1,
          color: 'rgba(255,255,255,0.025)',
          letterSpacing: -2,
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {project.title.split(' ')[0].toUpperCase()}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: project.statusColor, fontFamily: 'var(--mono)' }}>
                {project.type}
              </span>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: 2, marginTop: 6 }}>
                {project.title}
              </h3>
            </div>
            <span style={{
              fontSize: 8,
              letterSpacing: 2,
              padding: '5px 12px',
              border: `1px solid ${project.statusColor}55`,
              color: project.statusColor,
              textTransform: 'uppercase',
              fontFamily: 'var(--mono)',
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0,
            }}>
              {project.status}
            </span>
          </div>

          <p style={{ fontFamily: 'var(--serif)', fontSize: '0.92rem', color: 'var(--fg-muted)', marginBottom: 20 }}>
            {project.description}
          </p>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-subtle)', marginBottom: 6 }}>
              <span>Completion</span>
              <span style={{ color: project.statusColor }}>{project.completion}%</span>
            </div>
            <div style={{ height: 2, background: '#1a1a1a', overflow: 'hidden', borderRadius: 1 }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${project.completion}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                style={{ height: '100%', background: project.statusColor, borderRadius: 1 }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

export default function StudioPage() {
  const [filter, setFilter] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [assetsList, setAssetsList] = useState<Asset[]>(ASSETS);
  const [projectsList, setProjectsList] = useState<typeof PROJECTS>(PROJECTS);

  const types = ['all', 'image', 'video', 'document', 'audio'];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      
      getAllStudioAssets(user.id).then(data => {
        if (data && data.length > 0) {
          setAssetsList(data.map(a => ({
            id: a.id,
            name: a.title || 'Untitled',
            type: (a.asset_type as any) || 'document',
            category: 'Studio',
            size: 'Unknown',
            dateAdded: new Date(a.created_at).toISOString().split('T')[0]
          })));
        }
      }).catch(console.error);

      getUserProjects(user.id).then(data => {
        if (data && data.length > 0) {
          setProjectsList(data.map(p => ({
            title: p.title,
            type: 'Feature',
            status: p.status === 'completed' ? 'Complete' : p.status === 'in-production' ? 'Production' : p.status === 'post-production' ? 'Post-Production' : 'Development',
            statusColor: p.accent_color || '#ffaa00',
            completion: p.status === 'completed' ? 100 : 50,
            description: p.description || 'No description'
          })));
        }
      }).catch(console.error);
    });
  }, []);

  const filtered = filter === 'all' ? assetsList : assetsList.filter(a => a.type === filter);

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, width: '100%',
        padding: '0 28px', height: 62,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'rgba(8,8,8,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <ArrowLeft size={17} color="var(--fg)" />
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: 6 }}>STUDIO</div>
        </Link>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={11} /> Upload
          </button>
          <button className="link-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={11} /> New Asset
          </button>
        </div>
      </nav>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 20px 80px' }}>

        {/* Asset Library */}
        <AnimatedSection>
          <SectionLabel text="Asset Library" />

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '7px 16px',
                  background: filter === t ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${filter === t ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                  color: filter === t ? 'var(--bg)' : 'var(--fg-muted)',
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  borderRadius: 'var(--radius-full)',
                  transition: 'all 0.3s',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filtered.map((asset, i) => <AssetCard key={asset.id} asset={asset} index={i} />)}
          </div>
        </AnimatedSection>

        {/* Active Projects */}
        <div style={{ marginTop: 90 }}>
          <AnimatedSection>
            <SectionLabel text="Active Projects" />
          </AnimatedSection>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {projectsList.map((p, i) => <ProjectCard key={p.title} project={p} index={i} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
