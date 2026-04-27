'use client';

import React from 'react';
import { ArrowLeft, Calendar, Users, Clock } from 'lucide-react';
import Link from 'next/link';
import GrainOverlay from '@/components/GrainOverlay';
import AnimatedSection from '@/components/AnimatedSection';

interface Project {
  id: string;
  title: string;
  type: string;
  status: 'Pre-Production' | 'Production' | 'Post-Production' | 'Complete';
  progress: number;
  deadline: string;
  team: string[];
  description: string;
}

const PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Femme Fatale',
    type: 'Limited Series',
    status: 'Pre-Production',
    progress: 85,
    deadline: '2026-06-30',
    team: ['Peter Olowude', 'Creative Team', 'Production'],
    description: '133-page political noir screenplay submitted to A24 and Proximity Media'
  },
  {
    id: '2',
    title: '10 Million',
    type: 'Music Video',
    status: 'Post-Production',
    progress: 95,
    deadline: '2026-05-15',
    team: ['Peter Olowude', 'Editor'],
    description: 'High-energy visual rhythm. Every cut lands on the beat.'
  },
  {
    id: '3',
    title: 'The Briefcase',
    type: 'Short Film',
    status: 'Complete',
    progress: 100,
    deadline: '2024-12-01',
    team: ['Peter Olowude', 'Cast', 'Crew'],
    description: 'Crime thriller about two couriers and a mysterious delivery'
  }
];

function StatusBadge({ status }: { status: string }) {
  const getColor = () => {
    switch (status) {
      case 'Complete':
        return '#00ff00';
      case 'Post-Production':
        return '#ffaa00';
      case 'Production':
        return 'var(--accent)';
      default:
        return '#666';
    }
  };

  return (
    <span
      style={{
        fontSize: 9,
        letterSpacing: 2,
        padding: '4px 10px',
        border: `1px solid ${getColor()}`,
        color: getColor(),
        textTransform: 'uppercase',
        fontFamily: 'var(--mono)'
      }}
    >
      {status}
    </span>
  );
}

export default function ProjectsPage() {
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
            PROJECTS
          </div>
        </Link>

        <button className="link-btn">+ New Project</button>
      </nav>

      {/* Projects Section */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 18px 90px' }}>
        <AnimatedSection>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
            <span style={{ fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', color: 'var(--accent)' }}>
              Production Pipeline — {PROJECTS.length} Active
            </span>
          </div>

          <div style={{ display: 'grid', gap: 24 }}>
            {PROJECTS.map((project, i) => (
              <AnimatedSection key={project.id} delay={i * 0.1}>
                <div
                  style={{
                    padding: 32,
                    background: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 60, 0, 0.3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
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
                          fontSize: '2rem',
                          letterSpacing: 2,
                          marginTop: 6
                        }}
                      >
                        {project.title}
                      </h3>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  <p
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 14,
                      lineHeight: 1.6,
                      opacity: 0.6,
                      marginBottom: 20
                    }}
                  >
                    {project.description}
                  </p>

                  {/* Project Meta */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 16,
                      padding: '16px 0',
                      borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      marginBottom: 16
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, opacity: 0.4, marginBottom: 4 }}>
                        <Calendar size={10} /> Deadline
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                        {new Date(project.deadline).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, opacity: 0.4, marginBottom: 4 }}>
                        <Users size={10} /> Team
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                        {project.team.length} Members
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, opacity: 0.4, marginBottom: 4 }}>
                        <Clock size={10} /> Progress
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                        {project.progress}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: 3, background: '#1a1a1a', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${project.progress}%`,
                        background: 'var(--accent)',
                        transition: 'width 0.5s'
                      }}
                    />
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </AnimatedSection>

        {/* Timeline View */}
        <AnimatedSection delay={0.3}>
          <div style={{ marginTop: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
              <div style={{ width: 32, height: 1, background: 'var(--accent)' }} />
              <span style={{ fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', color: 'var(--accent)' }}>
                Production Timeline
              </span>
            </div>

            <div style={{ position: 'relative', paddingLeft: 40 }}>
              {/* Timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: 'linear-gradient(to bottom, var(--accent), transparent)'
                }}
              />

              {PROJECTS.map((project, i) => (
                <div key={project.id} style={{ position: 'relative', marginBottom: 32 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: -28,
                      top: 6,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      border: '2px solid var(--bg)'
                    }}
                  />
                  <div style={{ fontSize: 9, opacity: 0.4, marginBottom: 4 }}>
                    {new Date(project.deadline).toLocaleDateString()}
                  </div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 16, letterSpacing: 2 }}>
                    {project.title}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                    {project.status} • {project.progress}% Complete
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
