'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { getAllProjects, createProject, updateProject, deleteProject, addTask, toggleTask, deleteTask, type Project } from '@/lib/storage/projects';

const STATUSES = ['concept', 'pre-prod', 'production', 'post', 'released'] as const;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    const loaded = getAllProjects();
    setProjects(loaded);
    if (loaded.length > 0) {
      setSelectedProject(loaded[0]);
    }
  }, []);

  const handleCreateProject = () => {
    if (newProjectTitle.trim()) {
      const newProject = createProject(newProjectTitle);
      setProjects([...projects, newProject]);
      setSelectedProject(newProject);
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

  const handleStatusChange = (projectId: string, newStatus: string) => {
    const updated = updateProject(projectId, { status: newStatus as any });
    setProjects(projects.map((p) => (p.id === projectId ? updated : p)));
    if (selectedProject?.id === projectId) {
      setSelectedProject(updated);
    }
  };

  const handleAddTask = (projectId: string) => {
    if (newTaskTitle.trim()) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        addTask(projectId, newTaskTitle);
        const updated = getAllProjects().find((p) => p.id === projectId);
        if (updated) {
          setProjects(projects.map((p) => (p.id === projectId ? updated : p)));
          if (selectedProject?.id === projectId) {
            setSelectedProject(updated);
          }
          setNewTaskTitle('');
        }
      }
    }
  };

  const handleToggleTask = (projectId: string, taskId: string) => {
    toggleTask(projectId, taskId);
    const updated = getAllProjects().find((p) => p.id === projectId);
    if (updated) {
      setProjects(projects.map((p) => (p.id === projectId ? updated : p)));
      if (selectedProject?.id === projectId) {
        setSelectedProject(updated);
      }
    }
  };

  const handleDeleteTask = (projectId: string, taskId: string) => {
    deleteTask(projectId, taskId);
    const updated = getAllProjects().find((p) => p.id === projectId);
    if (updated) {
      setProjects(projects.map((p) => (p.id === projectId ? updated : p)));
      if (selectedProject?.id === projectId) {
        setSelectedProject(updated);
      }
    }
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
            PROJECTS
          </h1>
        </Link>
      </header>

      {/* Kanban Board */}
      <div style={{ marginTop: 60, width: '100%', padding: 20, display: 'flex', gap: 20, overflowX: 'auto' }}>
        {STATUSES.map((status) => (
          <div
            key={status}
            style={{
              flex: '0 0 300px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              padding: 16,
              borderRadius: 4
            }}
          >
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' }}>
              {status.replace('-', ' ')} ({projects.filter((p) => p.status === status).length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {projects
                .filter((p) => p.status === status)
                .map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    style={{
                      padding: 12,
                      background: project.id === selectedProject?.id ? 'rgba(255, 60, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: project.id === selectedProject?.id ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (project.id !== selectedProject?.id) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (project.id !== selectedProject?.id) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>
                      {project.title}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.5 }}>{project.tasks.length} tasks</div>
                  </div>
                ))}

              {/* Add Project to Status */}
              {status === 'concept' && (
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 12 }}>
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
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Project Detail Panel */}
      {selectedProject && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 60,
            width: 400,
            height: 'calc(100vh - 60px)',
            background: '#0a0a0a',
            borderLeft: '1px solid rgba(255, 255, 255, 0.04)',
            padding: 24,
            overflowY: 'auto',
            zIndex: 50
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 4, opacity: 0.5 }}>PROJECT</h2>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 2 }}>
                {selectedProject.title}
              </h3>
            </div>
            <button
              onClick={() => {
                handleDeleteProject(selectedProject.id);
                setSelectedProject(null);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.5 }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Status Selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 9, opacity: 0.5, letterSpacing: 1 }}>STATUS</label>
            <select
              value={selectedProject.status}
              onChange={(e) => handleStatusChange(selectedProject.id, e.target.value)}
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
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('-', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Tasks */}
          <div>
            <h4 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>
              TASKS ({selectedProject.tasks.length})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {selectedProject.tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    background: task.completed ? 'rgba(0, 255, 0, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer'
                  }}
                >
                  <button
                    onClick={() => handleToggleTask(selectedProject.id, task.id)}
                    style={{
                      background: task.completed ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: task.completed ? 'var(--bg)' : 'var(--fg)',
                      cursor: 'pointer',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {task.completed && <Check size={12} />}
                  </button>
                  <div style={{ flex: 1, fontSize: 11, textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.5 : 1 }}>
                    {task.title}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(selectedProject.id, task.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.3 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Task */}
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task..."
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
              onClick={() => handleAddTask(selectedProject.id)}
              style={{
                width: '100%',
                padding: 8,
                background: 'rgba(255, 60, 0, 0.1)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: 1,
                cursor: 'pointer'
              }}
            >
              + ADD TASK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
