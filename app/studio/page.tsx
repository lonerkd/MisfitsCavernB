'use client';

import React, { useState } from 'react';
import { ArrowLeft, FolderOpen, Image, Video, FileText, Music } from 'lucide-react';
import Link from 'next/link';
import GrainOverlay from '@/components/GrainOverlay';
import AnimatedSection from '@/components/AnimatedSection';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio';
  category: string;
  dateAdded: string;
}

export default function StudioPage() {
  const [assets] = useState<Asset[]>([
    { id: '1', name: 'Femme Fatale - Draft 9.pdf', type: 'document', category: 'Screenplays', dateAdded: '2026-04-15' },
    { id: '2', name: '10 Million - Final Cut', type: 'video', category: 'Music Videos', dateAdded: '2026-04-20' },
    { id: '3', name: 'The Briefcase - Poster Concept', type: 'image', category: 'Marketing', dateAdded: '2026-04-10' },
    { id: '4', name: 'Production Score - V1', type: 'audio', category: 'Audio', dateAdded: '2026-03-28' },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image size={16} />;
      case 'video':
        return <Video size={16} />;
      case 'document':
        return <FileText size={16} />;
      case 'audio':
        return <Music size={16} />;
      default:
        return <FolderOpen size={16} />;
    }
  };

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh' }}>
      <GrainOverlay />

      {/* Header */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          padding: '18px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          background: 'rgba(8, 8, 8, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <ArrowLeft size={18} color="var(--fg)" />
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.15rem', letterSpacing: 6, color: 'var(--fg)' }}>
            STUDIO
          </div>
        </Link>

        <button className="link-btn">+ New Asset</button>
      </nav>

      {/* Studio Content */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 18px 90px' }}>
        <AnimatedSection>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
            <span style={{ fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', color: 'var(--accent)' }}>
              Asset Library
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {assets.map((asset) => (
              <div
                key={asset.id}
                style={{
                  padding: 24,
                  background: '#0a0a0a',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  {getIcon(asset.type)}
                  <span
                    style={{
                      fontSize: 8,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      fontFamily: 'var(--mono)'
                    }}
                  >
                    {asset.category}
                  </span>
                </div>
                <h4
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    marginBottom: 8,
                    lineHeight: 1.4
                  }}
                >
                  {asset.name}
                </h4>
                <p style={{ fontSize: 9, opacity: 0.4 }}>
                  Added {new Date(asset.dateAdded).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        {/* Projects Section */}
        <AnimatedSection delay={0.2}>
          <div style={{ marginTop: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
              <span style={{ fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', color: 'var(--accent)' }}>
                Active Projects
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                {
                  title: 'Femme Fatale',
                  type: 'Limited Series',
                  status: 'Development',
                  completion: 85,
                  description: '133-page political noir screenplay'
                },
                {
                  title: '10 Million',
                  type: 'Music Video',
                  status: 'Post-Production',
                  completion: 95,
                  description: 'High-energy visual rhythm piece'
                }
              ].map((project, i) => (
                <div
                  key={i}
                  style={{
                    padding: 32,
                    background: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 60, 0, 0.3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                    <div>
                      <span
                        style={{
                          fontSize: 8,
                          letterSpacing: 3,
                          textTransform: 'uppercase',
                          color: 'var(--accent)',
                          fontFamily: 'var(--mono)'
                        }}
                      >
                        {project.type}
                      </span>
                      <h3
                        style={{
                          fontFamily: 'var(--display)',
                          fontSize: '1.8rem',
                          letterSpacing: 2,
                          marginTop: 6
                        }}
                      >
                        {project.title}
                      </h3>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        letterSpacing: 2,
                        padding: '4px 10px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {project.status}
                    </span>
                  </div>

                  <p style={{ fontFamily: 'var(--serif)', fontSize: 14, opacity: 0.6, marginBottom: 16 }}>
                    {project.description}
                  </p>

                  {/* Progress bar */}
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 9,
                        marginBottom: 6,
                        opacity: 0.5
                      }}
                    >
                      <span>Completion</span>
                      <span>{project.completion}%</span>
                    </div>
                    <div style={{ height: 2, background: '#1a1a1a', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${project.completion}%`,
                          background: 'var(--accent)',
                          transition: 'width 0.5s'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
