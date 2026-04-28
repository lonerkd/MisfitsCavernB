'use client';

import React, { useState, useEffect } from 'react';
import { Play, X, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
  addMedia,
  deleteMedia,
  extractYouTubeId,
  getYouTubeThumbnail,
  type PortfolioProject,
  type MediaItem
} from '@/lib/storage/portfolio';

export default function PortfolioPage() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getAllProjects();
    setProjects(loaded);
    if (loaded.length === 0) {
      // Create default portfolio
      const defaults = [
        createProject('10 Million'),
        createProject('The Briefcase'),
        createProject('The Audio Blueprint')
      ];
      setProjects(defaults);
    } else {
      setSelectedProject(loaded[0]);
    }
  }, []);

  const handleCreateProject = () => {
    if (newProjectTitle.trim()) {
      const project = createProject(newProjectTitle);
      setProjects([...projects, project]);
      setSelectedProject(project);
      setNewProjectTitle('');
    }
  };

  const handleDeleteProject = (id: string) => {
    if (deleteProject(id)) {
      setProjects(projects.filter((p) => p.id !== id));
      if (selectedProject?.id === id) {
        setSelectedProject(projects.find((p) => p.id !== id) || null);
      }
    }
  };

  const handleAddMedia = () => {
    if (selectedProject && newMediaUrl.trim()) {
      const youtubeId = extractYouTubeId(newMediaUrl);

      if (youtubeId) {
        const media = addMedia(selectedProject.id, youtubeId, 'youtube', `YouTube Video`, getYouTubeThumbnail(youtubeId));
        const updated = getAllProjects().find((p) => p.id === selectedProject.id);
        if (updated) {
          setSelectedProject(updated);
          setProjects(projects.map((p) => (p.id === selectedProject.id ? updated : p)));
          setNewMediaUrl('');
        }
      } else {
        alert('Invalid YouTube URL. Use: https://youtube.com/watch?v=VIDEO_ID or just the video ID');
      }
    }
  };

  const handleDeleteMedia = (mediaId: string) => {
    if (selectedProject) {
      deleteMedia(selectedProject.id, mediaId);
      const updated = getAllProjects().find((p) => p.id === selectedProject.id);
      if (updated) {
        setSelectedProject(updated);
        setProjects(projects.map((p) => (p.id === selectedProject.id ? updated : p)));
        setSelectedMedia(null);
      }
    }
  };

  const categories = Array.from(new Set(projects.map((p) => p.category)));
  const filtered = categoryFilter ? projects.filter((p) => p.category === categoryFilter) : projects;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
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
            PORTFOLIO
          </h1>
        </Link>
      </header>

      <div style={{ marginTop: 60, display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Projects List */}
        <div
          style={{
            width: 280,
            background: '#0a0a0a',
            borderRight: '1px solid rgba(255, 255, 255, 0.04)',
            padding: 16,
            overflowY: 'auto'
          }}
        >
          <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>
            PROJECTS
          </h3>

          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="New project..."
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
              onClick={handleCreateProject}
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
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProject(project);
                  setSelectedMedia(null);
                }}
                style={{
                  padding: 12,
                  background: selectedProject?.id === project.id ? 'rgba(255, 60, 0, 0.1)' : 'transparent',
                  border: selectedProject?.id === project.id ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div>{project.title}</div>
                <div style={{ fontSize: 8, opacity: 0.4, marginTop: 2 }}>{project.media.length} media</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        {selectedProject && !selectedMedia && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Project Header */}
            <div
              style={{
                height: 80,
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: 2, margin: 0 }}>
                  {selectedProject.title}
                </h2>
                <p style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
                  {selectedProject.year} · {selectedProject.role}
                </p>
              </div>
              <button
                onClick={() => handleDeleteProject(selectedProject.id)}
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

            {/* Media Grid */}
            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
                {selectedProject.media.map((media) => (
                  <div
                    key={media.id}
                    onClick={() => setSelectedMedia(media)}
                    style={{
                      aspectRatio: '16/9',
                      background: '#1a1a1a',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    {media.thumbnailUrl && (
                      <img
                        src={media.thumbnailUrl}
                        alt={media.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Play size={32} fill="rgba(255, 255, 255, 0.7)" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMedia(media.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        color: 'var(--fg)',
                        cursor: 'pointer',
                        padding: 4,
                        zIndex: 10
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Media */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: 20 }}>
                <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>
                  ADD YOUTUBE VIDEO
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    placeholder="YouTube URL or video ID..."
                    style={{
                      flex: 1,
                      padding: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--fg)',
                      fontFamily: 'var(--mono)',
                      fontSize: 11
                    }}
                  />
                  <button
                    onClick={handleAddMedia}
                    style={{
                      padding: '10px 20px',
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
          </div>
        )}

        {/* Video Player Modal */}
        {selectedMedia && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.94)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9000
            }}
            onClick={() => setSelectedMedia(null)}
          >
            <div style={{ width: '100%', maxWidth: 960, margin: '0 16px' }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelectedMedia(null)}
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  padding: 8,
                  zIndex: 10
                }}
              >
                <X size={26} />
              </button>

              {selectedMedia.type === 'youtube' && (
                <div style={{ aspectRatio: '16/9', background: '#000' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedMedia.url}?autoplay=1`}
                    width="100%"
                    height="100%"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: 'none' }}
                  />
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: 2 }}>
                  {selectedMedia.title}
                </h3>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
