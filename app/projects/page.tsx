'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

const STATUSES = [
  { key: 'concept', label: 'CONCEPT' },
  { key: 'pre-production', label: 'PRE-PROD' },
  { key: 'in-production', label: 'PRODUCTION' },
  { key: 'post-production', label: 'POST' },
  { key: 'completed', label: 'COMPLETED' },
] as const;

type StatusKey = (typeof STATUSES)[number]['key'];

interface Task { id: string; title: string; completed: boolean; }
interface Project { id: string; title: string; status: StatusKey; project_tasks: Task[]; }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTask, setNewTask] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) load(user.id);
    });
  }, []);

  const load = async (uid: string) => {
    const { data } = await supabase
      .from('projects')
      .select('*, project_tasks(*)')
      .eq('creator_id', uid)
      .order('created_at', { ascending: false });
    if (data) {
      setProjects(data as Project[]);
      if (data.length > 0) setSelected(data[0] as Project);
    }
  };

  const createProject = async () => {
    if (!user || !newTitle.trim()) return;
    const { data } = await supabase
      .from('projects')
      .insert({ title: newTitle, creator_id: user.id, status: 'concept' })
      .select('*, project_tasks(*)')
      .single();
    if (data) {
      setProjects([data as Project, ...projects]);
      setSelected(data as Project);
      setNewTitle('');
    }
  };

  const deleteProject = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    const rest = projects.filter(p => p.id !== id);
    setProjects(rest);
    setSelected(selected?.id === id ? rest[0] || null : selected);
  };

  const updateStatus = async (id: string, status: StatusKey) => {
    await supabase.from('projects').update({ status }).eq('id', id);
    const update = (p: Project) => p.id === id ? { ...p, status } : p;
    setProjects(projects.map(update));
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const addTask = async (projectId: string) => {
    if (!newTask.trim()) return;
    const { data } = await supabase
      .from('project_tasks')
      .insert({ project_id: projectId, title: newTask, completed: false })
      .select().single();
    if (data) {
      const update = (p: Project) => p.id === projectId ? { ...p, project_tasks: [...p.project_tasks, data] } : p;
      setProjects(projects.map(update));
      if (selected?.id === projectId) setSelected({ ...selected, project_tasks: [...selected.project_tasks, data] });
      setNewTask('');
    }
  };

  const toggleTask = async (projectId: string, taskId: string, completed: boolean) => {
    await supabase.from('project_tasks').update({ completed: !completed }).eq('id', taskId);
    const update = (p: Project) => p.id === projectId
      ? { ...p, project_tasks: p.project_tasks.map(t => t.id === taskId ? { ...t, completed: !completed } : t) }
      : p;
    setProjects(projects.map(update));
    if (selected?.id === projectId) setSelected({ ...selected, project_tasks: selected.project_tasks.map(t => t.id === taskId ? { ...t, completed: !completed } : t) });
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    await supabase.from('project_tasks').delete().eq('id', taskId);
    const update = (p: Project) => p.id === projectId
      ? { ...p, project_tasks: p.project_tasks.filter(t => t.id !== taskId) }
      : p;
    setProjects(projects.map(update));
    if (selected?.id === projectId) setSelected({ ...selected, project_tasks: selected.project_tasks.filter(t => t.id !== taskId) });
  };

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5, marginBottom: 16 }}>Sign in to manage projects.</p>
        <Link href="/auth" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}>Sign in →</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 60, background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 24px', display: 'flex', alignItems: 'center', zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>PROJECTS</h1>
        </Link>
      </header>

      <div style={{ marginTop: 60, padding: 20, display: 'flex', gap: 20, overflowX: 'auto', paddingRight: selected ? 440 : 20 }}>
        {STATUSES.map(({ key, label }) => (
          <div key={key} style={{ flex: '0 0 280px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: 16, borderRadius: 4 }}>
            <h3 style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, marginBottom: 16, opacity: 0.5 }}>
              {label} · {projects.filter(p => p.status === key).length}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projects.filter(p => p.status === key).map(project => {
                const total = project.project_tasks.length;
                const done = project.project_tasks.filter(t => t.completed).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={project.id} onClick={() => setSelected(project)}
                    style={{ padding: 12, background: selected?.id === project.id ? 'rgba(255,60,0,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selected?.id === project.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (selected?.id !== project.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                    onMouseLeave={e => { if (selected?.id !== project.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 8 }}>{project.title}</div>
                    {total > 0 && (
                      <>
                        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 6, borderRadius: 1, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#00ff00' : 'var(--accent)', transition: 'width 0.3s', borderRadius: 1 }} />
                        </div>
                        <div style={{ fontSize: 8, opacity: 0.4, fontFamily: 'var(--mono)' }}>{done}/{total} tasks · {pct}%</div>
                      </>
                    )}
                    {total === 0 && <div style={{ fontSize: 9, opacity: 0.3, fontFamily: 'var(--mono)' }}>No tasks yet</div>}
                  </div>
                );
              })}
              {key === 'concept' && (
                <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createProject()}
                    placeholder="New project..." style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 8 }} />
                  <button onClick={createProject} style={{ width: '100%', padding: 8, background: 'var(--accent)', color: 'var(--bg)', border: 'none', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>+ CREATE</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ position: 'fixed', right: 0, top: 60, width: 400, height: 'calc(100vh - 60px)', background: '#0a0a0a', borderLeft: '1px solid rgba(255,255,255,0.04)', padding: 24, overflowY: 'auto', zIndex: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 2, margin: 0 }}>{selected.title}</h3>
            <button onClick={() => { deleteProject(selected.id); setSelected(null); }} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.4 }}>
              <Trash2 size={16} />
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 9, opacity: 0.5, letterSpacing: 1, fontFamily: 'var(--mono)' }}>STATUS</label>
            <select value={selected.status} onChange={e => updateStatus(selected.id, e.target.value as StatusKey)}
              style={{ width: '100%', padding: 8, marginTop: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>
              {STATUSES.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>

          <div>
            <h4 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 12, opacity: 0.5 }}>TASKS · {selected.project_tasks.length}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {selected.project_tasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: task.completed ? 'rgba(0,255,0,0.04)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button onClick={() => toggleTask(selected.id, task.id, task.completed)}
                    style={{ background: task.completed ? 'var(--accent)' : 'rgba(255,255,255,0.1)', border: 'none', color: task.completed ? 'var(--bg)' : 'var(--fg)', cursor: 'pointer', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {task.completed && <Check size={12} />}
                  </button>
                  <span style={{ flex: 1, fontSize: 11, textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.4 : 1 }}>{task.title}</span>
                  <button onClick={() => deleteTask(selected.id, task.id)} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', opacity: 0.3 }}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask(selected.id)}
              placeholder="New task..." style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, marginBottom: 8 }} />
            <button onClick={() => addTask(selected.id)} style={{ width: '100%', padding: 8, background: 'rgba(255,60,0,0.1)', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer' }}>+ ADD TASK</button>
          </div>
        </div>
      )}
    </div>
  );
}
