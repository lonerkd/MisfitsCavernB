'use client';

import { supabase } from '@/lib/supabase/client';
import {
  getUserProjects,
  getProject as sbGetProject,
  createProject as sbCreateProject,
  updateProject as sbUpdateProject,
  deleteProject as sbDeleteProject,
  getProjectTasks,
  addTask as sbAddTask,
  toggleTask as sbToggleTask,
  deleteTask as sbDeleteTask,
  getProjectNotes,
  addNote as sbAddNote,
  deleteNote as sbDeleteNote,
} from '@/lib/supabase/projects-storage';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  content: string;
  type: 'text' | 'list' | 'code';
}

export interface Project {
  id: string;
  title: string;
  status: 'concept' | 'pre-prod' | 'production' | 'post' | 'released';
  description: string;
  accentColor: string;
  tasks: Task[];
  notes: ProjectNote[];
  wiki: string;
  createdAt: string;
  updatedAt: string;
}

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function getAllProjects(): Promise<Project[]> {
  try {
    const userId = await getCurrentUserId();
    const sbProjects = await getUserProjects(userId);

    return Promise.all(
      sbProjects.map(async (sbProj) => {
        const tasks = await getProjectTasks(sbProj.id);
        const notes = await getProjectNotes(sbProj.id);

        return {
          id: sbProj.id,
          title: sbProj.title,
          status: sbProj.status,
          description: sbProj.description,
          accentColor: sbProj.accent_color,
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            createdAt: t.created_at,
          })),
          notes: notes.map((n) => ({
            id: n.id,
            content: n.content,
            type: n.type,
          })),
          wiki: sbProj.wiki,
          createdAt: sbProj.created_at,
          updatedAt: sbProj.updated_at,
        };
      })
    );
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const sbProj = await sbGetProject(id);
    if (!sbProj) return null;

    const tasks = await getProjectTasks(id);
    const notes = await getProjectNotes(id);

    return {
      id: sbProj.id,
      title: sbProj.title,
      status: sbProj.status,
      description: sbProj.description,
      accentColor: sbProj.accent_color,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        createdAt: t.created_at,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        type: n.type,
      })),
      wiki: sbProj.wiki,
      createdAt: sbProj.created_at,
      updatedAt: sbProj.updated_at,
    };
  } catch (error) {
    console.error('Error loading project:', error);
    return null;
  }
}

export async function createProject(title: string): Promise<Project> {
  try {
    const userId = await getCurrentUserId();
    const sbProj = await sbCreateProject(userId, title);

    return {
      id: sbProj.id,
      title: sbProj.title,
      status: sbProj.status,
      description: sbProj.description,
      accentColor: sbProj.accent_color,
      tasks: [],
      notes: [],
      wiki: sbProj.wiki,
      createdAt: sbProj.created_at,
      updatedAt: sbProj.updated_at,
    };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  try {
    const sbUpdates: any = {};
    if (updates.title) sbUpdates.title = updates.title;
    if (updates.status) sbUpdates.status = updates.status;
    if (updates.description) sbUpdates.description = updates.description;
    if (updates.accentColor) sbUpdates.accent_color = updates.accentColor;
    if (updates.wiki) sbUpdates.wiki = updates.wiki;

    const sbProj = await sbUpdateProject(id, sbUpdates);

    const tasks = await getProjectTasks(id);
    const notes = await getProjectNotes(id);

    return {
      id: sbProj.id,
      title: sbProj.title,
      status: sbProj.status,
      description: sbProj.description,
      accentColor: sbProj.accent_color,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        createdAt: t.created_at,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        type: n.type,
      })),
      wiki: sbProj.wiki,
      createdAt: sbProj.created_at,
      updatedAt: sbProj.updated_at,
    };
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    return await sbDeleteProject(id);
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

export async function addTask(projectId: string, title: string): Promise<Task> {
  try {
    const task = await sbAddTask(projectId, title);
    return {
      id: task.id,
      title: task.title,
      completed: task.completed,
      createdAt: task.created_at,
    };
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
}

export async function toggleTask(projectId: string, taskId: string): Promise<void> {
  try {
    const project = await getProject(projectId);
    if (!project) throw new Error('Project not found');

    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    await sbToggleTask(taskId, !task.completed);
  } catch (error) {
    console.error('Error toggling task:', error);
    throw error;
  }
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  try {
    await sbDeleteTask(taskId);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}
