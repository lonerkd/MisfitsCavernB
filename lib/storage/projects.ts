const PROJECTS_KEY = 'misfits_cavern_projects';

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

export function getAllProjects(): Project[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

export function getProject(id: string): Project | null {
  const projects = getAllProjects();
  return projects.find(p => p.id === id) || null;
}

export function createProject(title: string): Project {
  const newProject: Project = {
    id: generateId(),
    title,
    status: 'concept',
    description: '',
    accentColor: '#' + Math.floor(Math.random() * 16777215).toString(16),
    tasks: [],
    notes: [],
    wiki: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const projects = getAllProjects();
  projects.push(newProject);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  return newProject;
}

export function updateProject(id: string, updates: Partial<Project>): Project {
  const projects = getAllProjects();
  const index = projects.findIndex(p => p.id === id);

  if (index === -1) throw new Error('Project not found');

  const updated = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  projects[index] = updated;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  return updated;
}

export function deleteProject(id: string): boolean {
  const projects = getAllProjects();
  const filtered = projects.filter(p => p.id !== id);

  if (filtered.length === projects.length) return false;

  localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
  return true;
}

export function addTask(projectId: string, title: string): Task {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found');

  const task: Task = {
    id: generateId(),
    title,
    completed: false,
    createdAt: new Date().toISOString()
  };

  project.tasks.push(task);
  updateProject(projectId, { tasks: project.tasks });

  return task;
}

export function toggleTask(projectId: string, taskId: string): void {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found');

  const task = project.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    updateProject(projectId, { tasks: project.tasks });
  }
}

export function deleteTask(projectId: string, taskId: string): void {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found');

  project.tasks = project.tasks.filter(t => t.id !== taskId);
  updateProject(projectId, { tasks: project.tasks });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
