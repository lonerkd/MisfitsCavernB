import { SCRIPT_FORMAT_REGISTRY, SCRIPT_FORMATS, type ScriptFormat } from '@/lib/formats/script-formats';

export interface EcosystemModules {
  scriptos: boolean;
  studio: boolean;
  lounge: boolean;
  portfolio: boolean;
  distribution: boolean;
}

export const DEFAULT_ECOSYSTEM_MODULES: EcosystemModules = {
  scriptos: true,
  studio: true,
  lounge: true,
  portfolio: true,
  distribution: true,
};

export interface ProjectSettings {

  defaultScriptFormat?: ScriptFormat;
  modules: EcosystemModules;
  /** Open every tool now instead of phase by phase (lib/os/progress). */
  unlockAllTools?: boolean;
  /** How many pages the crew shoots in a day, in eighths (stripboard, auto-schedule). */
  dayLengthEighths?: number;
  /** Per-shoot-day meal plans (catering). */
  catering?: Record<string, { headcount: number; mealTime: string; dietary: string; vendor: string; notes: string; status: 'planned' | 'ordered' | 'delivered' }>;
  /** Safety and risk items. */
  safety?: Array<{ id: string; hazard: string; location: string; severity: 'low' | 'medium' | 'high'; mitigation: string; owner: string; status: 'identified' | 'mitigated' | 'resolved' }>;
  /** Crew communication log. */
  comms?: Array<{ id: string; date: string; to: string; channel: 'call' | 'email' | 'text' | 'in-person'; subject: string; notes: string; status: 'sent' | 'replied' | 'pending' }>;
  /** Equipment / gear inventory. */
  gear?: Array<{ id: string; item: string; category: string; owner: string; status: 'needed' | 'packed' | 'on-set' | 'returned' }>;
  /** Daily wrap reports. */
  wraps?: Array<{ id: string; date: string; dayNumber: number; shotsGot: number; pages: string; incidents: string; notes: string }>;
  /** Rehearsal schedule. */
  rehearsals?: Array<{ id: string; date: string; time: string; location: string; participants: string; scenes: string; notes: string }>;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  modules: DEFAULT_ECOSYSTEM_MODULES,
};

export function getProjectModules(settings?: ProjectSettings | null): EcosystemModules {
  return { ...DEFAULT_ECOSYSTEM_MODULES, ...(settings?.modules || {}) };
}

export const SCRIPT_FORMAT_LABELS = Object.fromEntries(
  SCRIPT_FORMATS.map((f) => [f, SCRIPT_FORMAT_REGISTRY[f].label]),
) as Record<ScriptFormat, string>;
