'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Users, Clock, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import AnimatedSection from '@/components/AnimatedSection';
import SectionLabel from '@/components/SectionLabel';
import { supabase } from '@/lib/supabase/client';
import { getUserProjects, createProject as createDBProject } from '@/lib/supabase/projects';

type Status = 'Pre-Production' | 'Production' | 'Post-Production' | 'Complete';

interface Project {
  id: string;
  title: string;
  type: string;
  status: Status;
  progress: number;
  deadline: string;
  team: string[];
  description: string;
  color: string;
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
    description: '133-page political noir screenplay submitted to A24 and Proximity Media.',
    color: '#ff3c00',
  },
  {
    id: '2',
    title: '10 Million',
    type: 'Music Video',
    status: 'Post-Production',
    progress: 95,
    deadline: '2026-05-15',
    team: ['Peter Olowude', 'Editor'],
    description: 'High-energy visual rhythm. Final color grade and mix in progress.',
    color: '#ffaa00',
  },
  {
    id: '3',
    title: 'The Briefcase',
    type: 'Short Film',
    status: 'Complete',
    progress: 100,
    deadline: '2024-12-01',
    team: ['Peter Olowude', 'Cast', 'Crew'],
    description: 'Crime thriller about two couriers and a deal that has to go right.',
    color: '#00cc66',
  },
];

const STATUS_COLORS: Record<Status, string> = {
  'Pre-Production': '#888',
  'Production': '#ff3c00',
  'Post-Production': '#ffaa00',
  'Complete': '#00cc66',
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span style={{
      fontSize: 8,
      letterSpacing: 2,
      padding: '5px 12px',
      border: `1px solid ${STATUS_COLORS[status]}55`,
      color: STATUS_COLORS[status],
      textTransform: 'uppercase',
      fontFamily: 'var(--mono)',
      borderRadius: 'var(--radius-sm)',
      flexShrink: 0,
    }}>
      {status}
    </span>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [hover, setHover] = useState(false);

  return (
    <AnimatedSection delay={index * 0.1}>
      <motion.div
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        style={{
          padding: 32,
          background: 'var(--bg-2)',
          border: `1px solid ${hover ? project.color + '33' : 'var(--border)'}`,
          transition: 'border-color 0.4s, box-shadow 0.4s',
          boxShadow: hover ? `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${project.color}08` : 'none',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ghost number */}
        <div style={{
          position: 'absolute',
          top: -20,
          right: 20,
          fontFamily: 'var(--display)',
          fontSize: '8rem',
          lineHeight: 1,
          color: 'rgba(255,255,255,0.015)',
          letterSpacing: -4,
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', color: project.color, fontFamily: 'var(--mono)', marginBottom: 6 }}>
                {project.type}
              </div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: 2 }}>
                {project.title}
              </h3>
            </div>
            <StatusBadge status={project.status} />
          </div>

          <p style={{ fontFamily: 'var(--serif)', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--fg-muted)', marginBottom: 22 }}>
            {project.description}
          </p>

          {/* Meta row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
            padding: '16px 0',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            marginBottom: 18,
          }}>
            {[
              { Icon: Calendar, label: 'Deadline', value: new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) },
              { Icon: Users, label: 'Team', value: `${project.team.length} Members` },
              { Icon: Clock, label: 'Progress', value: `${project.progress}%` },
            ].map(({ Icon, label, value }) => (
              <div key={label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, color: 'var(--fg-subtle)', marginBottom: 5, fontFamily: 'var(--mono)', letterSpacing: 1 }}>
                  <Icon size={9} /> {label}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ height: 2, background: '#1a1a1a', overflow: 'hidden', borderRadius: 1 }}>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${project.progress}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 + 0.3 }}
              style={{ height: '100%', background: project.color, borderRadius: 1 }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatedSection>
  );
}

export default function ProjectsPage() {
  const [projectsList, setProjectsList] = useState<Project[]>(PROJECTS);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      getUserProjects(user.id).then(async data => {
        if (data && data.length > 0) {
          const fetchedProjects: Project[] = data.map(p => ({
            id: p.id,
            title: p.title,
            type: 'Feature',
            status: p.status === 'completed' ? 'Complete' : p.status === 'in-production' ? 'Production' : p.status === 'post-production' ? 'Post-Production' : 'Pre-Production',
            progress: 0,
            deadline: p.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            team: ['Creator'],
            description: p.description || 'No description provided.',
            color: p.accent_color || '#ff3c00'
          }));
          setProjectsList(fetchedProjects);
        }
      });
    });
  }, []);

  const handleNewProject = async () => {
    if (!user) return alert('Must be signed in to create projects');
    const title = prompt('Project Title:');
    if (!title) return;
    try {
      const p = await createDBProject(user.id, title, 'A new cinematic vision.');
      const newProj: Project = {
        id: p.id, title: p.title, type: 'Feature', status: 'Pre-Production',
        progress: 0, deadline: new Date().toISOString(), team: ['Creator'],
        description: p.description, color: '#ff3c00'
      };
      setProjectsList([newProj, ...projectsList]);
    } catch (e) {
      console.error(e);
    }
  };

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
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: 6 }}>PROJECTS</div>
        </Link>

        <button className="link-btn" onClick={handleNewProject} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={11} /> New Project
        </button>
      </nav>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 20px 80px' }}>

        <AnimatedSection>
          <SectionLabel text={`Production Pipeline — ${projectsList.length} Active`} />
        </AnimatedSection>

        {/* Project cards */}
        <div style={{ display: 'grid', gap: 18, marginBottom: 90 }}>
          {projectsList.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
        </div>

        {/* Timeline */}
        <AnimatedSection delay={0.2}>
          <SectionLabel text="Production Timeline" />
          <div style={{ position: 'relative', paddingLeft: 32 }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute',
              left: 8,
              top: 4,
              bottom: 4,
              width: 1,
              background: 'linear-gradient(to bottom, var(--accent), rgba(255,60,0,0))',
            }} />

            {projectsList.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: 'relative', marginBottom: i < projectsList.length - 1 ? 32 : 0 }}
              >
                {/* Dot */}
                <div style={{
                  position: 'absolute',
                  left: -24,
                  top: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: project.color,
                  border: '2px solid var(--bg)',
                  boxShadow: `0 0 10px ${project.color}55`,
                }} />

                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-subtle)', marginBottom: 4 }}>
                  {new Date(project.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', letterSpacing: 2 }}>
                    {project.title}
                  </div>
                  <ChevronRight size={12} style={{ color: project.color, opacity: 0.6 }} />
                  <StatusBadge status={project.status} />
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-subtle)', marginTop: 4 }}>
                  {project.type} · {project.progress}% Complete
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
