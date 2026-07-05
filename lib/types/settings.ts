import type { ScriptFormat } from '@/lib/scriptos/parser';

// Per-project ecosystem module toggles. Each key gates whether that
// department's nav entry / dept tile is shown for this project — the
// underlying data isn't deleted when a module is off, just hidden from
// navigation (re-enabling brings it right back).
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
  // Overrides lib/projectTypes.ts's project-type-derived default for new
  // scripts created under this project. Reuses ScriptFormat as-is (not a
  // separate "content type" enum) since that's the exact set the parser,
  // formatter, and exporter already branch on — anything wider would be a
  // dropdown option with no real behavior behind it.
  defaultScriptFormat?: ScriptFormat;
  modules: EcosystemModules;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  modules: DEFAULT_ECOSYSTEM_MODULES,
};

export function getProjectModules(settings?: ProjectSettings | null): EcosystemModules {
  return { ...DEFAULT_ECOSYSTEM_MODULES, ...(settings?.modules || {}) };
}

export const SCRIPT_FORMAT_LABELS: Record<ScriptFormat, string> = {
  screenplay: 'Screenplay',
  teleplay: 'Teleplay',
  'stage-play': 'Stage Play',
  treatment: 'Treatment',
  podcast: 'Podcast Script',
  'doc-outline': 'Documentary Outline',
};
