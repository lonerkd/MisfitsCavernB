// localStorage utilities for ScriptOS - Local-First Architecture

import type { ScreenplayDocument } from '@/types/screenplay';

const STORAGE_KEY = 'misfits_cavern_scripts';
const CURRENT_SCRIPT_KEY = 'misfits_cavern_current_script';

export interface StoredScript {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Get all scripts
export function getAllScripts(): StoredScript[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading scripts:', error);
    return [];
  }
}

// Get script by ID
export function getScript(id: string): StoredScript | null {
  const scripts = getAllScripts();
  return scripts.find(s => s.id === id) || null;
}

// Save script
export function saveScript(script: Omit<StoredScript, 'createdAt' | 'updatedAt'>): StoredScript {
  const scripts = getAllScripts();
  const existingIndex = scripts.findIndex(s => s.id === script.id);
  
  const now = new Date().toISOString();
  const savedScript: StoredScript = {
    ...script,
    createdAt: existingIndex >= 0 ? scripts[existingIndex].createdAt : now,
    updatedAt: now
  };
  
  if (existingIndex >= 0) {
    scripts[existingIndex] = savedScript;
  } else {
    scripts.push(savedScript);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
  return savedScript;
}

// Delete script
export function deleteScript(id: string): boolean {
  const scripts = getAllScripts();
  const filtered = scripts.filter(s => s.id !== id);
  
  if (filtered.length === scripts.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// Create new script
export function createNewScript(title: string = 'Untitled'): StoredScript {
  const newScript: StoredScript = {
    id: generateId(),
    title,
    content: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const scripts = getAllScripts();
  scripts.push(newScript);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
  
  return newScript;
}

// Get current script ID
export function getCurrentScriptId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_SCRIPT_KEY);
}

// Set current script ID
export function setCurrentScriptId(id: string): void {
  localStorage.setItem(CURRENT_SCRIPT_KEY, id);
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}



// Import script from text
export function importScriptFromText(text: string, title: string): StoredScript {
  return saveScript({
    id: generateId(),
    title,
    content: text
  });
}
